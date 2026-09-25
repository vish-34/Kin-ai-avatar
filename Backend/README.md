# KIN AI — Production Node.js + Express Backend

Production-ready backend for the **KIN AI Living Avatar & Memory System**.

---

## 1. Architectural Highlights

- **Express REST API (`src/server.js`, `src/app.js`)**: Modern Node.js/Express service orchestrating authentication, beta moderation, consent verification, and dialogue streaming.
- **CloneLLM Black-Box Preservation (`python/clone_service/`)**: Exact byte-for-byte preservation of the working Python CloneLLM intelligence, RAG memory retrieval (`all-MiniLM-L6-v2`), epistemic anti-hallucination safeguards, and conversational rules.
- **MongoDB Atlas Persistence (`src/models/`)**: Persistent storage for `User`, `Kin`, `Memory`, `Conversation`, `Message`, `Consent`, `BetaApplication`, `Feedback`, and `AnalyticsEvent`.
- **ElevenLabs Speech Synthesis (`src/services/elevenLabsService.js`)**: Replaces prototype Colab OmniVoice with commercial streaming TTS and instant voice cloning.
- **HeyGen Streaming Avatar (`src/services/heygenService.js`)**: Replaces prototype Colab MuseTalk with commercial interactive streaming avatar sessions and WebRTC streaming.
- **Binary Media Abstraction (`src/config/storage.js`)**: Dedicated storage management for audio, video, and portrait files.
- **Zero Drift Verified**: 100% pass on CloneLLM regression test suite and 26/26 end-to-end integration tests.

---

## 2. Directory Layout

```
Backend/
├── src/
│   ├── server.js                        # HTTP server bootstrap
│   ├── app.js                           # Express application & middleware
│   ├── config/
│   │   ├── env.js                       # Environment validation
│   │   ├── database.js                  # MongoDB Atlas Mongoose connection
│   │   └── storage.js                   # Media & file storage abstraction
│   ├── models/                          # Mongoose Schemas (User, Kin, Memory, ...)
│   ├── middleware/                      # Auth (JWT), error handler, validation
│   ├── controllers/                     # Endpoint controllers
│   ├── routes/                          # Express route definitions
│   └── services/                        # Service adapters (CloneLLM, ElevenLabs, HeyGen)
├── python/
│   └── clone_service/
│       ├── clone_engine.py              # Preserved CloneLLM engine (unmodified)
│       ├── loader.py                    # Preserved loader (unmodified)
│       ├── internal_server.py           # FastAPI microservice wrapper (port 5001)
│       └── requirements.txt             # Python dependencies
├── tests/
│   ├── regression_clonellm.py           # Dual-runner behavioral regression test
│   └── run_all_tests.js                 # Complete E2E integration test suite
├── Dockerfile                           # Production multi-stage Dockerfile
├── render.yaml                          # Render deployment blueprint
├── package.json
└── .env.example
```

---

## 3. Environment Variables

Copy `.env.example` to `.env`:

```bash
PORT=8008
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173

MONGODB_URI=mongodb://127.0.0.1:27017/kin_ai

JWT_SECRET=your_jwt_secret_key_32chars_long
JWT_EXPIRES_IN=7d

PYTHON_SERVICE_URL=http://127.0.0.1:5001

GROQ_API_KEY=your_groq_api_key

ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

HEYGEN_API_KEY=your_heygen_key
HEYGEN_AVATAR_ID=default
```

---

## 4. Local Development

### Prerequisites
- Node.js >= 18
- Python >= 3.10
- MongoDB Atlas or local MongoDB instance

### Step 1: Start Python CloneLLM Microservice (Port 5001)
```bash
cd Backend/python/clone_service
python internal_server.py
```

### Step 2: Start Express API Server (Port 8008)
```bash
cd Backend
npm start
```

### Step 3: Run Automated Test Suites
```bash
# Run CloneLLM Behavioral Regression Test
python tests/regression_clonellm.py

# Run Complete End-to-End Integration Suite (26 tests)
node tests/run_all_tests.js
```

---

## 5. Deployment on Render

This service includes a unified `Dockerfile` and `render.yaml` for zero-configuration deployment on Render:
1. Connect your GitHub repository to Render.
2. Choose **Web Service** using the included `Dockerfile` or use **Blueprints** referencing `render.yaml`.
3. Provide your `MONGODB_URI`, `GROQ_API_KEY`, `ELEVENLABS_API_KEY`, and `HEYGEN_API_KEY` in Render environment variables.
4. Render will build both Node and Python runtimes in a multi-stage container and expose the `/api/health` endpoint.
