// src/pages/Register.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type FormState = {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  age: string;
  location: string;
  gender: string;
  occupation: string;
};

export default function Register() {
  const [form, setForm] = useState<FormState>({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    age: "",
    location: "",
    gender: "",
    occupation: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = { ...form, age: Number(form.age) };

      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Registration failed");
      }

      navigate("/", { state: { registered: true } });
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <header className="mb-4">
          <h1 className="text-lg font-semibold text-slate-900">
            Create your CitySense Account
          </h1>
          <p className="text-sm text-slate-500">
            Help your city by reporting issues
          </p>
        </header>

        <main className="card">
          {error && (
            <div className="mb-4 text-sm text-rose-700 bg-rose-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-slate-600">First Name</span>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  className="input-plain mt-1"
                  placeholder="Asha"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs text-slate-600">Last Name</span>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  className="input-plain mt-1"
                  placeholder="Shah"
                  required
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs text-slate-600">Username</span>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                className="input-plain mt-1"
                placeholder="vraj01"
                required
              />
            </label>

            <label className="block">
              <span className="text-xs text-slate-600">Email</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input-plain mt-1"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="block">
              <span className="text-xs text-slate-600">Age</span>
              <input
                name="age"
                type="number"
                value={form.age}
                onChange={handleChange}
                min={10}
                max={120}
                className="input-plain mt-1"
                placeholder="e.g. 21"
              />
            </label>

            <label className="block">
              <span className="text-xs text-slate-600">Location</span>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                className="input-plain mt-1"
                placeholder="Mumbai, Andheri West"
              />
            </label>

            <label className="block">
              <span className="text-xs text-slate-600">Gender</span>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="input-plain mt-1 bg-white"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other / Prefer not</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-slate-600">Occupation</span>
              <input
                name="occupation"
                value={form.occupation}
                onChange={handleChange}
                className="input-plain mt-1"
                placeholder="Student, Engineer, etc."
              />
            </label>

            <label className="block">
              <span className="text-xs text-slate-600">Password</span>
              <div className="mt-1 relative">
                <input
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  type={showPassword ? "text" : "password"}
                  className="input-plain pr-20"
                  placeholder="8+ characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-600"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm mt-5 text-slate-500">
            Already have an account?{" "}
            <Link to="/" className="text-slate-800 underline font-medium">
              Login
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
