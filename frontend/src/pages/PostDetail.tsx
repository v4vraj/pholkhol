import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import VoteButtons from "../components/VoteButtons";
import CommentsPanel from "../components/CommentsPanel";
import StatusBar from "../components/StatusBar";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type UserSummary = {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type Post = {
  id: string;
  description?: string;
  image_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  created_at?: string;
  severity_score?: number | null;
  authenticity_score?: number | null;
  composite_score?: number | null;
  status?: "PENDING" | "ANALYSED" | "WORKING" | "COMPLETE";
  user?: UserSummary | null;
  upvotes?: number;
  downvotes?: number;
  user_vote?: number;
  comments_count?: number;
};

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("token") : null;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    const loadPost = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/posts/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || "Failed to load post");
        }

        const json = await res.json();
        setPost(json);
      } catch (err: any) {
        setError(err?.message ?? "Could not load post");
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id, token, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center text-rose-600">
        {error ?? "Post not found"}
      </div>
    );
  }

  const author = post.user?.first_name || post.user?.username || "Unknown user";

  return (
    <div className="min-h-screen bg-[var(--page)] p-4 pb-20">
      {/* Header */}
      <header className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          ← Back
        </button>
        <h1 className="text-lg font-semibold text-slate-800">Post</h1>
      </header>

      {/* Post card */}
      <article className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        {/* Author */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 font-semibold">
            {author.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-800">{author}</div>
            <div className="text-xs text-slate-400">
              {post.created_at
                ? new Date(post.created_at).toLocaleString()
                : ""}
            </div>
          </div>
        </div>

        {/* Image */}
        {post.image_url && (
          <div className="mt-3 rounded-xl overflow-hidden bg-slate-100">
            <img
              src={post.image_url}
              alt="Post"
              className="w-full max-h-[420px] object-cover"
            />
          </div>
        )}

        {/* Content */}
        <p className="mt-4 text-base text-slate-800 leading-relaxed">
          {post.description}
        </p>

        {/* Metadata */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="px-2 py-1 rounded-full bg-slate-100">
            Severity: {post.severity_score ?? "—"}
          </span>
          <span className="px-2 py-1 rounded-full bg-slate-100">
            Authenticity: {post.authenticity_score ?? "—"}
          </span>
          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700">
            Score: {post.composite_score ?? "—"}
          </span>
        </div>

        {/* Status */}
        {post.status && (
          <div className="mt-4">
            <div className="text-xs text-slate-500 mb-1">Issue status</div>
            <StatusBar status={post.status} />
          </div>
        )}

        {/* Location */}
        {post.lat && post.lng && (
          <div className="mt-3 text-xs text-slate-500">
            📍 {post.lat.toFixed(2)}, {post.lng.toFixed(2)}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between">
          <VoteButtons
            postId={post.id}
            upvotes={post.upvotes ?? 0}
            downvotes={post.downvotes ?? 0}
            userVote={post.user_vote ?? 0}
            onChange={({ upvotes, downvotes, user_vote }) => {
              setPost((p) => (p ? { ...p, upvotes, downvotes, user_vote } : p));
            }}
          />
          <div className="text-sm text-slate-500">
            💬 {post.comments_count ?? 0}
          </div>
        </div>
      </article>

      {/* Comments */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Comments</h2>
        <CommentsPanel
          postId={post.id}
          onCommentAdded={() => {
            setPost((p) =>
              p ? { ...p, comments_count: (p.comments_count ?? 0) + 1 } : p
            );
          }}
        />
      </section>
    </div>
  );
}
