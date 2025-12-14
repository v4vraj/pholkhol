import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type ProfileData = {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  posts_count: number;
  votes_count: number;
  areas_count: number;
};

type UserPost = {
  id: string;
  description?: string;
  image_url?: string;
  created_at?: string;
  severity_score?: number;
};

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [tab, setTab] = useState<"posts" | "upvoted">("posts");

  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    fetch(`${API_BASE}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setProfile);

    fetch(`${API_BASE}/api/me/posts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setPosts(d.items || []));
  }, [token, navigate]);

  const logout = () => {
    sessionStorage.clear();
    navigate("/", { replace: true });
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-[var(--page)] pb-24">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Profile</h1>
        <button onClick={logout} className="text-sm text-red-600 font-medium">
          Logout
        </button>
      </div>

      {/* Profile card */}
      <div className="px-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <div className="text-lg font-semibold">
                {profile.first_name} {profile.last_name}
              </div>
              <div className="text-sm text-slate-500">@{profile.username}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 text-center mt-4">
            <div>
              <div className="font-semibold">{profile.posts_count}</div>
              <div className="text-xs text-slate-500">Posts</div>
            </div>
            <div>
              <div className="font-semibold">{profile.votes_count}</div>
              <div className="text-xs text-slate-500">Votes</div>
            </div>
            <div>
              <div className="font-semibold">{profile.areas_count}</div>
              <div className="text-xs text-slate-500">Areas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-6 flex gap-2">
        {["posts", "upvoted"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              tab === t
                ? "bg-orange-500 text-white"
                : "bg-white border border-slate-200 text-slate-700"
            }`}
          >
            {t === "posts" ? "My Posts" : "Upvoted"}
          </button>
        ))}
      </div>

      {/* Post list */}
      <div className="px-4 mt-4 space-y-3">
        {posts.length === 0 && (
          <div className="text-sm text-slate-400 text-center py-12">
            No posts yet
          </div>
        )}

        {posts.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/posts/${p.id}`)}
            className="w-full bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden text-left"
          >
            {p.image_url && (
              <img
                src={p.image_url}
                alt=""
                className="w-full h-40 object-cover"
              />
            )}
            <div className="p-3">
              <div className="text-sm text-slate-700 line-clamp-2">
                {p.description}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Severity {p.severity_score ?? "—"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
