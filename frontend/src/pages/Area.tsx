import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type MapPost = {
  id: string;
  lat: number;
  lng: number;
  severity_score: number;
};

// 🔧 Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapWatcher({
  onBoundsChange,
}: {
  onBoundsChange: (b: L.LatLngBounds) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    },
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
    // eslint-disable-next-line
  }, []);

  return null;
}

export default function Area() {
  const [posts, setPosts] = useState<MapPost[]>([]);
  const [severityFilter, setSeverityFilter] = useState<
    "all" | "low" | "medium" | "high"
  >("all");

  const navigate = useNavigate();

  const fetchMapPosts = async (bounds: L.LatLngBounds) => {
    const params = new URLSearchParams({
      min_lat: bounds.getSouth().toString(),
      max_lat: bounds.getNorth().toString(),
      min_lng: bounds.getWest().toString(),
      max_lng: bounds.getEast().toString(),
    });

    const token = sessionStorage.getItem("token");

    const res = await fetch(`${API_BASE}/api/map/posts?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    setPosts(json.items || []);
  };

  // 🎯 Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (severityFilter === "low") return p.severity_score < 4;
      if (severityFilter === "medium")
        return p.severity_score >= 4 && p.severity_score < 8;
      if (severityFilter === "high") return p.severity_score >= 8;
      return true;
    });
  }, [posts, severityFilter]);

  return (
    <div className="min-h-screen bg-[var(--page)] pb-24">
      {/* Header */}
      <div className="p-4">
        <h1 className="text-lg font-semibold">Explore by Area</h1>
        <p className="text-sm text-slate-500">Civic issues around you</p>
      </div>

      {/* Map */}
      <div className="mx-4 h-[420px] rounded-2xl overflow-hidden shadow">
        <MapContainer
          center={[19.076, 72.8777]}
          zoom={12}
          className="h-full w-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapWatcher onBoundsChange={fetchMapPosts} />

          {filteredPosts.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]}>
              <Popup>
                <div className="text-sm space-y-1">
                  <div className="font-semibold">
                    Severity: {p.severity_score}
                  </div>
                  <button
                    onClick={() => navigate(`/posts/${p.id}`)}
                    className="text-orange-600 underline"
                  >
                    View post
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Controls */}
      <div className="px-4 mt-4 space-y-3">
        {/* Severity Filter */}
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: "all", label: "All" },
            { id: "low", label: "Low (<4)" },
            { id: "medium", label: "Medium (4–7)" },
            { id: "high", label: "High (8+)" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSeverityFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                severityFilter === f.id
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="text-sm text-slate-500">
          Showing{" "}
          <span className="font-medium text-slate-800">
            {filteredPosts.length}
          </span>{" "}
          reports in this area
        </div>

        {/* Preview List */}
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {filteredPosts.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/posts/${p.id}`)}
              className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:bg-slate-50 transition"
            >
              <div>
                <div className="text-sm font-medium">📍 Issue Report</div>
                <div className="text-xs text-slate-500">
                  Severity {p.severity_score}
                </div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  p.severity_score >= 8
                    ? "bg-red-100 text-red-700"
                    : p.severity_score >= 4
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {p.severity_score >= 8
                  ? "High"
                  : p.severity_score >= 4
                  ? "Medium"
                  : "Low"}
              </span>
            </button>
          ))}

          {filteredPosts.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-6">
              No reports match this filter
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
