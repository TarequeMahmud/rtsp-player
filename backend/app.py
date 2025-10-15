from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from utils.stream_converter import convert_rtsp_to_hls
import os
import traceback

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STREAMS_DIR = os.path.join(BASE_DIR, "streams")

app = Flask(__name__)
CORS(app)


@app.route('/api/convert', methods=['POST'])
def convert_rtsp():
    data = request.get_json()
    rtsp_url = data.get('rtsp_url')

    if not rtsp_url:
        return jsonify({'error': 'RTSP URL is required'}), 400

    try:
        print(f"🎬 Received RTSP request: {rtsp_url}")
        hls_path = convert_rtsp_to_hls(rtsp_url)
        print(f"✅ Conversion successful: {hls_path}")
        return jsonify({'hls_url': hls_path})
    except Exception as e:
        print("❌ Exception occurred during conversion:")
        traceback.print_exc()  # prints full error trace to terminal
        return jsonify({'error': str(e)}), 500


@app.route('/streams/<path:filename>')
def serve_streams(filename):
    stream_dir = os.path.join(app.root_path, 'streams')
    print(f"📡 Serving from: {stream_dir}, file: {filename}")
    return send_from_directory(stream_dir, filename)


if __name__ == '__main__':
    os.makedirs(STREAMS_DIR, exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)
