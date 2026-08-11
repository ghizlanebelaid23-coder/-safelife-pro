# 💚 SafeLife Pro

> Real-time medical monitoring app for diabetic and cardiac patients, powered by Firebase + Groq (Llama 3).

**Live demo:** _add your deployed Vercel URL here_
**Screenshot:** _add a screenshot/GIF here — see note in "Contributing" below_

---

## ✨ Features

- 🔐 Firebase Auth — register / login / logout
- 🗄️ Firestore — saves medical profile + readings
- 📊 Live biometric dashboard — heart rate, glucose, SpO2, blood pressure
- 🤖 AI medical assistant — Llama 3 via Groq analyzes real biometric data
- 🚨 Emergency SOS — auto-detects critical values, countdown alert
- 📈 Health history timeline
- 👤 Medical profile — blood group, diabetes type, medications, emergency contact

## 🛠️ Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Create React App) |
| Auth / DB | Firebase Auth + Firestore |
| AI | Groq API, model `llama3-8b-8192` (proxied through `api/chat.js`) |
| Hosting | Vercel (static frontend + serverless function) |

> Earlier versions of this README said "Google Gemini" — that was inaccurate.
> The app has always called Groq's API, not Google's. Fixed here for honesty.

---

## 🚀 Run it in under 2 minutes

```bash
git clone https://github.com/ghizlanebelaid23-coder/safelife-pro.git
cd safelife-pro
npm install
cp .env.example .env    # then fill in the values, see below
npm start                # http://localhost:3000
```

No Docker, no manual database setup, no dependency wrangling — `npm install && npm start` is the whole flow.

### Getting your keys

| Variable | Where to get it |
|---|---|
| `REACT_APP_FIREBASE_*` | [Firebase console](https://console.firebase.google.com) → Project settings → your web app config |
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) — free tier available. **Must start with `gsk_`.** A Google Gemini key (`AIzaSy...`) will NOT work here — different provider, different auth. |

`GROQ_API_KEY` is deliberately **not** prefixed with `REACT_APP_`: that prefix tells Create React App to bundle the value into the public JS. This key is only ever read server-side, in `api/chat.js`, so it must stay unprefixed and secret.

---

## 🐳 Docker (frontend only)

```bash
docker build -t safelife-pro .
docker run -p 3000:3000 safelife-pro
```

This packages the static frontend build. The `/api/chat` AI proxy is a Vercel serverless function and does not run inside this container — for a fully self-contained Docker setup you'd add a small Express server exposing that same route. For local dev with the AI assistant working, use `npm start` + `vercel dev`, or deploy to Vercel directly (below).

## ☁️ Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Then in **Project Settings → Environment Variables**, add every variable from `.env.example` (your local `.env` is gitignored and never reaches Vercel automatically — this step is required, not optional).

---

## 📁 Project structure

```
safelife-pro/
├── api/
│   └── chat.js       ← serverless proxy to Groq (keeps the API key server-side)
├── public/
│   └── index.html
├── src/
│   ├── App.jsx        ← screens + app logic
│   ├── firebase.js    ← Firebase config
│   └── index.js        ← React entry point
├── Dockerfile
├── .env.example
├── .gitignore
└── README.md
```

## Contributing / portfolio note

If you're sharing this as a portfolio project: include a live demo link and 2–3 screenshots or a short GIF above. A reviewer should be able to see the product working in 30 seconds without cloning, installing, or debugging anything.

---

## 👩‍💻 Author

**Ghizlane Belaïd** — [@ghizlanebelaid23-coder](https://github.com/ghizlanebelaid23-coder)
