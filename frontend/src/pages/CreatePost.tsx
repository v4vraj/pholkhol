import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type UploadUrlResp = {
  url: string;
  fields: Record<string, string>;
  object_url: string;
};

export default function CreatePost() {
  const navigate = useNavigate();
  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("token") : null;

  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------------- file picker ---------------- */

  const handlePick = (f?: File) => {
    setError(null);
    const chosen =
      f ??
      (fileInputRef.current?.files && fileInputRef.current.files[0]) ??
      null;

    if (!chosen) return;

    if (!chosen.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (chosen.size > 10 * 1024 * 1024) {
      setError("Image too large — max 10 MB.");
      return;
    }

    setFile(chosen);

    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(chosen);
  };

  /* ---------------- location ---------------- */

  const handleUseLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      (err) => setError("Location error: " + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* ---------------- submit ---------------- */

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    if (!file) {
      setError("Please choose an image.");
      return;
    }

    setLoading(true);
    setProgress(null);

    try {
      const presRes = await fetch(`${API_BASE}/api/upload-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || "image/jpeg",
        }),
      });

      if (!presRes.ok) {
        await fallbackServerUpload(file);
        return;
      }

      const pres = (await presRes.json()) as UploadUrlResp;

      const form = new FormData();
      Object.entries(pres.fields).forEach(([k, v]) => form.append(k, v));
      form.append("file", file);

      await uploadWithProgress(pres.url, form);

      const reg = await fetch(`${API_BASE}/api/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description,
          lat: lat ?? 0,
          lng: lng ?? 0,
          image_url: pres.object_url,
        }),
      });

      if (!reg.ok) throw new Error("Failed to register post");

      navigate("/feed");
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  /* ---------------- fallback upload ---------------- */

  const fallbackServerUpload = async (f: File) => {
    if (!token) return;

    const fd = new FormData();
    fd.append("description", description);
    fd.append("lat", String(lat ?? 0));
    fd.append("lng", String(lng ?? 0));
    fd.append("image", f, f.name);

    const res = await fetch(`${API_BASE}/api/post_file`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (!res.ok) throw new Error("Server upload failed");

    navigate("/feed");
  };

  /* ---------------- presigned upload progress ---------------- */

  const uploadWithProgress = (url: string, data: FormData) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error("Upload failed"));

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(data);
    });

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-[var(--page)] p-4 pb-24">
      {/* Header */}
      <header className="mb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-slate-500">
          ← Back
        </button>
        <h1 className="text-lg font-semibold text-slate-800">Create Post</h1>
        <div className="w-6" />
      </header>

      {/* Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4"
      >
        {error && (
          <div className="text-sm text-rose-700 bg-rose-50 p-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Description */}
        <label className="block">
          <span className="text-xs text-slate-600">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-plain h-28 resize-none"
            placeholder="Describe the issue clearly…"
            required
          />
        </label>

        {/* Location */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleUseLocation}
            className="rounded-xl py-3 bg-white border border-slate-200 text-sm font-medium"
          >
            📍 Use my location
          </button>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            {lat && lng
              ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
              : "Location not set"}
          </div>
        </div>

        {/* Image */}
        <div>
          <span className="text-xs text-slate-600">Image</span>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={() => handlePick()}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 w-full py-3 rounded-xl border border-slate-200 text-sm"
          >
            Choose photo
          </button>

          {preview ? (
            <div className="mt-3 rounded-xl overflow-hidden border border-slate-100">
              <img
                src={preview}
                alt="preview"
                className="w-full h-48 object-cover"
              />
            </div>
          ) : (
            <div className="mt-2 text-sm text-slate-400 text-center">
              No image selected
            </div>
          )}

          <div className="mt-1 text-xs text-slate-400">
            Max 10MB · JPG / PNG
          </div>
        </div>

        {/* Progress */}
        {progress !== null && (
          <div className="space-y-1">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-2 bg-orange-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-slate-500">{progress}% uploaded</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? "Uploading…" : "Submit Post"}
          </button>

          <button
            type="button"
            onClick={() => {
              setDescription("");
              setFile(null);
              setPreview(null);
              setLat(null);
              setLng(null);
              setError(null);
            }}
            className="px-4 py-3 rounded-xl border border-slate-200 text-sm"
          >
            Reset
          </button>
        </div>
      </form>

      <div className="mt-4 text-xs text-slate-400 text-center">
        Clear photos and location help authorities act faster.
      </div>
    </div>
  );
}
