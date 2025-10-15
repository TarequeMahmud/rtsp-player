from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from utils.stream_converter import convert_rtsp_to_hls
import os, traceback
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from flasgger import Swagger

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STREAMS_DIR = os.path.join(BASE_DIR, "streams")
os.makedirs(STREAMS_DIR, exist_ok=True)

app = Flask(__name__)
CORS(app)

# --- Swagger setup ---
swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "RTSP Livestream API",
        "description": "Backend API for converting RTSP streams to HLS and managing overlays.",
        "version": "1.0.0",
    },
    "basePath": "/",
}
swagger = Swagger(app, template=swagger_template)

# --- MongoDB setup ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client.get_database("rtsp_player_db")
overlays_coll = db.get_collection("overlays")


# ===============================================================
# Convert RTSP → HLS
# ===============================================================
@app.route('/api/convert', methods=['POST'])
def convert_rtsp():
    """
    Convert RTSP to HLS
    ---
    tags:
      - Stream
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            rtsp_url:
              type: string
              example: "rtsp://example.com/live"
    responses:
      200:
        description: HLS URL and stream ID
        schema:
          type: object
          properties:
            stream_id:
              type: string
            hls_url:
              type: string
      400:
        description: Missing RTSP URL
    """
    data = request.get_json()
    rtsp_url = data.get('rtsp_url')
    if not rtsp_url:
        return jsonify({'error': 'RTSP URL is required'}), 400

    try:
        print(f"🎬 Received RTSP request: {rtsp_url}")
        hls_path = convert_rtsp_to_hls(rtsp_url)
        stream_id = hls_path.split("/")[2] if len(hls_path.split("/")) > 2 else None
        print(f"✅ Conversion started: stream_id={stream_id}, path={hls_path}")
        return jsonify({'stream_id': stream_id, 'hls_url': hls_path})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ===============================================================
# Serve stream files
# ===============================================================
@app.route('/streams/<path:filename>')
def serve_streams(filename):
    """Serve generated HLS stream segments"""
    stream_dir = os.path.join(app.root_path, 'streams')
    print(f"📡 Serving from: {stream_dir}, file: {filename}")
    return send_from_directory(stream_dir, filename)


# ===============================================================
# Overlay CRUD
# ===============================================================
@app.route('/api/overlays', methods=['POST'])
def create_overlay():
    """
    Create overlay
    ---
    tags:
      - Overlays
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            stream_id:
              type: string
            type:
              type: string
              enum: [text, image]
            content:
              type: string
            position:
              type: object
              example: {"x": 10, "y": 10}
            size:
              type: object
              example: {"w": 150, "h": 50}
    responses:
      201:
        description: Overlay created
    """
    data = request.get_json()
    required = ['stream_id','type','content']
    if not all(k in data for k in required):
        return jsonify({'error': 'stream_id, type and content required'}), 400

    doc = {
        "stream_id": data["stream_id"],
        "type": data["type"],
        "content": data["content"],
        "position": data.get("position", {"x":10,"y":10}),
        "size": data.get("size", {"w":150,"h":50})
    }
    res = overlays_coll.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return jsonify(doc), 201


@app.route('/api/overlays', methods=['GET'])
def list_overlays():
    """
    List overlays
    ---
    tags:
      - Overlays
    parameters:
      - name: stream_id
        in: query
        type: string
        required: false
    responses:
      200:
        description: List of overlays
    """
    stream_id = request.args.get('stream_id')
    q = {"stream_id": stream_id} if stream_id else {}
    docs = []
    for d in overlays_coll.find(q):
        d["_id"] = str(d["_id"])
        docs.append(d)
    return jsonify(docs)


@app.route('/api/overlays/<id>', methods=['PUT'])
def update_overlay(id):
    """
    Update overlay
    ---
    tags:
      - Overlays
    parameters:
      - name: id
        in: path
        type: string
        required: true
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            content: {type: string}
            position: {type: object}
            size: {type: object}
            type: {type: string}
    responses:
      200:
        description: Updated overlay
    """
    try:
        oid = ObjectId(id)
    except InvalidId:
        return jsonify({'error':'invalid id'}), 400
    data = request.get_json()
    allowed = {"content","position","size","type"}
    update = {k:v for k,v in data.items() if k in allowed}
    if not update:
        return jsonify({'error':'nothing to update'}), 400
    overlays_coll.update_one({"_id": oid}, {"$set": update})
    doc = overlays_coll.find_one({"_id": oid})
    if not doc:
        return jsonify({'error':'not found'}), 404
    doc["_id"] = str(doc["_id"])
    return jsonify(doc)


@app.route('/api/overlays/<id>', methods=['DELETE'])
def delete_overlay(id):
    """
    Delete overlay
    ---
    tags:
      - Overlays
    parameters:
      - name: id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Overlay deleted
    """
    try:
        oid = ObjectId(id)
    except InvalidId:
        return jsonify({'error':'invalid id'}), 400
    res = overlays_coll.delete_one({"_id": oid})
    if res.deleted_count == 0:
        return jsonify({'error':'not found'}), 404
    return jsonify({'deleted': id})


# ===============================================================
# Run the app
# ===============================================================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
