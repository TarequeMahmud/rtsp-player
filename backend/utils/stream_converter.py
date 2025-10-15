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
    # Blocking call
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    # Continuously print logs while waiting
    while True:
        line = process.stderr.readline()
        if not line:
            break
        print("[FFmpeg]", line.strip())
        # Stop waiting after first m3u8 segment is created
        if os.path.exists(output_path):
            break

    # ✅ Return HTTP path
    return f"/streams/{stream_id}/index.m3u8"
