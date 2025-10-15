import os
import subprocess
import uuid
import time
import threading

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STREAMS_ROOT = os.path.join(os.path.dirname(BASE_DIR), "streams")

def convert_rtsp_to_hls(rtsp_url: str) -> str:
    stream_id = str(uuid.uuid4())
    output_dir = os.path.join(STREAMS_ROOT, stream_id)
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(output_dir, "index.m3u8")

    print(f"🎥 Starting FFmpeg conversion")
    print(f"📁 Output directory: {output_dir}")
    print(f"🔗 RTSP Source: {rtsp_url}")

    command = [
        "ffmpeg",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-tune", "zerolatency",
        "-c:a", "aac",
        "-f", "hls",
        "-hls_time", "2",
        "-hls_list_size", "5",
        "-hls_flags", "delete_segments",
        output_path,
    ]

    print("⚙️ Running command:", " ".join(command))

    # 🔹 Run FFmpeg in background thread (non-blocking)
    def run_ffmpeg():
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        # Continuously print FFmpeg logs
        for line in process.stderr:
            print("[FFmpeg]", line.strip())

    threading.Thread(target=run_ffmpeg, daemon=True).start()

    # 🕒 Wait until index.m3u8 exists (max 10s)
    waited = 0
    while not os.path.exists(output_path) and waited < 10:
        time.sleep(0.5)
        waited += 0.5

    if not os.path.exists(output_path):
        raise FileNotFoundError("index.m3u8 was not created by ffmpeg in time")

    print(f"✅ HLS stream ready at: {output_path}")
    return f"/streams/{stream_id}/index.m3u8"
