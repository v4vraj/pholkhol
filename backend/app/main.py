from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status,BackgroundTasks,Query ,Path, Body
from fastapi.middleware.cors import CORSMiddleware
import uuid
import boto3
from boto3.session import Config as BotoConfig
from botocore.exceptions import ClientError
from sqlalchemy import text
from .auth import router as auth_router, get_current_user
from .db import engine
from pydantic import BaseModel
from typing import Optional, List, Any
from .kestra_client import trigger_kestra


app = FastAPI()
app.include_router(auth_router)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            
    allow_credentials=True,        
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],      
)
# MinIO / S3 client
s3 = boto3.client(
    "s3",
    endpoint_url="http://localhost:9000",
    aws_access_key_id="minio",
    aws_secret_access_key="minio123",
    config=BotoConfig(signature_version="s3v4"),
)

BUCKET = "citysense"

# create bucket if it doesn't exist
try:
    existing = [b["Name"] for b in s3.list_buckets().get("Buckets", [])]
    if BUCKET not in existing:
        s3.create_bucket(Bucket=BUCKET)
except Exception as e:
    print("Warning: could not ensure bucket exists:", e)


class UploadRequest(BaseModel):
    filename: str
    content_type: Optional[str] = "image/jpeg"

class UploadResponse(BaseModel):
    url: str
    fields: dict
    object_url: str

class PostCreate(BaseModel):
    description: str
    lat: float
    lng: float
    image_url: str


@app.post("/api/post_file")
async def create_post_file(
    background_tasks: BackgroundTasks,
    description: str = Form(""),
    lat: float = Form(...),
    lng: float = Form(...),
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Backwards-compatible endpoint: client uploads file to server (not recommended for prod).
    """
    if image.content_type.split("/")[0] != "image":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file must be an image")

    post_id = str(uuid.uuid4())
    ext = image.filename.split(".")[-1] if "." in image.filename else "jpg"
    object_key = f"{post_id}.{ext}"

    try:
        image.file.seek(0)
        s3.upload_fileobj(image.file, BUCKET, object_key, ExtraArgs={"ContentType": image.content_type})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading image: {e}")

    object_url = f"{s3.meta.endpoint_url}/{BUCKET}/{object_key}"

    try:
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO posts(id, user_id, description, category, image_url, lat, lng, status, created_at)
                VALUES(:id, :user_id, :description, :category, :image_url, :lat, :lng, 'PENDING', now())
            """), {
                "id": post_id,
                "user_id": current_user["id"],
                "description": description,
                "category": None,
                "image_url": object_url,
                "lat": lat,
                "lng": lng
            })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    background_tasks.add_task(trigger_kestra, post_id, object_url)


    return {"post_id": post_id, "image_url": object_url, "status": "PENDING"}

