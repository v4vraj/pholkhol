import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import VoteButtons from "../components/VoteButtons";
import CommentsPanel from "../components/CommentsPanel";

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
  user_vote?: number; // 1, -1, or 0
  comments_count?: number;
};

export default function Feed() {
  const navigate = useNavigate();
  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("token") : null;

  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(8);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

  // redirect to login if no token
  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true });
    }
  }, [token, navigate]);

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

        if (res.status === 401) {
          sessionStorage.removeItem("token");
          navigate("/", { replace: true });
          return;
        }

        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Failed to fetch posts (${res.status})`);
        }

        const json = await res.json();
        const items: Post[] = Array.isArray(json) ? json : json.items ?? [];

        setPosts((prev) => (pageToLoad === 1 ? items : [...prev, ...items]));

        if (items.length < limit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } catch (err: any) {
        setError(err?.message ?? "Unknown error while loading posts");
      } finally {
        setLoading(false);
      }
    },
    [API_BASE, limit, token, navigate]
  );

  // initial load & refresh
  useEffect(() => {
    setPage(1);
    fetchPosts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPosts]);

  // pagination: load when page changes (but not on first mount because fetchPosts already called)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchPosts(page);
  }, [page, fetchPosts]);

  // infinite scroll intersection observer
  useEffect(() => {
    if (!hasMore) return;
    const node = observerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loading && hasMore) {
            setPage((p) => p + 1);
          }
        });
      },
      { root: null, rootMargin: "200px", threshold: 0.1 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading]);

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const goToCreate = () => {
    navigate("/create");
  };

  const handleLogout = () => {
    // Clear auth & related session data then redirect to login
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    // optionally clear other storage (localStorage) if used
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[var(--page)] p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg border border-slate-100 bg-white flex items-center justify-center text-slate-900">
            {/* neutral small logo */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 12a9 9 0 0118 0"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="2.2" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Feed</h1>
          </div>
        </div>

        {/* Right-side actions: Create + Logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-sm font-medium border border-slate-200 shadow-sm hover:bg-slate-50"
            aria-label="Logout"
            title="Logout"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M16 17l5-5-5-5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 12H9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13 19H6a2 2 0 01-2-2V7a2 2 0 012-2h7"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Logout
          </button>
        </div>
      </header>

      <main>
        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {posts.length === 0 && !loading ? (
            <div className="text-center text-slate-500 py-16">
              No posts yet. Tap Create to report an issue.
            </div>
          ) : null}

          {posts.map((p) => (
            <article
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/posts/${p.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/posts/${p.id}`);
                }
              }}
              className="bg-white rounded-2xl shadow-sm p-4 border border-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 font-semibold">
                  {p.user?.first_name
                    ? p.user.first_name.charAt(0).toUpperCase()
                    : p.user?.username?.charAt(0).toUpperCase() ?? "U"}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        {p.user?.first_name || p.user?.username || "Unknown"}
                        {p.user?.last_name ? ` ${p.user.last_name}` : ""}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDate(p.created_at)}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                          {p.composite_score
                            ? p.composite_score.toFixed(1)
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {p.image_url && (
                    <div className="mt-3 rounded-xl overflow-hidden bg-slate-100">
                      <img
                        src={p.image_url}
                        alt={p.description ?? "Post image"}
                        className="w-full h-[220px] object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <p className="mt-3 text-sm text-slate-700">{p.description}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <VoteButtons
                        postId={p.id}
                        upvotes={p.upvotes ?? 0}
                        downvotes={p.downvotes ?? 0}
                        userVote={p.user_vote ?? 0}
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
                      <button
                        className="text-sm text-slate-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/posts/${p.id}`);
                        }}
                      >
                        💬 {p.comments_count ?? 0}
                      </button>
                    </div>

                    {/* removed View button -- entire card is clickable now */}
                    <div />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="text-slate-400"
                        >
                          <path
                            d="M12 21s-6-4.35-8.5-7.5A7.5 7.5 0 1112 21z"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="12"
                            cy="10"
                            r="2.5"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>
                          {p.lat && p.lng
                            ? `${p.lat.toFixed(2)}, ${p.lng.toFixed(2)}`
                            : "Unknown"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] bg-slate-100 px-2 py-1 rounded-full">
                          S:{p.severity_score ?? "—"}
                        </span>
                        <span className="text-[11px] bg-slate-100 px-2 py-1 rounded-full">
                          A:{p.authenticity_score ?? "—"}
                        </span>
                      </div>
                    </div>

                    {/* removed duplicate View button here as well */}
                    <div />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* loading indicator */}
        <div className="mt-6 flex items-center justify-center">
          {loading && (
            <div className="inline-flex items-center gap-2 text-slate-600">
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                ></path>
              </svg>
              Loading
            </div>
          )}
        </div>

        {/* sentinel for infinite scroll */}
        <div ref={observerRef} className="h-6" />

        {/* no more */}
        {!hasMore && posts.length > 0 && (
          <div className="mt-6 text-center text-sm text-slate-400">
            You're all caught up 🎉
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) for Create Post */}
      <button
        onClick={goToCreate}
        aria-label="Create post"
        className="fixed right-5 bottom-6 w-14 h-14 rounded-full btn-primary flex items-center justify-center text-white shadow-2xl"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 12h14"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
