# 💚 SafeLife Pro

> Real-time medical monitoring app for diabetic and cardiac patients, powered by Firebase + Groq (Llama-class open models).

**Live demo:** https://safelife-pro-4ygl.vercel.app/

## 🩺 Le projet

SafeLife Pro est né lors du hackathon **MIATHON 2026**, en réponse à un problème de santé publique concret au Maroc :

- **2,7 millions de Marocains** vivent avec le diabète, dont environ 50% non diagnostiqués.
- **38% des décès** au Maroc sont causés par des maladies cardiovasculaires — 1ère cause de mortalité.
- Les solutions existantes (Apple Watch, FreeStyle Libre) coûtent entre 700 et 7 000 DH, hors de portée de la majorité des ménages marocains.

**Problématique :** comment prévenir un accident grave — voire mortel — quand une personne perd soudainement conscience (diabète, arrêt cardiaque, malaise), qu'elle soit seule chez elle, dans la rue ou au volant, sans que personne ne soit alerté à temps ?

### La solution : un système à trois couches

| Couche | Rôle |
|---|---|
| 🩹 **Patch glycémie** | Mesure continue du glucose, jusqu'à 14 jours d'autonomie, transmission BLE en temps réel |
| ⌚ **Bracelet connecté** | Rythme cardiaque, oxygène sanguin (SpO2), géolocalisation GPS, alertes vibration |
| 📱 **Application mobile (ce dépôt)** | Reçoit les données des appareils, les analyse via IA, déclenche les alertes vers proches/médecin/secours |

**Ce dépôt contient la couche application** : elle se connecte aux appareils via Bluetooth Low Energy (BLE), stocke l'historique sur Firebase, et utilise un modèle IA (Groq) pour l'analyse et les alertes prédictives. Le patch et le bracelet sont le matériel physique du projet (prototype hackathon, ~700 DH), non inclus dans ce repo logiciel.

---

## 📡 Connexion aux appareils (Bluetooth BLE)

L'app se connecte aux capteurs (bracelet, patch) via l'[API Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API), directement depuis le navigateur, sans application native.

- Menu → **Bluetooth Devices** → **Connect Device** ouvre le sélecteur natif du navigateur.
- Services GATT supportés : `heart_rate`, `glucose`, `battery_service`, `device_information`.
- Une fois connecté, les données réelles remplacent les valeurs simulées affichées par défaut.

**Support navigateur :** Chrome, Edge et Opera (desktop/Android) uniquement — Web Bluetooth n'est pas supporté sur Safari ni Firefox (limitation du navigateur, pas un bug de l'app).

> Aucun appareil physique n'est nécessaire pour tester l'app : le dashboard affiche des biométriques simulées réalistes par défaut, pour que chaque fonctionnalité (y compris l'assistant IA) reste testable sans matériel.

---

## ✨ Features

### 🔐 Authentication
Firebase Auth — register / login / logout.

![Login](screenshots/login.png)


### 📊 Live Biometric Dashboard
Heart rate, glucose, SpO2, blood pressure — updated in real time.

![Dashboard](screenshots/dashboard.png)

### 🤖 AI Medical Assistant
Groq (`openai/gpt-oss-20b`) analyzes your real biometric data and answers health questions.

![AI Assistant](screenshots/ai-chat.png)

### 🚨 Emergency SOS
Auto-detects critical values and triggers a countdown alert. Once the countdown ends, the app automatically opens WhatsApp with a pre-filled message containing the patient's vitals and GPS location, sent to the configured emergency contact.

![SOS Alert](screenshots/sos.png)
![WhatsApp emergency message](screenshots/whatsapp-alert.png)

![SOS Alert](screenshots/sos.png)

### 👤 Medical Profile
Blood group, diabetes type, medications, emergency contact.

![Medical Profile](screenshots/profile.png)

### 📈 Health History
Timeline of past readings saved to Firestore.

![Health History](screenshots/history.png)

---

## 🛠️ Tech stack

**Architecture serverless — pas de backend dédié.** Pas de serveur Express/Django à maintenir : Firebase joue le rôle de backend-as-a-service (auth + base de données), et une fonction serverless Vercel gère le seul besoin de logique côté serveur (cacher la clé API Groq).

| Couche | Technologie | Rôle |
|---|---|---|
| Frontend | React 18 (Create React App) | Interface utilisateur |
| Auth + Database | Firebase Auth + Firestore | Backend-as-a-service — gère comptes, sessions, stockage des données médicales |
| Logique serveur | `api/chat.js` (fonction serverless Vercel) | Seul point où du code tourne côté serveur : proxy sécurisé vers Groq, garde la clé API secrète |
| IA | Groq API (`openai/gpt-oss-20b`) | Analyse des biométriques, assistant conversationnel |
| Hébergement | Vercel | Build statique + exécution de la fonction serverless |

---

## 🚀 Run it in under 2 minutes

```bash
git clone https://github.com/ghizlanebelaid23-coder/-safelife-pro.git
cd -safelife-pro
npm install
cp .env.example .env    # then fill in the values, see below
npm start                # http://localhost:3000
```

Note: `npm start` only runs the React frontend. The `/api/chat` route is a Vercel serverless function and won't respond locally under plain `npm start` — use `vercel dev` instead, or just deploy (below).

### Getting your keys

| Variable | Where to get it |
|---|---|
| `REACT_APP_FIREBASE_*` | [Firebase console](https://console.firebase.google.com) → Project settings → your web app config |
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) — free tier, no credit card. **Must start with `gsk_`.** |

`GROQ_API_KEY` is **not** prefixed with `REACT_APP_` on purpose — that prefix tells Create React App to bundle a value into the public JS. This key is only read server-side (`api/chat.js`), so it must stay unprefixed and secret.

---

## ☁️ Deploy to Vercel

1. Push this repo to your own GitHub account.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Before deploying, add every variable from `.env.example` under **Environment Variables**.
4. Deploy. Any future `git push` to `main` redeploys automatically.

---

## ⚠️ Known limitations (free-tier services)

- **Groq rate limits.** The free tier caps requests per minute/day (~30 requests/minute). Rapid bursts return an HTTP `429`; the app shows a clear message and it resolves itself within a minute. Normal usage never comes close to this limit.
- **Groq's model catalog changes.** Groq periodically deprecates older models. If the AI assistant fails with a "model decommissioned" error, check [console.groq.com/docs/models](https://console.groq.com/docs/models) and update the `model` field in `src/App.jsx`.
- **Firebase and Vercel free tiers don't expire**, but do have usage quotas. A portfolio-scale demo won't come close to hitting them.

---

## 📁 Project structure
-safelife-pro/
├── api/
│ └── chat.js ← serverless proxy to Groq (keeps the API key server-side)
├── public/
│ └── index.html
├── src/
│ ├── App.jsx 
│ ├── firebase.js
│ └── index.js 
├── screenshots/
├── .env.example
├── .gitignore
├── LICENSE
├── package.json
├── package-lock.json
└── README.md
## 🏆 Origin

Built as a team project during the **Miathon** hackathon. 

## 📄 License

This project is licensed under the [MIT License](LICENSE).
