"use client";
import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import axios from "axios";

const API_BASE = "http://localhost:5000";

export default function Home() {
  const [rtspUrl, setRtspUrl] = useState("");
  const [hlsUrl, setHlsUrl] = useState("");
  const [streamId, setStreamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [overlays, setOverlays] = useState([]);
  const [newOverlay, setNewOverlay] = useState({ type: "text", content: "Hello", position: { x: 10, y: 10 }, size: { w: 150, h: 50 } });
  const videoRef = useRef(null);

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
    if (!streamId) return;
    fetchOverlays();
  }, [streamId]);

  const fetchOverlays = async () => {
    const res = await axios.get(`${API_BASE}/api/overlays`, { params: { stream_id: streamId } });
    setOverlays(res.data);
  };

  const createOverlay = async (e) => {
    e?.preventDefault();
    const payload = { ...newOverlay, stream_id: streamId };
    const res = await axios.post(`${API_BASE}/api/overlays`, payload);
    setOverlays(prev => [...prev, res.data]);
    setNewOverlay({ ...newOverlay, content: "Hello" });
  };

  const deleteOverlay = async (id) => {
    await axios.delete(`${API_BASE}/api/overlays/${id}`);
    setOverlays(prev => prev.filter(o => o._id !== id));
  };

  const updateOverlay = async (id, patch) => {
    const res = await axios.put(`${API_BASE}/api/overlays/${id}`, patch);
    setOverlays(prev => prev.map(o => o._id === id ? res.data : o));
  };

  return (
    <main className="p-6 min-h-screen bg-gray-100 flex gap-8">
      <section className="w-1/2">
        <h1 className="text-xl font-bold mb-4">RTSP → HLS Player</h1>

        {!hlsUrl && (
          <form onSubmit={convert} className="flex gap-2 mb-4">
            <input
              className="border p-2 flex-1"
              placeholder="rtsp://..."
              value={rtspUrl}
              onChange={(e) => setRtspUrl(e.target.value)}
              disabled={loading}
            />
            <button className="bg-blue-600 text-white px-4 rounded" disabled={loading}>
              {loading ? "Converting..." : "Convert & Play"}
            </button>
          </form>
        )}

        {hlsUrl && (
          <>
            <div className="mb-2 text-sm">Stream ID: <code>{streamId}</code></div>
            <video ref={videoRef} controls autoPlay className="w-full rounded shadow" />
          </>
        )}
      </section>

      <aside className="w-1/2">
        <h2 className="font-semibold mb-2">Overlays</h2>

        {!streamId && <div className="text-sm text-gray-500">Convert a stream first to manage overlays.</div>}

        {streamId && (
          <>
            <form onSubmit={createOverlay} className="mb-4 flex flex-col gap-2">
              <label className="text-sm">Type & Content</label>
              <div className="flex gap-2">
                <select value={newOverlay.type} onChange={e => setNewOverlay({ ...newOverlay, type: e.target.value })} className="border p-2">
                  <option value="text">Text</option>
                  <option value="image">Image URL</option>
                </select>
                <input value={newOverlay.content} onChange={e => setNewOverlay({ ...newOverlay, content: e.target.value })} className="border p-2 flex-1" />
              </div>

              <div className="flex gap-2">
                <input type="number" value={newOverlay.position.x} onChange={e => setNewOverlay({ ...newOverlay, position: { ...newOverlay.position, x: Number(e.target.value) } })} className="border p-2 w-24" />
                <input type="number" value={newOverlay.position.y} onChange={e => setNewOverlay({ ...newOverlay, position: { ...newOverlay.position, y: Number(e.target.value) } })} className="border p-2 w-24" />
                <input type="number" value={newOverlay.size.w} onChange={e => setNewOverlay({ ...newOverlay, size: { ...newOverlay.size, w: Number(e.target.value) } })} className="border p-2 w-24" />
                <input type="number" value={newOverlay.size.h} onChange={e => setNewOverlay({ ...newOverlay, size: { ...newOverlay.size, h: Number(e.target.value) } })} className="border p-2 w-24" />
              </div>

              <button className="bg-green-600 text-white px-3 py-1 rounded w-32">Add Overlay</button>
            </form>

            <div className="space-y-2">
              {overlays.map(o => (
                <div key={o._id} className="border p-2 rounded bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm">Type: <strong>{o.type}</strong></div>
                      <div className="text-xs text-gray-600">Content: {o.content}</div>
                      <div className="text-xs text-gray-600">Pos: {o.position?.x},{o.position?.y} • Size: {o.size?.w}×{o.size?.h}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-sm px-2" onClick={() => deleteOverlay(o._id)}>Delete</button>
                      <button className="text-sm px-2" onClick={() => {
                        const newPos = { x: (o.position?.x || 0) + 10, y: (o.position?.y || 0) + 5 };
                        updateOverlay(o._id, { position: newPos });
                      }}>Nudge →</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </main>
  );
}
