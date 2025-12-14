import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import VoteButtons from "../components/VoteButtons";

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
  user?: UserSummary | null;
  upvotes?: number;
  downvotes?: number;
  user_vote?: number;
  comments_count?: number;
};

/* ---------------- Severity helpers ---------------- */

const severityMeta = (score?: number | null) => {
  if (score == null)
    return { label: "Unrated", cls: "bg-slate-100 text-slate-600" };
  if (score >= 9) return { label: "Critical", cls: "bg-red-600 text-white" };
  if (score >= 8) return { label: "High", cls: "bg-red-100 text-red-700" };
  if (score >= 5)
    return { label: "Medium", cls: "bg-amber-100 text-amber-700" };
  return { label: "Low", cls: "bg-green-100 text-green-700" };
};

export default function Feed() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");

  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [severityFilter, setSeverityFilter] = useState<
    "all" | "high" | "medium" | "low"
  >("all");
  const [sortBy, setSortBy] = useState<"latest" | "severity" | "trending">(
    "latest"
  );

  const observerRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

  /* ---------------- Auth guard ---------------- */

  useEffect(() => {
    if (!token) navigate("/", { replace: true });
  }, [token, navigate]);

  /* ---------------- Fetch posts ---------------- */

  const fetchPosts = useCallback(
    async (pageToLoad: number) => {
      if (!token) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE}/api/posts?page=${pageToLoad}&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) throw new Error(await res.text());

        const json = await res.json();
        const items: Post[] = json.items ?? [];

        setPosts((prev) => (pageToLoad === 1 ? items : [...prev, ...items]));
        setHasMore(items.length === limit);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load feed");
      } finally {
        setLoading(false);
      }
    },
    [API_BASE, limit, token]
  );

  useEffect(() => {
    setPage(1);
    fetchPosts(1);
  }, [fetchPosts]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchPosts(page);
  }, [page, fetchPosts]);

  /* ---------------- Infinite scroll ---------------- */

  useEffect(() => {
    if (!hasMore) return;
    const node = observerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  /* ---------------- Filtering + sorting ---------------- */

  const filteredPosts = posts.filter((p) => {
    const s = p.severity_score ?? 0;
    if (severityFilter === "high") return s >= 8;
    if (severityFilter === "medium") return s >= 5 && s < 8;
    if (severityFilter === "low") return s < 5;
    return true;
  });

  const visiblePosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === "severity") {
      return (b.severity_score ?? 0) - (a.severity_score ?? 0);
    }
    if (sortBy === "trending") {
      const av = (a.upvotes ?? 0) - (a.downvotes ?? 0);
      const bv = (b.upvotes ?? 0) - (b.downvotes ?? 0);
      return bv - av;
    }
    return (
      new Date(b.created_at ?? "").getTime() -
      new Date(a.created_at ?? "").getTime()
    );
  });

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-[var(--page)] p-4 pb-24">
      {/* Header */}
      <header className="mb-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold">Feed</h1>
        <button onClick={() => navigate("/create")} className="btn-primary">
          Create
        </button>
      </header>

      {/* Filters */}
      <div className="mb-3 flex gap-2 overflow-x-auto">
        {[
          ["all", "All"],
          ["high", "High (8+)"],
          ["medium", "Medium"],
          ["low", "Low"],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSeverityFilter(k as any)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              severityFilter === k
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="mb-4 flex gap-4 text-sm">
        {["latest", "severity", "trending"].map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s as any)}
            className={
              sortBy === s ? "font-semibold text-slate-900" : "text-slate-500"
            }
          >
            {s === "latest"
              ? "Latest"
              : s === "severity"
              ? "High Severity"
              : "Trending"}
          </button>
        ))}
      </div>

      {/* 🔥 FIX: Render the error message if present */}
      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 border border-red-200 rounded-lg">
          Error loading feed: {error}
        </div>
      )}

      {/* Show message if there are no posts after filtering/loading */}
      {!loading && posts.length === 0 && !error && (
        <div className="text-center p-8 text-slate-500 bg-white rounded-lg border border-slate-100 shadow-sm">
          No posts found. Try adjusting your filters or{" "}
          <a
            onClick={() => navigate("/create")}
            className="text-orange-500 font-medium cursor-pointer"
          >
            create a new post
          </a>
          .
        </div>
      )}

      {/* Feed */}
      <div className="space-y-4">
        {visiblePosts.map((p) => {
          const sev = severityMeta(p.severity_score);
          return (
            <article
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/posts/${p.id}`)}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50"
            >
              <div className="flex justify-between">
                <div>
                  <div className="font-medium text-sm">
                    {p.user?.first_name || p.user?.username}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(p.created_at ?? "").toLocaleString()}
                  </div>
                </div>
                <span
                  className={`
                    inline-flex items-center
                    px-2.5 py-1
                    rounded-full
                    text-[11px] font-semibold
                    whitespace-nowrap
                    flex-shrink-0
                    ${sev.cls}
                  `}
                >
                  {sev.label}
                </span>
              </div>

              {p.image_url && (
                <img
                  src={p.image_url}
                  className="mt-3 w-full h-[220px] object-cover rounded-xl"
                />
              )}

              <p className="mt-3 text-sm text-slate-700">{p.description}</p>

              <div className="mt-3 flex items-center justify-between">
                <VoteButtons
                  postId={p.id}
                  upvotes={p.upvotes}
                  downvotes={p.downvotes}
                  userVote={p.user_vote}
                  onChange={({ upvotes, downvotes, user_vote }) => {
                    setPosts((prev) =>
                      prev.map((x) =>
                        x.id === p.id
                          ? { ...x, upvotes, downvotes, user_vote }
                          : x
                      )
                    );
                  }}
                />
                <span className="text-sm text-slate-500">
                  💬 {p.comments_count ?? 0}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {loading && (
        <div className="mt-6 text-center text-slate-500">Loading…</div>
      )}

      <div ref={observerRef} className="h-6" />
    </div>
  );
}