@app.post("/api/upload-url", response_model=UploadResponse)
def create_upload_url(req: UploadRequest, current_user: dict = Depends(get_current_user)):
    """
    Returns a presigned POST (url + fields) for direct client -> MinIO upload.
    Client should POST a multipart/form-data with the returned fields plus the file.
    """
    # derive extension and stable object key
    ext = req.filename.split(".")[-1] if "." in req.filename else "jpg"
    object_key = f"{uuid.uuid4()}.{ext}"

    try:
        presigned = s3.generate_presigned_post(
            Bucket=BUCKET,
            Key=object_key,
            Fields={"Content-Type": req.content_type},
            Conditions=[
                {"Content-Type": req.content_type},
                ["content-length-range", 1, 10 * 1024 * 1024]  # allow up to 10 MB (adjust as needed)
            ],
            ExpiresIn=900  # seconds (15 minutes)
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create upload url: {e}")

    object_url = f"{s3.meta.endpoint_url}/{BUCKET}/{object_key}"
    return UploadResponse(url=presigned["url"], fields=presigned["fields"], object_url=object_url)

@app.post("/api/post")
def create_post(payload: PostCreate, current_user: dict = Depends(get_current_user)):
    """
    Client calls this AFTER they have uploaded the file directly to MinIO
    using the presigned POST /api/upload-url. This endpoint simply registers the post.
    """
    # basic validation - ensure image_url belongs to our BUCKET domain (optional)
    if not payload.image_url.startswith(str(s3.meta.endpoint_url)) and BUCKET not in payload.image_url:
        # allow it but warn — you may want to enforce only MinIO objects
        print("[warning] image_url does not appear to be the local MinIO URL")

    post_id = str(uuid.uuid4())
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO posts(id, user_id, description, category, image_url, lat, lng, status, created_at)
                VALUES(:id, :user_id, :description, :category, :image_url, :lat, :lng, 'PENDING', now())
            """), {
                "id": post_id,
                "user_id": current_user["id"],
                "description": payload.description,
                "category": None,
                "image_url": payload.image_url,
                "lat": payload.lat,
                "lng": payload.lng
            })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    return {"post_id": post_id, "image_url": payload.image_url, "status": "PENDING"}

@app.get("/api/posts")
def list_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    offset = (page - 1) * limit

    try:
        with engine.begin() as conn:
            total_row = conn.execute(text("SELECT COUNT(1) FROM posts")).fetchone()
            total = total_row[0] if total_row is not None else 0

            rows = conn.execute(text("""
                SELECT
                  p.id,
                  p.description,
                  p.image_url,
                  p.lat,
                  p.lng,
                  p.severity_score,
                  p.authenticity_score,
                  p.composite_score,
                  p.created_at,
                  u.id AS user_id,
                  u.username AS user_username,
                  u.first_name AS user_first_name,
                  u.last_name AS user_last_name,
                  COALESCE(vs.upvotes,0) AS upvotes,
                  COALESCE(vs.downvotes,0) AS downvotes,
                  COALESCE(vc.user_vote,0) AS user_vote,
                  COALESCE(cc.comments_count,0) AS comments_count
                FROM posts p
                LEFT JOIN users u ON p.user_id = u.id
                LEFT JOIN (
                  SELECT post_id,
                    SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END) AS upvotes,
                    SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END) AS downvotes
                  FROM votes
                  GROUP BY post_id
                ) vs ON vs.post_id = p.id
                LEFT JOIN (
                  SELECT post_id, COUNT(1) AS comments_count
                  FROM comments
                  GROUP BY post_id
                ) cc ON cc.post_id = p.id
                LEFT JOIN (
                  SELECT post_id, vote AS user_vote
                  FROM votes
                  WHERE user_id = :uid
                ) vc ON vc.post_id = p.id
                ORDER BY p.created_at DESC
                LIMIT :limit OFFSET :offset
            """), {"limit": limit, "offset": offset, "uid": current_user["id"]}).fetchall()

            items = []
            for r in rows:
                items.append({
                    "id": str(r.id),
                    "description": r.description,
                    "image_url": r.image_url,
                    "lat": float(r.lat) if r.lat is not None else None,
                    "lng": float(r.lng) if r.lng is not None else None,
                    "severity_score": float(r.severity_score) if r.severity_score is not None else None,
                    "authenticity_score": float(r.authenticity_score) if r.authenticity_score is not None else None,
                    "composite_score": float(r.composite_score) if r.composite_score is not None else None,
                    "created_at": r.created_at.isoformat() if r.created_at is not None else None,
                    "user": {
                        "id": str(r.user_id) if r.user_id is not None else None,
                        "username": r.user_username,
                        "first_name": r.user_first_name,
                        "last_name": r.user_last_name,
                    },
                    "upvotes": int(r.upvotes),
                    "downvotes": int(r.downvotes),
                    "user_vote": int(r.user_vote or 0),
                    "comments_count": int(r.comments_count)
                })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    return {"items": items, "total": total, "page": page, "limit": limit}


@app.post("/api/posts/{post_id}/vote")
def vote_post(
    post_id: str = Path(...),
    payload: dict = Body(...),  # {"vote": 1} or {"vote": -1} or {"vote": 0} to remove
    current_user: dict = Depends(get_current_user),
):
    """
    Cast or remove a vote.
    Send payload: {"vote": 1} for upvote, {"vote": -1} for downvote, {"vote": 0} to remove vote.
    Returns updated counts: {"upvotes": n, "downvotes": m, "user_vote": 1|-1|0}
    """
    v = int(payload.get("vote", 0))
    if v not in (1, -1, 0):
        raise HTTPException(status_code=400, detail="Invalid vote value")

    try:
        with engine.begin() as conn:
            # check post exists
            exists = conn.execute(text("SELECT 1 FROM posts WHERE id = :id"), {"id": post_id}).fetchone()
            if not exists:
                raise HTTPException(status_code=404, detail="Post not found")

            if v == 0:
                # delete existing vote (if any)
                conn.execute(text("DELETE FROM votes WHERE post_id = :p AND user_id = :u"), {"p": post_id, "u": current_user["id"]})
            else:
                # upsert vote: try update, otherwise insert
                updated = conn.execute(text("""
                    UPDATE votes SET vote = :v, created_at = now()
                    WHERE post_id = :p AND user_id = :u
                """), {"v": v, "p": post_id, "u": current_user["id"]})
                if updated.rowcount == 0:
                    conn.execute(text("""
                        INSERT INTO votes (post_id, user_id, vote)
                        VALUES (:p, :u, :v)
                    """), {"p": post_id, "u": current_user["id"], "v": v})

            # compute counts
            row = conn.execute(text("""
                SELECT
                  COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END),0) AS upvotes,
                  COALESCE(SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END),0) AS downvotes,
                  (SELECT COALESCE(vote,0) FROM votes v WHERE v.post_id = :p AND v.user_id = :u) AS user_vote
                FROM votes
                WHERE post_id = :p
            """), {"p": post_id, "u": current_user["id"]}).fetchone()

            upvotes = int(row.upvotes or 0)
            downvotes = int(row.downvotes or 0)
            user_vote = int(row.user_vote or 0)
            # Optional: update posts.composite_score or other metrics here if desired.

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    return {"upvotes": upvotes, "downvotes": downvotes, "user_vote": user_vote}

@app.get("/api/posts/{post_id}/comments")
def list_comments(post_id: str, page: int = 1, limit: int = 50, current_user: dict = Depends(get_current_user)):
    offset = (page - 1) * limit
    try:
        with engine.begin() as conn:
            rows = conn.execute(text("""
                SELECT c.id, c.content, c.created_at,
                       u.id AS user_id, u.username, u.first_name, u.last_name
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.post_id = :p
                ORDER BY c.created_at DESC
                LIMIT :limit OFFSET :offset
            """), {"p": post_id, "limit": limit, "offset": offset}).fetchall()

            items = []
            for r in rows:
                items.append({
                    "id": str(r.id),
                    "content": r.content,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "user": {
                        "id": str(r.user_id),
                        "username": r.username,
                        "first_name": r.first_name,
                        "last_name": r.last_name,
                    }
                })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    return {"items": items, "page": page, "limit": limit}

class CommentCreate(BaseModel):
    content: str

@app.post("/api/posts/{post_id}/comments")
def create_comment(
    post_id: str,
    payload: CommentCreate,
    current_user: dict = Depends(get_current_user),
):
    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    comment_id = str(uuid.uuid4())
    try:
        with engine.begin() as conn:
            # ensure post exists
            exists = conn.execute(text("SELECT 1 FROM posts WHERE id = :id"), {"id": post_id}).fetchone()
            if not exists:
                raise HTTPException(status_code=404, detail="Post not found")

            conn.execute(text("""
                INSERT INTO comments (id, post_id, user_id, content, created_at)
                VALUES (:id, :p, :u, :content, now())
            """), {"id": comment_id, "p": post_id, "u": current_user["id"], "content": payload.content})

            # optionally return the created comment with user info
            r = conn.execute(text("""
                SELECT c.id, c.content, c.created_at, u.id AS user_id, u.username, u.first_name, u.last_name
                FROM comments c JOIN users u ON c.user_id = u.id
                WHERE c.id = :cid
            """), {"cid": comment_id}).fetchone()

            created = {
                "id": str(r.id),
                "content": r.content,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "user": {
                    "id": str(r.user_id),
                    "username": r.username,
                    "first_name": r.first_name,
                    "last_name": r.last_name,
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    return created