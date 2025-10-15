# 🎥 RTSP Livestream Player with Custom Overlays

## 🧭 Objective
This project allows users to **view a live RTSP video stream in the browser** (converted to HLS format) and **add, move, resize, or remove overlays** such as text or images directly on top of the video.

The app includes:
- A **Flask backend** (Python) to convert RTSP → HLS and provide CRUD APIs for overlays.
- A **Next.js frontend** to render the livestream using `hls.js` and manage overlays interactively.
- **MongoDB** to store overlay settings (position, size, content, type, and stream_id).

---

## 🏗️ Folder Structure

```
rtsp-player/
├── backend
│   ├── app.py
│   ├── requirements.txt
│   ├── streams/
│   │   ├── <uuid>/index.m3u8
│   │   └── ...
│   └── utils/
│       └── stream_converter.py
└── frontend
    ├── app/
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.js
    │   └── page.js
    ├── package.json
    ├── postcss.config.mjs
    ├── public/
    └── README.md
```

---

## ⚙️ Frontend & Backend Configuration

### 🧩 Backend (Flask)
- **Python version:** 3.9+
- **Framework:** Flask + Flask-CORS + Flasgger (Swagger UI)
- **Database:** MongoDB
- **Streaming:** FFmpeg (installed on system)

Environment file `.env` (in `backend/`):
```bash
MONGO_URI=mongodb://localhost:27017
```

**Backend setup (with virtual environment):**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Swagger UI available at:
👉 [http://localhost:5000/apidocs](http://localhost:5000/apidocs)

---

### 💻 Frontend (Next.js)
- **Framework:** Next.js (App Router)
- **Libraries:** `axios`, `hls.js`, `react-rnd`, `tailwindcss`

**Frontend setup:**
```bash
cd frontend
npm install
npm run dev
```

Runs at: [http://localhost:3000](http://localhost:3000)

---

## 👩‍💻 User Story

1. **Enter RTSP URL**
2. **Convert RTSP → HLS**
3. **Watch the stream**
4. **Add overlays**
5. **Persist overlays (MongoDB)**

---

## ⚡ API Endpoints

### 🎬 Stream Conversion   
**POST** `/api/convert`
   
**Request:**
```json
{
  "rtsp_url": "rtsp://your-stream-url"
}
```
**Response:**
```json
{
  "stream_id": "82a4c582-f3f0-4541-b243-5b9c21223a02",
  "hls_url": "/streams/82a4c582-f3f0-4541-b243-5b9c21223a02/index.m3u8"
}
```

---

### 🧱 Overlays CRUD   

#### ➕ Create Overlay
**POST** `/api/overlays`   

**Request:**   
```json
{
  "stream_id": "82a4c582-f3f0-4541-b243-5b9c21223a02",
  "type": "text",
  "content": "Live Feed",
  "position": {"x": 100, "y": 50},
  "size": {"w": 200, "h": 60}
}
```

**Response:**   
```json
{
  "_id": "6718f6dd9bfe2b5cf256ed1e",
  "stream_id": "82a4c582-f3f0-4541-b243-5b9c21223a02",
  "type": "text",
  "content": "Live Feed",
  "position": {"x":100,"y":50},
  "size": {"w":200,"h":60}
}
```

---

#### 📖 Read Overlays (List)   
**GET** `/api/overlays?stream_id=82a4c582-f3f0-4541-b243-5b9c21223a02`   

**Response:**   
```json
[
  {
    "_id": "6718f6dd9bfe2b5cf256ed1e",
    "stream_id": "82a4c582-f3f0-4541-b243-5b9c21223a02",
    "type": "text",
    "content": "Live Feed",
    "position": {"x":100,"y":50},
    "size": {"w":200,"h":60}
  }
]
```

---

#### ✏️ Update Overlay   
**PUT** `/api/overlays/<overlay_id>`   

**Request:**   
```json
{
  "position": {"x": 120, "y": 70},
  "size": {"w": 220, "h": 70}
}
```
   
**Response:**   
```json
{
  "_id": "6718f6dd9bfe2b5cf256ed1e",
  "stream_id": "82a4c582-f3f0-4541-b243-5b9c21223a02",
  "type": "text",
  "content": "Live Feed",
  "position": {"x":120,"y":70},
  "size": {"w":220,"h":70}
}
```

---

#### ❌ Delete Overlay
**DELETE** `/api/overlays/<overlay_id>`

**Response:**
```json
{
  "deleted": "6718f6dd9bfe2b5cf256ed1e"
}
```

---

## 🧾 RTSP Link Format Examples
```
rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov
rtsp://184.72.239.149/vod/mp4:BigBuckBunny_175k.mov
```

---

## 🧰 Dependencies Summary

### Backend
Flask, Flask-CORS, flasgger, pymongo, ffmpeg-python, python-dotenv

### Frontend
Next.js, axios, hls.js, react-rnd, tailwindcss

---

## 🚀 Features Recap
✅ RTSP → HLS live video conversion  
✅ Play livestream in browser  
✅ Create / Read / Update / Delete overlays  
✅ Drag & resize overlays visually  
✅ MongoDB persistence  
✅ Swagger UI for API documentation  
✅ Modular Flask + Next.js full-stack setup  

---

## 🔗 Useful Links
- Backend: [http://localhost:5000](http://localhost:5000)
- Swagger UI: [http://localhost:5000/apidocs](http://localhost:5000/apidocs)
- Frontend: [http://localhost:3000](http://localhost:3000)

---

## 📄 License
This project is for educational purposes as part of a **Full Stack Developer Task** — demonstrating RTSP video streaming and overlay management using modern web technologies.
