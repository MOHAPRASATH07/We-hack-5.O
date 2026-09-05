# 🛡️ Quiet Command — Offline AI Emergency Copilot

> A phone-first, offline emergency copilot that turns real camera, microphone, and motion signals into an inspectable risk recommendation — without pretending uncertain evidence is certain, and without allowing a machine recommendation to become a final action without a human.

---

## 🏆 Built for WE-Hack 5.0

**Team:** MOHAPRASATH07 & Pragadeeshgovind  
**Track:** AI for Social Good / Emergency Response  
**Theme:** Offline-first safety decision support

---

## 📱 What It Does

Quiet Command runs entirely on your phone browser — no cloud, no backend, no internet required after the first load.

It fuses three real phone sensors into a transparent, explainable risk score:

| Sensor | What it reads | How |
|---|---|---|
| 📷 Camera | Person detection | TensorFlow.js COCO-SSD model, runs locally in browser |
| 🎙️ Microphone | Audio energy (RMS) | Web Audio API, no audio is recorded or sent |
| 📳 Motion | Acceleration spikes | DeviceMotionEvent, real accelerometer data |

The app combines sensor readings with operator observations (smoke seen, alarm heard, blocked exits) to produce a **LOW / ELEVATED / HIGH** risk assessment with full reasoning visible to the user.

---

## ✨ Key Features

- **100% Offline** — PWA with service worker cache. Works after network drops.
- **On-device AI** — TensorFlow.js person detection runs inside the browser, no server needed.
- **Explainable Risk Engine** — Every risk score shows exact reasons, confidence, and data source.
- **Human Confirmation Gate** — High-risk actions require a deliberate 1.7s press-and-hold. No accidental machine finalization.
- **Rehearsal Mode** — Clearly labeled simulated cues for stage demos without faking live sensor data.
- **Evidence Trace** — Full structured JSON export of every assessment for audit and review.
- **Honest Boundaries** — Unavailable sensors are shown as unavailable, never silently simulated.

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- pnpm

```bash
npm install -g pnpm
```

### Install & Run

```bash
# Clone the repo
git clone https://github.com/MOHAPRASATH07/We-hack-5.O.git
cd We-hack-5.O

# Install dependencies
pnpm install

# Start dev server
pnpm run dev
```

Open `http://localhost:3000` in your browser.

---

## 📲 Running on a Real Phone (Sensors Need HTTPS)

Camera, microphone, and motion sensors require HTTPS on mobile browsers.

**Step 1 — Find your PC's local IP:**
```bash
ipconfig
# Look for IPv4 Address e.g. 192.168.1.5
```

**Step 2 — Generate a local SSL certificate:**
```bash
npm install -g mkcert
npx mkcert create-ca
npx mkcert create-cert --domains localhost,192.168.1.5
rename cert.key localhost-key.pem
rename cert.crt localhost.pem
```

**Step 3 — Run and open on phone:**
```bash
pnpm run dev
# Open https://192.168.1.5:3000 on your phone
# Tap "Advanced → Proceed" on the certificate warning
```

---

## 🏗️ Architecture

```
Phone camera     →  Local vision cue (TensorFlow.js COCO-SSD)
Phone microphone →  Local audio energy (Web Audio API)
DeviceMotionEvent→  Motion spike detection
Operator cues    →  Structured signal ledger
                         ↓
                  Explainable risk rules
                         ↓
                  Local explanation layer
                         ↓
                  Human confirmation gate (hold 1.7s)
                         ↓
                  Local incident record (localStorage)
```

Signals become structured records first. The rules engine consumes those records, not raw media. The explanation layer consumes the rules output. The human gate is the only path that marks a recommendation as final.

---

## 🗂️ Project Structure

```
offlines/
├── client/
│   ├── src/
│   │   ├── components/     # UI components (shadcn/ui)
│   │   ├── hooks/
│   │   │   └── useEmergencySensors.ts  # Camera, mic, motion logic
│   │   ├── lib/
│   │   │   └── emergency.ts            # Risk engine & assessment
│   │   └── pages/
│   │       └── Home.tsx                # Main incident rail UI
│   └── public/
│       ├── sw.js                       # Service worker (offline cache)
│       └── manifest.webmanifest        # PWA manifest
├── server/
│   └── index.ts            # Express server (for production)
├── shared/
│   └── const.ts
└── vite.config.ts
```

---

## 🧠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI |
| AI / Vision | TensorFlow.js + COCO-SSD |
| Routing | Wouter |
| Build Tool | Vite 7 |
| Package Manager | pnpm |
| PWA | Service Worker + Web App Manifest |
| Server | Express (production only) |

---

## 🔒 Privacy & Safety Design

- No audio, video, or sensor data ever leaves the device
- No cloud AI API calls on the core decision path
- Camera frames are processed in-memory only — never stored
- All risk decisions are explainable and auditable via JSON trace
- Machine recommendations are never final without human confirmation

---

## 🎭 Rehearsal Mode

For demos where hardware permissions are unavailable on stage:

1. Toggle **Rehearsal Mode** in the app
2. All sensor cards show `REHEARSAL` label — never pretending to be live
3. The same fusion and risk engine runs on rehearsal cues
4. Turn it off to return to real sensor readings

---

## 📦 Build for Production

```bash
pnpm run build
# Output: dist/public (frontend) + dist/index.js (server)

node dist/index.js
```

---

## 🗺️ Roadmap

| Stage | Upgrade |
|---|---|
| Hackathon | One PWA, one phone, browser-local model, local rules |
| Pilot | IndexedDB for incident records, model versioning, smoke adapter |
| Campus rollout | Device enrollment, role-based confirmation, replayable logs |
| Production | Edge gateway sync, signed model artifacts, privacy retention rules |

---

## 📄 License

MIT — built with ❤️ for WE-Hack 5.0
