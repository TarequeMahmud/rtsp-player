"use client";
import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import axios from "axios";

export default function Home() {
  const [rtspUrl, setRtspUrl] = useState("");
  const [hlsUrl, setHlsUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rtspUrl.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/convert", {
        rtsp_url: rtspUrl,
      });
      console.log(res.data);
      setHlsUrl(`http://localhost:5000${res.data.hls_url}`);
    } catch (err) {
      alert("Error: " + err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hlsUrl && videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false); // stop loading when video is ready
        });
        return () => hls.destroy();
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = hlsUrl;
        videoRef.current.onloadedmetadata = () => setLoading(false);
      }
    }
  }, [hlsUrl]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100">
      <h1 className="text-2xl text-black font-bold mb-4">RTSP Livestream Player</h1>

      {!hlsUrl && (
        <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Enter RTSP URL"
            value={rtspUrl}
            onChange={(e) => setRtspUrl(e.target.value)}
            className="border text-black p-2 rounded w-96"
            disabled={loading}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={loading}
          >
            {loading ? "Loading..." : "Convert & Play"}
          </button>
        </form>
      )}

      {hlsUrl && (
        <video
          ref={videoRef}
          controls
          autoPlay
          className="w-[640px] rounded shadow"
        />
      )}
    </main>
  );
}
