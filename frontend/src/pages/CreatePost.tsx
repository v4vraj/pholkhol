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

  // pick file handler
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

    // limit to 10MB
    if (chosen.size > 10 * 1024 * 1024) {
      setError("Image too large — max 10 MB.");
      return;
    }

    setFile(chosen);

    // create preview
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(chosen);
  };

  // geolocation helper
  const handleUseLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      (err) => {
        setError("Could not get location: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Main submit handler: prefer presigned upload -> register post. fallback to server multipart.
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!token) {
      setError("Not authenticated");
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
      // 1) request presigned upload info from server
      const filename = `${file.name}`;
      const content_type = file.type || "image/jpeg";

      const presRes = await fetch(`${API_BASE}/api/upload-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filename, content_type }),
      });

      if (!presRes.ok) {
        // if presigned endpoint fails, fallback to /api/post_file (server-side upload)
        const text = await presRes.text();
        console.warn("Presigned creation failed:", text);
        await fallbackServerUpload(file);
        return;
      }

      const presJson = (await presRes.json()) as UploadUrlResp;

      // 2) Build a FormData containing the presigned fields + file (presigned POST)
      const form = new FormData();
      Object.entries(presJson.fields || {}).forEach(([k, v]) =>
        form.append(k, v)
      );
      // MinIO expects the file field to be named "file" or "file"??? Usually "file" or "file" key required by presigned POST.
      // The presigned fields usually include 'key' and 'policy' etc. Append file as 'file' or as the field name in fields['file'] if present.
      // Many S3 libs expect the file field key to be 'file' or 'file'. We'll append under "file".
      form.append("file", file);

      // 3) Upload directly to MinIO using presigned POST URL
      // We use fetch with progress via XMLHttpRequest since fetch lacks progress event for uploads
      await uploadWithPresigned(presJson.url, form);

      // 4) Call /api/post to register the post metadata (image_url is returned by presigned endpoint)
      const registerRes = await fetch(`${API_BASE}/api/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description,
          lat: lat ?? 0,
          lng: lng ?? 0,
          image_url: presJson.object_url,
        }),
      });

      if (!registerRes.ok) {
        const t = await registerRes.text();
        throw new Error(
          "Failed to register post: " + (t || registerRes.status)
        );
      }

      // success
      navigate("/feed");
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Upload failed");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  // fallback: send multipart to /api/post_file (server will accept file)
  const fallbackServerUpload = async (f: File) => {
    if (!token) throw new Error("Missing token");

    const fd = new FormData();
    fd.append("description", description);
    fd.append("lat", String(lat ?? 0));
    fd.append("lng", String(lng ?? 0));
    fd.append("image", f, f.name);

    const res = await fetch(`${API_BASE}/api/post_file`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: fd,
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error("Server upload failed: " + (t || res.status));
    }

    // success
    navigate("/feed");
  };

  // upload helper with progress using XMLHttpRequest
  const uploadWithPresigned = (url: string, formData: FormData) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          setProgress(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(
            new Error(
              `Upload failed with status ${xhr.status}: ${xhr.responseText}`
            )
          );
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during upload"));
      };

      xhr.send(formData);
    });

  const handleChooseClick = () => fileInputRef.current?.click();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-indigo-50 p-4">
      <header className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-slate-700"
        >
          ← Back
        </button>
        <h1 className="text-lg font-semibold text-slate-800">Create Post</h1>
        <div className="w-6" />
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-4"
      >
        {error && (
          <div className="text-sm text-red-700 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-xs text-slate-600">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Describe the issue (where, what, urgency)..."
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleUseLocation}
            className="inline-flex items-center justify-center gap-2 rounded-xl py-3 bg-white border border-slate-200 shadow text-sm"
          >
            Use my location
          </button>

          <div className="inline-flex items-center justify-center gap-2 rounded-xl py-3 bg-white border border-slate-200 shadow text-sm">
            <div>
              <div className="text-[12px] text-slate-500">Lat</div>
              <div className="text-sm font-medium">
                {lat?.toFixed(5) ?? "—"}
              </div>
            </div>
            <div className="ml-4">
              <div className="text-[12px] text-slate-500">Lng</div>
              <div className="text-sm font-medium">
                {lng?.toFixed(5) ?? "—"}
              </div>
            </div>
          </div>
        </div>

        <div>
          <span className="text-xs text-slate-600">Image</span>
          <div className="mt-2 flex gap-3 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={() => handlePick()}
            />
            <button
              type="button"
              onClick={handleChooseClick}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 shadow text-sm"
            >
              Choose photo
            </button>

            <div className="flex-1">
              {preview ? (
                <div className="rounded-xl overflow-hidden border border-slate-100">
                  <img
                    src={preview}
                    alt="preview"
                    className="w-full h-48 object-cover"
                  />
                </div>
              ) : (
                <div className="text-sm text-slate-400">No image selected</div>
              )}
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Max 10MB. JPG/PNG preferred.
          </div>
        </div>

        {/* upload progress */}
        {progress !== null && (
          <div className="w-full bg-slate-100 rounded-full overflow-hidden h-3">
            <div
              className="h-3 bg-indigo-600"
              style={{ width: `${progress}%` }}
            />
            <div className="mt-1 text-xs text-slate-500">{progress}%</div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-medium shadow"
          >
            {loading ? "Uploading..." : "Submit Post"}
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
            className="px-4 py-3 rounded-xl bg-white border border-slate-200 shadow text-sm"
          >
            Reset
          </button>
        </div>
      </form>

      {/* quick hint */}
      <div className="mt-6 text-xs text-slate-500">
        Tip: allow location access for faster reporting. Images are uploaded to
        the server's object store.
      </div>
    </div>
  );
}
