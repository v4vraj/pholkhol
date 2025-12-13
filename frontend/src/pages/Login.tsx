import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = new URLSearchParams();
      body.append("username", username);
      body.append("password", password);

      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Login failed (${res.status})`);
      }

      const json = await res.json();
      if (json.access_token) {
        sessionStorage.setItem("token", json.access_token);
        navigate("/feed");
      } else {
        throw new Error("Login response missing token");
      }
    } catch (err: any) {
      setError(err?.message ?? "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <circle cx="12" cy="12" r="2.2" fill="currentColor" />
              <path
                d="M3 12a9 9 0 0118 0"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">CitySense</h1>
            <p className="text-xs text-slate-500">
              Fast civic reporting — minimal friction
            </p>
          </div>
        </div>

        <main className="card">
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">
            Welcome
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Sign in to view and report issues in your neighbourhood
          </p>

          {error && (
            <div className="mb-4 text-sm text-rose-700 bg-rose-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-slate-600">Username</label>
              <div className="mt-2 relative">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-plain"
                  placeholder="username or email"
                  inputMode="text"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-600">Password</label>
              <div className="mt-2 relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="input-plain pr-20"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>Remember</span>
              </label>
              <Link to="/forgot" className="text-slate-700 font-medium">
                Forgot?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Don’t have an account?{" "}
            <Link
              to="/register"
              className="text-slate-800 font-medium underline"
            >
              Create
            </Link>
          </p>
        </main>

        <p className="mt-6 text-center text-xs text-slate-400">
          By continuing you agree to our{" "}
          <span className="underline">Terms</span>.
        </p>
      </div>
    </div>
  );
}
