"use client";
import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import axios from "axios";
import { Rnd } from "react-rnd";

const API_BASE = "http://localhost:5000";

export default function Home() {
  const [rtspUrl, setRtspUrl] = useState("");
  const [hlsUrl, setHlsUrl] = useState("");
  const [streamId, setStreamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [overlays, setOverlays] = useState([]);
  const [newOverlay, setNewOverlay] = useState({
    type: "text",
    content: "New Overlay",
    position: { x: 20, y: 20 },
    size: { w: 150, h: 50 },
  });
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const convert = async (e) => {
    e?.preventDefault();
    if (!rtspUrl.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/convert`, { rtsp_url: rtspUrl });
      const { hls_url, stream_id } = res.data;
      setHlsUrl(`${API_BASE}${hls_url}`);
      setStreamId(stream_id);
    } catch (err) {
      alert("Convert error: " + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hlsUrl && videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
        return () => hls.destroy();
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = hlsUrl;
        videoRef.current.onloadedmetadata = () => setLoading(false);
      }
    }
  }, [hlsUrl]);

  useEffect(() => {
    if (streamId) fetchOverlays();
  }, [streamId]);

  const fetchOverlays = async () => {
    const res = await axios.get(`${API_BASE}/api/overlays`, { params: { stream_id: streamId } });
    setOverlays(res.data);
  };

  const createOverlay = async (e) => {
    e?.preventDefault();
    const payload = { ...newOverlay, stream_id: streamId };
    const res = await axios.post(`${API_BASE}/api/overlays`, payload);
    setOverlays((prev) => [...prev, res.data]);
  };

  const updateOverlay = async (id, patch) => {
    setOverlays((prev) =>
      prev.map((o) => (o._id === id ? { ...o, ...patch } : o))
    );
    await axios.put(`${API_BASE}/api/overlays/${id}`, patch);
  };

  const deleteOverlay = async (id) => {
    await axios.delete(`${API_BASE}/api/overlays/${id}`);
    setOverlays((prev) => prev.filter((o) => o._id !== id));
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">RTSP Livestream Player with Overlays</h1>

      {!hlsUrl && (
        <form onSubmit={convert} className="flex gap-2 mb-4">
          <input
            className="border p-2 w-96"
            placeholder="Enter RTSP URL"
            value={rtspUrl}
            onChange={(e) => setRtspUrl(e.target.value)}
            disabled={loading}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={loading}
          >
            {loading ? "Loading..." : "Convert & Play"}
          </button>
        </form>
      )}

      {hlsUrl && (
        <div className="relative" ref={containerRef}>
          <video
            ref={videoRef}
            controls
            autoPlay
            className="w-[640px] h-[360px] rounded shadow"
          />

          {/* Overlay container absolutely positioned on top */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {overlays.map((o) => (
              <Rnd
                key={o._id}
                bounds="parent"
                size={{ width: o.size?.w || 150, height: o.size?.h || 50 }}
                position={{ x: o.position?.x || 0, y: o.position?.y || 0 }}
                onDragStop={(e, d) => updateOverlay(o._id, { position: { x: d.x, y: d.y } })}
                onResizeStop={(e, dir, ref, delta, pos) =>
                  updateOverlay(o._id, {
                    position: pos,
                    size: { w: ref.offsetWidth, h: ref.offsetHeight },
                  })
                }
                // <-- IMPORTANT: cancel selectors prevent drag/resize when interacting with them
                cancel=".no-drag, .no-drag *"
                className="pointer-events-auto"
                style={{ zIndex: 5 }}
                minWidth={40}
                minHeight={24}
              >
                {/* content wrapper: transparent background */}
                <div className="w-full h-full flex items-center justify-center" style={{ background: "transparent", position: "relative" }}>
                  {o.type === "text" ? (
                    <span className="text-sm text-yellow-400 font-semibold select-none">{o.content}</span>
                  ) : (
                    <img src={o.content} alt="overlay" className="w-full h-full object-contain select-none" />
                  )}

                  {/* delete button: has .no-drag so Rnd ignores it */}
                  <button
                    className="no-drag"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteOverlay(o._id);
                    }}
                    style={{
                      position: "absolute",
                      top: -10,
                      right: -10,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      background: "rgba(220,38,38,0.95)",
                      color: "white",
                      border: "none",
                      zIndex: 10,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      lineHeight: 1,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)"
                    }}
                    title="Delete overlay"
                  >
                    ×
                  </button>
                </div>
              </Rnd>
            ))}
          </div>

        </div>
      )}

      {streamId && (
        <form onSubmit={createOverlay} className="flex gap-2 mt-6">
          <select
            value={newOverlay.type}
            onChange={(e) => setNewOverlay({ ...newOverlay, type: e.target.value })}
            className="border p-2"
          >
            <option value="text">Text</option>
            <option value="image">Image URL</option>
          </select>
          <input
            value={newOverlay.content}
            onChange={(e) => setNewOverlay({ ...newOverlay, content: e.target.value })}
            className="border p-2 w-64"
            placeholder="Text or Image URL"
          />
          <button className="bg-green-600 text-white px-4 py-2 rounded">
            Add Overlay
          </button>
        </form>
      )}
    </main>
  );
}
