import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type Comment = {
  id: string;
  content: string;
  created_at?: string;
  user: {
    id: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
};

export default function CommentsPanel({
  postId,
  onCommentAdded,
}: {
  postId: string;
  onCommentAdded?: () => void;
}) {
  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const fetchComments = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Failed to fetch comments (${res.status})`);
      }
      const json = await res.json();
      setItems(json.items ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Error loading comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line
  }, [postId]);

  const postComment = async () => {
    if (!token || !text.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: text.trim() }),
      });

      if (!res.ok) throw new Error("Failed to post comment");

      const created = await res.json();

      setItems((prev) => [created, ...prev]);
      setText("");

      onCommentAdded?.(); // ✅ notify parent
    } catch (err) {
      alert("Could not post comment");
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString();
  };

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          placeholder="Write a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 input-plain"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              postComment();
            }
          }}
          aria-label="Write a comment"
        />
        <button
          onClick={postComment}
          className={`btn-primary ml-2 ${
            posting ? "opacity-60 pointer-events-none" : ""
          }`}
          aria-disabled={posting}
        >
          {posting ? "Sending…" : "Send"}
        </button>
      </div>

      {loading && (
        <div className="text-sm text-slate-500">Loading comments...</div>
      )}
      {error && <div className="text-sm text-rose-700">{error}</div>}

      <div className="space-y-3">
        {items.map((c) => (
          <div
            key={c.id}
            className="p-3 rounded-lg bg-white border border-slate-100 shadow-sm"
          >
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-slate-500">
                <strong className="text-sm text-slate-800">
                  {c.user.first_name || c.user.username || "User"}
                </strong>
                <span className="ml-2 text-[12px] text-slate-400">
                  {formatDate(c.created_at)}
                </span>
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
              {c.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
