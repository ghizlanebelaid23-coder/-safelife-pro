import { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const G = {
  bg: "#050d1a",
  surface: "#0a1628",
  card: "#0e1e35",
  border: "#1a3050",
  accent: "#00c8ff",
  accentDim: "#00c8ff22",
  danger: "#ff2d55",
  warning: "#ff9f0a",
  success: "#30d158",
  text: "#e8f4ff",
  muted: "#6b8aad",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #root { height:100%; }
  body { font-family:'Syne',sans-serif; background:${G.bg}; color:${G.text}; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:#0a1628; }
  ::-webkit-scrollbar-thumb { background:#1a3050; border-radius:2px; }

  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(.97)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes heartbeat { 0%{transform:scale(1)} 14%{transform:scale(1.15)} 28%{transform:scale(1)} 42%{transform:scale(1.1)} 70%{transform:scale(1)} }
  @keyframes urgent { 0%,100%{background:#ff2d5510} 50%{background:#ff2d5525} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes scanPulse { 0%{transform:scale(1);opacity:1} 100%{transform:scale(2.5);opacity:0} }
  @keyframes ripple { 0%{transform:scale(0.8);opacity:1} 100%{transform:scale(2);opacity:0} }
  @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes countDown { from{stroke-dashoffset:0} to{stroke-dashoffset:283} }

  .screen { position:absolute; inset:0; overflow-y:auto; animation:fadeIn .3s ease; }
  .btn-primary {
    background:linear-gradient(135deg,#00c8ff,#0080ff); color:#fff; border:none;
    border-radius:10px; padding:14px 24px; font-family:'Syne',sans-serif;
    font-size:15px; font-weight:700; cursor:pointer; transition:all .25s; width:100%;
  }
  .btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 24px #00c8ff44; }
  .btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none; }
  .btn-outline {
    background:transparent; color:${G.accent}; border:1.5px solid ${G.accent}40;
    border-radius:10px; padding:13px 24px; font-family:'Syne',sans-serif;
    font-size:15px; font-weight:600; cursor:pointer; transition:all .25s; width:100%;
  }
  .btn-outline:hover { border-color:${G.accent}; background:${G.accentDim}; }
  .btn-danger {
    background:linear-gradient(135deg,#ff2d55,#c20028); color:#fff; border:none;
    border-radius:10px; padding:14px 24px; font-family:'Syne',sans-serif;
    font-size:15px; font-weight:700; cursor:pointer; transition:all .25s; width:100%;
  }
  .input-field {
    background:#0a1628; border:1.5px solid #1a3050; border-radius:10px;
    color:${G.text}; font-family:'Syne',sans-serif; font-size:14px;
    padding:12px 16px; width:100%; outline:none; transition:border .25s;
  }
  .input-field:focus { border-color:${G.accent}; box-shadow:0 0 0 3px ${G.accentDim}; }
  .card {
    background:${G.card}; border:1px solid ${G.border}; border-radius:16px; padding:20px;
  }
  .nav-tab {
    display:flex; flex-direction:column; align-items:center; gap:5px;
    padding:10px 16px; border-radius:12px; cursor:pointer; transition:all .25s;
    border:none; background:transparent; color:${G.muted}; font-family:'Syne',sans-serif;
    font-size:11px; font-weight:600; letter-spacing:.5px;
  }
  .nav-tab.active { color:${G.accent}; background:${G.accentDim}; }
  .tag { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
  .tag-normal { background:#30d15822; color:#30d158; border:1px solid #30d15840; }
  .tag-warning { background:#ff9f0a22; color:#ff9f0a; border:1px solid #ff9f0a40; }
  .tag-danger { background:#ff2d5522; color:#ff2d55; border:1px solid #ff2d5540; animation:blink 1s infinite; }
`;

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const icons = {
    heart: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    activity: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    droplet: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>,
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    bot: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 15h.01M16 15h.01"/></svg>,
    home: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
    eye: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    send: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    alert: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    phone: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10.4a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.59 0h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 5.95 5.95l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 14.92v2z"/></svg>,
    watch: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="7"/><path d="M12 6v6l4 2"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  };
  return icons[name] || null;
};

// ─── SPARKLINE ───────────────────────────────────────────────────────────────
const Sparkline = ({ data, color, height = 50 }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const w = 200, h = height;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g${color.replace("#","")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#g${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── PREDICTION ENGINE — anticipe les risques ────────────────────────────────
function predictRisk(history, profile) {
  if (history.length < 10) return { level: "none", message: "", eta: null };
  const recent = history.slice(-10);
  const hrValues = recent.map(h => h.hr);
  const glValues = recent.map(h => h.gl);
  const slope = (arr) => {
    const n = arr.length;
    const sumX = n * (n - 1) / 2;
    const sumY = arr.reduce((a, b) => a + b, 0);
    const sumXY = arr.reduce((s, v, i) => s + i * v, 0);
    const sumX2 = arr.reduce((s, _, i) => s + i * i, 0);
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  };
  const hrSlope = slope(hrValues);
  const glSlope = slope(glValues);
  const lastHr = hrValues[hrValues.length - 1];
  const lastGl = glValues[glValues.length - 1];
  const futureHr = lastHr + hrSlope * 30;
  const futureGl = lastGl + glSlope * 30;
  const isDiabetic = profile?.diabetesType && profile.diabetesType !== "None";
  const glDangerHigh = isDiabetic ? 200 : 250;
  const glWarnHigh = isDiabetic ? 150 : 180;
  if (futureHr > 130 || futureHr < 45 || futureGl > glDangerHigh || futureGl < 60) {
    const mins = Math.max(5, Math.round(15 - Math.abs(hrSlope) * 10));
    return {
      level: "danger",
      message: futureHr > 130 ? `Tachycardie prédite (~${Math.round(futureHr)} BPM)` :
               futureGl > glDangerHigh ? `Hyperglycémie prédite (~${Math.round(futureGl)} mg/dL)` :
               futureGl < 60 ? `Hypoglycémie prédite (~${Math.round(futureGl)} mg/dL)` :
               `Bradycardie prédite (~${Math.round(futureHr)} BPM)`,
      eta: mins
    };
  }
  if (futureHr > 110 || futureHr < 55 || futureGl > glWarnHigh || futureGl < 80) {
    return {
      level: "warning",
      message: futureHr > 110 ? `FC en hausse → ${Math.round(futureHr)} BPM prédit` :
               futureGl > glWarnHigh ? `Glycémie en hausse → ${Math.round(futureGl)} mg/dL prédit` :
               `Valeurs en baisse — surveiller`,
      eta: 15
    };
  }
  return { level: "none", message: "", eta: null };
}

// ─── BIOMETRICS HOOK ─────────────────────────────────────────────────────────
function useBiometrics(userId, profile) {
  const [data, setData] = useState({
    heartRate: 72, glucose: 105, spo2: 98, systolic: 120, diastolic: 80,
    steps: 4230, temp: 36.7, riskLevel: "normal", history: [],
    prediction: { level: "none", message: "", eta: null },
  });

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      setData(prev => {
        const hr = Math.max(40, Math.min(180, Math.round(prev.heartRate + (Math.random() - 0.48) * 6)));
        const gl = Math.max(50, Math.min(400, Math.round(prev.glucose + (Math.random() - 0.47) * 8)));
        let risk = "normal";
        if (hr > 130 || hr < 45 || gl > 250 || gl < 60) risk = "danger";
        else if (hr > 110 || hr < 55 || gl > 180 || gl < 80) risk = "warning";
        const snap = { time: new Date().toLocaleTimeString(), hr, gl, risk };
        const newHistory = [...prev.history, snap].slice(-60);
        const prediction = predictRisk(newHistory, profile);
        if (prev.history.length % 10 === 0 && userId) {
          addDoc(collection(db, "users", userId, "readings"), {
            ...snap, timestamp: serverTimestamp()
          }).catch(() => {});
        }
        return { ...prev, heartRate: hr, glucose: gl, riskLevel: risk, history: newHistory, prediction };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [userId, profile]);

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ═══════════════════════════════════════════════════════════════════════════
const SplashScreen = ({ onDone }) => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1100);
    const t3 = setTimeout(() => onDone(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div style={{ position: "fixed", inset: 0, background: G.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${G.border}22 1px, transparent 1px), linear-gradient(90deg, ${G.border}22 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #00c8ff12 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />

      <div style={{ textAlign: "center", opacity: phase >= 1 ? 1 : 0, animation: phase >= 1 ? "slideUp .8s ease forwards" : "none", position: "relative" }}>
        <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 32px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${G.accent}30` }} />
          <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: `2px solid ${G.accent}70`, animation: "spin 3s linear infinite" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ animation: "heartbeat 1.5s infinite" }}>
              <Icon name="heart" size={44} color={G.accent} />
            </div>
          </div>
        </div>

        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: 3, color: G.text }}>
          SAFE<span style={{ color: G.accent }}>LIFE</span>
        </div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: G.muted, letterSpacing: 4, marginTop: 8 }}>
          YOUR HEALTH, OUR PRIORITY
        </div>

        {phase >= 2 && (
          <div style={{ marginTop: 40, display: "flex", gap: 24, justifyContent: "center", animation: "slideUp .6s ease" }}>
            {[{ icon: "watch", label: "Smart Bracelet" }, { icon: "shield", label: "AI Protection" }, { icon: "heart", label: "Real-time Care" }].map(item => (
              <div key={item.label} style={{ textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: G.accentDim, border: `1px solid ${G.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                  <Icon name={item.icon} size={22} color={G.accent} />
                </div>
                <div style={{ fontSize: 10, color: G.muted, fontWeight: 600, letterSpacing: 1 }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 48, width: 200, height: 2, background: G.border, borderRadius: 1, margin: "48px auto 0", overflow: "hidden" }}>
          <div style={{ height: "100%", background: `linear-gradient(90deg, ${G.accent}, #0080ff)`, width: phase >= 2 ? "100%" : "30%", transition: "width 1.8s ease" }} />
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
const LoginScreen = ({ onRegister }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handle = async () => {
    if (!email || !pass) { setErr("Please fill all fields."); return; }
    setLoading(true); setErr("");
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      setErr(e.code === "auth/invalid-credential" ? "Email ou mot de passe incorrect." : "Connexion échouée. Réessayez.");
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!resetEmail) { setResetMsg("Entrez votre email."); return; }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMsg("✅ Email envoyé ! Vérifiez votre boîte mail pour réinitialiser votre mot de passe.");
    } catch (e) {
      setResetMsg("❌ Email introuvable. Vérifiez l'adresse.");
    }
    setResetLoading(false);
  };

  if (showReset) return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${G.border}22 1px, transparent 1px), linear-gradient(90deg, ${G.border}22 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
      <div style={{ width: "100%", maxWidth: 400, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 16, background: G.accentDim, border: `1.5px solid ${G.accent}60`, marginBottom: 20 }}>
            <Icon name="shield" size={28} color={G.accent} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>Mot de passe oublié</div>
          <div style={{ color: G.muted, fontSize: 13, marginTop: 6 }}>Entrez votre email pour recevoir un lien de réinitialisation</div>
        </div>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: G.muted, fontWeight: 600, letterSpacing: 1, display: "block", marginBottom: 8 }}>EMAIL ADDRESS</label>
            <input className="input-field" type="email" placeholder="you@example.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleReset()} />
          </div>
          {resetMsg && (
            <div style={{ color: resetMsg.startsWith("✅") ? G.success : G.danger, fontSize: 13, background: resetMsg.startsWith("✅") ? "#30d15815" : "#ff2d5515", padding: 12, borderRadius: 8, lineHeight: 1.5 }}>
              {resetMsg}
            </div>
          )}
          <button className="btn-primary" onClick={handleReset} disabled={resetLoading}>
            {resetLoading ? "Envoi en cours..." : "📧 Envoyer le lien"}
          </button>
          <button className="btn-outline" onClick={() => setShowReset(false)}>← Retour à la connexion</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${G.border}22 1px, transparent 1px), linear-gradient(90deg, ${G.border}22 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
      <div style={{ width: "100%", maxWidth: 400, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 16, background: G.accentDim, border: `1.5px solid ${G.accent}60`, marginBottom: 20 }}>
            <Icon name="heart" size={28} color={G.accent} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>Welcome Back</div>
          <div style={{ color: G.muted, fontSize: 13, marginTop: 6 }}>Sign in to your <span style={{ color: G.accent }}>SafeLife</span> account</div>
        </div>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: G.muted, fontWeight: 600, letterSpacing: 1, display: "block", marginBottom: 8 }}>EMAIL ADDRESS</label>
            <input className="input-field" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: G.muted, fontWeight: 600, letterSpacing: 1, display: "block", marginBottom: 8 }}>PASSWORD</label>
            <div style={{ position: "relative" }}>
              <input className="input-field" type={showPass ? "text" : "password"} placeholder="Your password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} style={{ paddingRight: 44 }} />
              <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                <Icon name="eye" size={16} color={G.muted} />
              </button>
            </div>
          </div>
          <button onClick={() => setShowReset(true)} style={{ background: "none", border: "none", color: G.accent, fontSize: 13, cursor: "pointer", textAlign: "right", padding: 0, marginTop: -8 }}>
            Mot de passe oublié ?
          </button>
          {err && <div style={{ color: G.danger, fontSize: 13, textAlign: "center", background: "#ff2d5515", padding: "10px", borderRadius: 8 }}>{err}</div>}
          <button className="btn-primary" onClick={handle} disabled={loading}>
            {loading ? "Connexion..." : "Sign In"}
          </button>
          <div style={{ textAlign: "center", color: G.muted, fontSize: 13 }}>Don't have an account?</div>
          <button className="btn-outline" onClick={onRegister}>Create Account</button>
        </div>
        <div style={{ textAlign: "center", marginTop: 20, color: G.muted, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Icon name="shield" size={12} color={G.muted} /> End-to-end medical encryption
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// REGISTER SCREEN — fixed focus bug (each field has its own useState)
// ═══════════════════════════════════════════════════════════════════════════
const RegisterScreen = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [agreed, setAgreed] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Step 2
  const [diabetesType, setDiabetesType] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [medHistory, setMedHistory] = useState("");
  const [medications, setMedications] = useState("");
  const [allergies, setAllergies] = useState("");

  // Step 3
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const iStyle = { background: G.surface, border: `1.5px solid ${G.border}`, borderRadius: 10, color: G.text, fontFamily: "'Syne',sans-serif", fontSize: 14, padding: "12px 16px", width: "100%", outline: "none", marginBottom: 14, boxSizing: "border-box" };
  const lStyle = { fontSize: 11, color: G.muted, fontWeight: 600, letterSpacing: 1, display: "block", marginBottom: 6 };

  const handleSubmit = async () => {
    if (!agreed) { setErr("Please accept the terms."); return; }
    if (password !== confirm) { setErr("Passwords don't match."); return; }
    setLoading(true); setErr("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        name, age, gender, phone, email,
        diabetesType, bloodGroup, medHistory, medications, allergies,
        emergencyContact, emergencyPhone,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      setErr(e.code === "auth/email-already-in-use" ? "Email already used." : "Registration failed: " + e.message);
      setLoading(false);
    }
  };

  const titles = ["Personal Info", "Medical Profile", "Emergency Contact"];

  return (
    <div className="screen" style={{ padding: 24 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingTop: 20, paddingBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <button onClick={step === 1 ? onBack : () => setStep(s => s - 1)} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", color: G.text, fontSize: 18 }}>←</button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Create Account</div>
            <div style={{ fontSize: 12, color: G.muted }}>Step {step} of 3 — {titles[step - 1]}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? G.accent : G.border, transition: "background .3s" }} />
          ))}
        </div>

        <div className="card">
          {step === 1 && <>
            <label style={lStyle}>FULL NAME</label>
            <input style={iStyle} type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
            <label style={lStyle}>AGE</label>
            <input style={iStyle} type="number" placeholder="25" value={age} onChange={e => setAge(e.target.value)} />
            <label style={lStyle}>GENDER</label>
            <select style={{...iStyle, appearance:"none"}} value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">Select...</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
            <label style={lStyle}>PHONE</label>
            <input style={iStyle} type="tel" placeholder="+213 ..." value={phone} onChange={e => setPhone(e.target.value)} />
            <label style={lStyle}>EMAIL</label>
            <input style={iStyle} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            <label style={lStyle}>PASSWORD</label>
            <input style={iStyle} type="password" placeholder="Secure password" value={password} onChange={e => setPassword(e.target.value)} />
            <label style={lStyle}>CONFIRM PASSWORD</label>
            <input style={{...iStyle, marginBottom:0}} type="password" placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </>}

          {step === 2 && <>
            <label style={lStyle}>DIABETES TYPE</label>
            <select style={{...iStyle, appearance:"none"}} value={diabetesType} onChange={e => setDiabetesType(e.target.value)}>
              <option value="">Select...</option>
              <option>Type 1</option><option>Type 2</option><option>Gestational</option><option>None</option>
            </select>
            <label style={lStyle}>BLOOD GROUP</label>
            <select style={{...iStyle, appearance:"none"}} value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
              <option value="">Select...</option>
              {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b => <option key={b}>{b}</option>)}
            </select>
            <label style={lStyle}>MEDICAL HISTORY</label>
            <input style={iStyle} type="text" placeholder="Hypertension, cardiac issues..." value={medHistory} onChange={e => setMedHistory(e.target.value)} />
            <label style={lStyle}>CURRENT MEDICATIONS</label>
            <input style={iStyle} type="text" placeholder="Insulin, Metformin..." value={medications} onChange={e => setMedications(e.target.value)} />
            <label style={lStyle}>ALLERGIES</label>
            <input style={{...iStyle, marginBottom:0}} type="text" placeholder="Penicillin, latex..." value={allergies} onChange={e => setAllergies(e.target.value)} />
          </>}

          {step === 3 && <>
            <label style={lStyle}>EMERGENCY CONTACT NAME</label>
            <input style={iStyle} type="text" placeholder="Jane Doe" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} />
            <label style={lStyle}>EMERGENCY PHONE</label>
            <input style={iStyle} type="tel" placeholder="+213 ..." value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} />
            <div style={{ background: G.accentDim, border: `1px solid ${G.accent}40`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.6 }}>By creating an account, you agree to SafeLife Terms of Service. Your medical data is encrypted and protected.</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, cursor: "pointer" }} onClick={() => setAgreed(!agreed)}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${agreed ? G.accent : G.border}`, background: agreed ? G.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s", flexShrink: 0 }}>
                  {agreed && <Icon name="check" size={12} color="#fff" />}
                </div>
                <span style={{ fontSize: 13 }}>I accept the Terms and Conditions</span>
              </div>
            </div>
            {err && <div style={{ color: G.danger, fontSize: 13, textAlign: "center", background: "#ff2d5515", padding: 10, borderRadius: 8, marginBottom: 12 }}>{err}</div>}
          </>}

          <button className="btn-primary" style={{ marginTop: 16 }} disabled={loading}
            onClick={() => step < 3 ? setStep(s => s + 1) : handleSubmit()}>
            {loading ? "Creating account..." : step < 3 ? "Continue →" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB — with Demo Mode + Prediction
// ═══════════════════════════════════════════════════════════════════════════
const DashboardTab = ({ bio, profile, onEmergency, bleConnected }) => {
  const riskColor = bio.riskLevel === "danger" ? G.danger : bio.riskLevel === "warning" ? G.warning : G.success;
  const predColor = bio.prediction?.level === "danger" ? G.danger : bio.prediction?.level === "warning" ? G.warning : G.accent;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning," : hour < 18 ? "Good afternoon," : "Good evening,";
  const hrData = bio.history.map(h => h.hr);
  const glData = bio.history.map(h => h.gl);
  const hrMin = hrData.length > 0 ? Math.min(...hrData) : bio.heartRate;
  const hrMax = hrData.length > 0 ? Math.max(...hrData) : bio.heartRate;
  const glMin = glData.length > 0 ? Math.min(...glData) : bio.glucose;
  const glMax = glData.length > 0 ? Math.max(...glData) : bio.glucose;

  return (
    <div className="screen" style={{ padding: "0 16px 16px" }}>
      {/* Header */}
      <div style={{ padding: "20px 0 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: G.muted }}>{greeting}</div>
          <div style={{ color: G.accent, fontSize: 22, fontWeight: 800, textTransform: "capitalize" }}>{profile?.name || "Patient"}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: bleConnected ? "#30d15815" : "#ff9f0a15", border: `1px solid ${bleConnected ? G.success : G.warning}40`, borderRadius: 20, padding: "5px 10px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: bleConnected ? G.success : G.warning, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 10, color: bleConnected ? G.success : G.warning, fontWeight: 700 }}>{bleConnected ? "Live" : "Demo"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#00c8ff15", border: `1px solid ${G.accent}40`, borderRadius: 20, padding: "5px 10px" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill={G.accent}><path d="M12 2L4.5 7.5v4L12 17l7.5-5.5v-4L12 2z"/></svg>
            <span style={{ fontSize: 10, color: G.accent, fontWeight: 700 }}>BLE</span>
          </div>
        </div>
      </div>

      {/* Risk Banner */}
      <div style={{ background: `${riskColor}15`, border: `1px solid ${riskColor}40`, borderRadius: 14, padding: "14px 18px", marginBottom: bio.prediction?.level !== "none" ? 10 : 16, display: "flex", alignItems: "center", justifyContent: "space-between", animation: bio.riskLevel === "danger" ? "urgent 1.5s infinite" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: riskColor, animation: bio.riskLevel !== "normal" ? "pulse 1s infinite" : "none" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: riskColor, letterSpacing: 1 }}>
              {bio.riskLevel === "danger" ? "⚠️ CRITICAL RISK DETECTED" : bio.riskLevel === "warning" ? "⚡ ELEVATED RISK — MONITOR" : "✅ NORMAL — ALL SYSTEMS OK"}
            </div>
            <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>AI monitoring active — {new Date().toLocaleTimeString()}</div>
          </div>
        </div>
        {bio.riskLevel === "danger" && (
          <button onClick={onEmergency} style={{ background: G.danger, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13, animation: "pulse 1s infinite" }}>SOS</button>
        )}
      </div>

      {/* Prediction Banner */}
      {bio.prediction?.level !== "none" && (
        <div style={{ background: `${predColor}12`, border: `1px solid ${predColor}50`, borderRadius: 14, padding: "12px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${predColor}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={predColor} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: predColor, letterSpacing: 1 }}>
              🔮 PRÉDICTION IA — RISQUE DANS ~{bio.prediction.eta} MIN
            </div>
            <div style={{ fontSize: 12, color: G.muted, marginTop: 3 }}>{bio.prediction.message}</div>
          </div>
        </div>
      )}

      {/* Demo Mode Warning */}
      {!bleConnected && (
        <div style={{ background: "#ff9f0a12", border: `1px solid ${G.warning}30`, borderRadius: 12, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.warning }}>Mode Démonstration</div>
            <div style={{ fontSize: 10, color: G.muted }}>Données simulées — connectez un appareil BLE pour des données réelles.</div>
          </div>
        </div>
      )}

      {/* Main Metrics */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {[
          { icon: "heart", label: "HEART RATE", value: bio.heartRate, unit: "BPM", color: bio.heartRate > 110 || bio.heartRate < 55 ? G.danger : G.accent, trend: hrData, min: hrMin, max: hrMax },
          { icon: "droplet", label: "GLUCOSE", value: bio.glucose, unit: "mg/dL", color: bio.glucose > 180 || bio.glucose < 70 ? G.danger : bio.glucose > 140 ? G.warning : G.success, trend: glData, min: glMin, max: glMax },
        ].map(m => (
          <div key={m.label} className="card" style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, opacity: 0.5 }}>
              <Sparkline data={m.trend} color={m.color} height={40} />
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${m.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={m.icon} size={14} color={m.color} />
                </div>
                <span style={{ fontSize: 9, color: G.muted, fontWeight: 700, letterSpacing: 1 }}>{m.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: m.color, fontFamily: "'Space Mono'", animation: m.color === G.danger ? "pulse 1s infinite" : "none" }}>{m.value}</div>
              <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>{m.unit}</div>
              {hrData.length > 2 && (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 9, color: G.muted }}>↓<span style={{ color: G.success }}>{m.min}</span></span>
                  <span style={{ fontSize: 9, color: G.muted }}>↑<span style={{ color: G.danger }}>{m.max}</span></span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Connected Devices */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: G.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>CONNECTED DEVICES</div>
        {[
          { icon: "watch", name: "Smart Bracelet", sub: "SafeBand Pro X1", color: G.accent, status: bleConnected ? "Active" : "Demo" },
          { icon: "droplet", name: "Glucose Patch", sub: "GlucoSense 3.0", color: G.success, status: bleConnected ? "Active" : "Demo" },
          { icon: "shield", name: "Bluetooth LE", sub: bleConnected ? "2 devices synced" : "No device connected", color: "#7c3aed", status: bleConnected ? "Connected" : "Off" },
        ].map(d => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${G.border}` }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${d.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={d.icon} size={16} color={d.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
              <div style={{ fontSize: 11, color: G.muted }}>{d.sub}</div>
            </div>
            <div style={{ background: bleConnected ? `${G.success}22` : `${G.warning}22`, border: `1px solid ${bleConnected ? G.success : G.warning}40`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: bleConnected ? G.success : G.warning }}>{d.status}</div>
          </div>
        ))}
      </div>

      {/* Today's Overview */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: G.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>TODAY'S OVERVIEW</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            { label: "SpO2", value: `${bio.spo2}%`, color: G.success },
            { label: "Steps", value: bio.steps.toLocaleString(), color: G.accent },
            { label: "Temp", value: `${bio.temp}°C`, color: G.warning },
            { label: "Systolic", value: bio.systolic, color: G.accent },
            { label: "Diastolic", value: bio.diastolic, color: G.success },
            { label: "Risk Score", value: bio.riskLevel === "danger" ? "HIGH" : bio.riskLevel === "warning" ? "MED" : "LOW", color: riskColor },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center", background: G.surface, borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: s.color, fontFamily: "'Space Mono'" }}>{s.value}</div>
              <div style={{ fontSize: 9, color: G.muted, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Medical Profile */}
      {profile && (
        <div className="card">
          <div style={{ fontSize: 12, color: G.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>MEDICAL PROFILE</div>
          {[
            { label: "Blood Group", value: profile.bloodGroup || "—" },
            { label: "Diabetes Type", value: profile.diabetesType || "—" },
            { label: "Medications", value: profile.medications || "—" },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${G.border}` }}>
              <span style={{ fontSize: 13, color: G.muted }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY TAB — with MIN/AVG/MAX stats
// ═══════════════════════════════════════════════════════════════════════════
const HistoryTab = ({ bio, userId }) => {
  const [filter, setFilter] = useState("all");
  const [savedReadings, setSavedReadings] = useState([]);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, "users", userId, "readings"), orderBy("timestamp", "desc"), limit(20));
    const unsub = onSnapshot(q, snap => {
      setSavedReadings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [userId]);

  const hrData = bio.history.map(h => h.hr);
  const glData = bio.history.map(h => h.gl);
  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const events = bio.history.slice(-15).reverse();
  const filtered = filter === "all" ? events : events.filter(e => e.risk === filter);

  return (
    <div className="screen" style={{ padding: "0 16px 16px" }}>
      <div style={{ padding: "20px 0 16px" }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Health History</div>
        <div style={{ color: G.muted, fontSize: 13, marginTop: 4 }}>Live biometric timeline</div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: G.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>HEART RATE — LAST 60 READINGS</div>
        <Sparkline data={hrData} color={G.accent} height={60} />
        {hrData.length > 2 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <span style={{ fontSize: 11, color: G.muted }}>MIN: <span style={{ color: G.success, fontWeight: 700 }}>{Math.min(...hrData)}</span></span>
            <span style={{ fontSize: 11, color: G.muted }}>AVG: <span style={{ color: G.accent, fontWeight: 700 }}>{avg(hrData)}</span></span>
            <span style={{ fontSize: 11, color: G.muted }}>MAX: <span style={{ color: G.danger, fontWeight: 700 }}>{Math.max(...hrData)}</span></span>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: G.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>GLUCOSE — LAST 60 READINGS</div>
        <Sparkline data={glData} color={G.success} height={60} />
        {glData.length > 2 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <span style={{ fontSize: 11, color: G.muted }}>MIN: <span style={{ color: G.success, fontWeight: 700 }}>{Math.min(...glData)}</span></span>
            <span style={{ fontSize: 11, color: G.muted }}>AVG: <span style={{ color: G.accent, fontWeight: 700 }}>{avg(glData)}</span></span>
            <span style={{ fontSize: 11, color: G.muted }}>MAX: <span style={{ color: G.danger, fontWeight: 700 }}>{Math.max(...glData)}</span></span>
          </div>
        )}
      </div>

      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>READING LOG</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "normal", "warning", "danger"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${filter === f ? G.accent : G.border}`, background: filter === f ? G.accentDim : "transparent", color: filter === f ? G.accent : G.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize", fontFamily: "'Syne'" }}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: G.muted, padding: 40 }}>No readings yet.</div>
      ) : filtered.map((ev, i) => (
        <div key={i} style={{ background: G.card, border: `1px solid ${ev.risk === "danger" ? G.danger + "40" : ev.risk === "warning" ? G.warning + "40" : G.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, animation: "slideIn .2s ease" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: ev.risk === "danger" ? G.danger : ev.risk === "warning" ? G.warning : G.success }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
              <span style={{ fontFamily: "'Space Mono'", color: G.accent, fontWeight: 700 }}>{ev.hr} <span style={{ color: G.muted, fontSize: 10 }}>BPM</span></span>
              <span style={{ fontFamily: "'Space Mono'", color: G.success, fontWeight: 700 }}>{ev.gl} <span style={{ color: G.muted, fontSize: 10 }}>mg/dL</span></span>
            </div>
          </div>
          <span style={{ fontSize: 10, color: G.muted }}>{ev.time}</span>
          <span className={`tag tag-${ev.risk === "danger" ? "danger" : ev.risk === "warning" ? "warning" : "normal"}`}>{ev.risk?.toUpperCase()}</span>
        </div>
      ))}

      {savedReadings.length > 0 && (
        <div style={{ textAlign: "center", fontSize: 12, color: G.muted, marginTop: 8, padding: "12px", background: G.card, borderRadius: 10 }}>
          ✅ {savedReadings.length} readings saved to your account
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// AI TAB — with Run AI Health Analysis button
// ═══════════════════════════════════════════════════════════════════════════

const AITab = ({ bio, profile }) => {
  const [messages, setMessages] = useState([
    { role: "assistant", text: `Hello ${profile?.name || ""}! I'm SafeLife AI, your personal medical assistant powered by Llama 3 (Groq). I can analyze your biometrics, answer health questions, and provide personalized recommendations. How can I help you today?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const buildContext = () => `You are SafeLife AI, an intelligent medical assistant.
Patient: ${profile?.name}, Age: ${profile?.age}, Blood Group: ${profile?.bloodGroup}
Diabetes: ${profile?.diabetesType}, Medications: ${profile?.medications}
Current biometrics: Heart Rate: ${bio.heartRate} BPM, Glucose: ${bio.glucose} mg/dL, SpO2: ${bio.spo2}%, BP: ${bio.systolic}/${bio.diastolic}, Temp: ${bio.temp}°C, Risk: ${bio.riskLevel}
Be concise, professional. Always recommend consulting a doctor for serious concerns.`;

  const callAI = async (prompt) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: buildContext() },
          ...messages.slice(-6).map(m => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.text
          })),
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await res.json();

    if (!res.ok) {
      // Surface the real reason instead of a generic message, so the
      // person actually knows what to fix (missing key, bad key, etc.)
      throw new Error(data?.error || `AI request failed (HTTP ${res.status})`);
    }

    return data?.choices?.[0]?.message?.content || "AI indisponible.";
  };

  const runAnalysis = async () => {
    setLoading(true);
    const prompt = `Effectue une analyse complète de mes biométriques actuelles: FC=${bio.heartRate} BPM, Glycémie=${bio.glucose} mg/dL, SpO2=${bio.spo2}%, TA=${bio.systolic}/${bio.diastolic}, Temp=${bio.temp}°C. Donne un résumé de mon état de santé, des risques potentiels et des recommandations.`;
    setMessages(p => [...p, { role: "user", text: "🔬 Run AI Health Analysis" }]);
    try {
      const reply = await callAI(prompt);
      setMessages(p => [...p, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages(p => [...p, { role: "assistant", text: `Analyse indisponible : ${err.message}` }]);
    }
    setLoading(false);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput("");
    setMessages(p => [...p, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const reply = await callAI(msg);
      setMessages(p => [...p, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages(p => [...p, { role: "assistant", text: `AI unavailable: ${err.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "20px 16px 12px", flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>AI Medical Assistant</div>
        <div style={{ color: G.muted, fontSize: 13, marginTop: 4 }}>Powered by Llama 3 (Groq)</div>
      </div>

      {/* Run Analysis Button */}
      <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
        <button onClick={runAnalysis} disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: 12, background: loading ? G.border : `linear-gradient(135deg, ${G.accent}22, #0080ff22)`, border: `1.5px solid ${G.accent}60`, color: G.accent, fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .25s" }}>
          {loading ? (
            <><div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${G.accent}40`, borderTop: `2px solid ${G.accent}`, animation: "spin 1s linear infinite" }} /> Analyzing...</>
          ) : (
            <><Icon name="activity" size={16} color={G.accent} /> Run AI Health Analysis</>
          )}
        </button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "slideIn .2s ease" }}>
            {m.role === "assistant" && (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: G.accentDim, border: `1px solid ${G.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10, marginTop: 4 }}>
                <Icon name="bot" size={16} color={G.accent} />
              </div>
            )}
            <div style={{ maxWidth: "78%", background: m.role === "user" ? `linear-gradient(135deg, #00c8ff, #0080ff)` : G.card, border: m.role === "user" ? "none" : `1px solid ${G.border}`, borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "12px 16px", fontSize: 14, lineHeight: 1.6, color: m.role === "user" ? "#fff" : G.text }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: G.accentDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="bot" size={16} color={G.accent} />
            </div>
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "12px 16px", fontSize: 13, color: G.muted, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: G.accent, animation: `pulse 1s ${i * 0.2}s infinite` }} />)}
              </div>
              Analyzing your biometrics...
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: 16, flexShrink: 0, borderTop: `1px solid ${G.border}`, display: "flex", gap: 10 }}>
        <input className="input-field" placeholder="Ask about your health..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} style={{ flex: 1 }} />
        <button onClick={send} disabled={loading} style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, #00c8ff, #0080ff)`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: loading ? 0.5 : 1 }}>
          <Icon name="send" size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// BLUETOOTH DEVICES PAGE — professional scan animation
// ═══════════════════════════════════════════════════════════════════════════
const BluetoothPage = ({ onBack, onBleChange }) => {
  const [bracelet, setBracelet] = useState({ status: "disconnected", device: null, name: "" });
  const [patch, setPatch] = useState({ status: "disconnected", device: null, name: "" });
  const [scanning, setScanning] = useState(null);
  const [bleSupported, setBleSupported] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    setBleSupported(!!navigator.bluetooth);
  }, []);

  useEffect(() => {
    if (scanning) {
      setScanProgress(0);
      const interval = setInterval(() => setScanProgress(p => Math.min(p + 2, 95)), 100);
      return () => clearInterval(interval);
    } else {
      setScanProgress(0);
    }
  }, [scanning]);

  // Notifie MainApp quand un appareil est connecté/déconnecté
  useEffect(() => {
    const connected = bracelet.status === "connected" || patch.status === "connected";
    if (onBleChange) onBleChange(connected);
  }, [bracelet.status, patch.status, onBleChange]);

  const connectDevice = async (type) => {
    setScanning(type);
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["heart_rate", "glucose", "battery_service", "device_information"]
      });
      const server = await device.gatt.connect();
      setScanProgress(100);
      const info = { status: "connected", device: server, name: device.name || "Appareil BLE" };
      if (type === "bracelet") setBracelet(info);
      else setPatch(info);
      device.addEventListener("gattserverdisconnected", () => {
        if (type === "bracelet") setBracelet({ status: "disconnected", device: null, name: "" });
        else setPatch({ status: "disconnected", device: null, name: "" });
      });
    } catch (e) {
      if (e.name !== "NotFoundError") {
        if (e.name === "SecurityError") alert("Utilisez HTTPS avec Chrome.");
        else alert("Erreur: " + e.message);
      }
    }
    setScanning(null);
  };

  const disconnect = (type) => {
    if (type === "bracelet") { bracelet.device?.disconnect(); setBracelet({ status: "disconnected", device: null, name: "" }); }
    else { patch.device?.disconnect(); setPatch({ status: "disconnected", device: null, name: "" }); }
  };

  const devices = [
    { key: "bracelet", icon: "watch", name: "Smart Bracelet", sub: "SafeBand Pro X1 · Cardiaque", state: bracelet, color: G.accent },
    { key: "patch", icon: "droplet", name: "Glucose Patch", sub: "GlucoSense 3.0 · Glycémie", state: patch, color: G.success },
  ];

  return (
    <div className="screen" style={{ padding: "0 16px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 0 16px" }}>
        <button onClick={onBack} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", color: G.text, fontSize: 18 }}>←</button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Bluetooth Devices</div>
          <div style={{ fontSize: 12, color: G.muted }}>Connexion BLE multi-appareils</div>
        </div>
      </div>

      {/* BLE Status */}
      <div className="card" style={{ marginBottom: 16, background: bleSupported ? "#30d15815" : "#ff2d5515", border: `1px solid ${bleSupported ? G.success : G.danger}30` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: bleSupported ? G.success : G.danger, animation: bleSupported ? "pulse 2s infinite" : "none" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: bleSupported ? G.success : G.danger }}>
              {bleSupported === null ? "Vérification..." : bleSupported ? "✅ Bluetooth BLE disponible" : "❌ Bluetooth non supporté"}
            </div>
            <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>
              {bleSupported ? "Chrome détecté — connexion possible" : "Utilisez Chrome sur Android ou PC"}
            </div>
          </div>
        </div>
      </div>

      {/* Scan Animation */}
      {scanning && (
        <div className="card" style={{ marginBottom: 16, textAlign: "center", padding: 32 }}>
          <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 20px" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${G.accent}`, animation: `scanPulse 2s ease-out ${i * 0.6}s infinite` }} />
            ))}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill={G.accent}><path d="M12 2L4.5 7.5v4L12 17l7.5-5.5v-4L12 2z"/></svg>
            </div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Recherche en cours...</div>
          <div style={{ fontSize: 12, color: G.muted, marginBottom: 16 }}>
            Sélectionnez votre {scanning === "bracelet" ? "bracelet" : "patch"} dans la liste du navigateur
          </div>
          <div style={{ height: 4, background: G.border, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: `linear-gradient(90deg, ${G.accent}, #0080ff)`, width: `${scanProgress}%`, transition: "width .1s" }} />
          </div>
        </div>
      )}

      {devices.map(d => (
        <div key={d.key} className="card" style={{ marginBottom: 14, animation: "slideIn .3s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ position: "relative", width: 48, height: 48 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${d.color}22`, border: `1px solid ${d.color}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={d.icon} size={22} color={d.color} />
              </div>
              {d.state.status === "connected" && (
                <div style={{ position: "absolute", top: -3, right: -3, width: 14, height: 14, borderRadius: "50%", background: G.success, border: "2px solid #0e1e35", animation: "pulse 2s infinite" }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: d.state.status === "connected" ? G.success : G.muted }}>
                {d.state.status === "connected" ? `✅ ${d.state.name}` : d.sub}
              </div>
            </div>
            <div style={{ padding: "4px 10px", borderRadius: 20, background: d.state.status === "connected" ? "#30d15822" : G.border + "44", border: `1px solid ${d.state.status === "connected" ? G.success : G.border}`, fontSize: 11, fontWeight: 700, color: d.state.status === "connected" ? G.success : G.muted }}>
              {d.state.status === "connected" ? "Connecté" : "Déconnecté"}
            </div>
          </div>

          {d.state.status === "connected" && (
            <div style={{ background: G.surface, borderRadius: 10, padding: 12, marginBottom: 12, display: "flex", gap: 16 }}>
              {[
                { label: "Signal", value: "Fort", color: G.success },
                { label: "Batterie", value: "87%", color: G.accent },
                { label: "Sync", value: "Live", color: G.success },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: G.muted }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {d.state.status === "disconnected" ? (
            <button className="btn-primary" onClick={() => connectDevice(d.key)} disabled={!!scanning || !bleSupported} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 2L4.5 7.5v4L12 17l7.5-5.5v-4L12 2z"/></svg>
              {scanning === d.key ? "Recherche..." : `Connecter ${d.name}`}
            </button>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, background: `${G.success}15`, border: `1px solid ${G.success}30`, borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, color: G.success, fontWeight: 600 }}>
                🔄 Synchronisation active
              </div>
              <button onClick={() => disconnect(d.key)} style={{ background: G.danger + "22", border: `1px solid ${G.danger}40`, borderRadius: 10, padding: "12px 16px", color: G.danger, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                Déco.
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="card">
        <div style={{ fontSize: 12, color: G.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>GUIDE DE CONNEXION</div>
        {[
          { icon: "1", q: "Activez le Bluetooth", a: "Paramètres téléphone → Bluetooth → Activer" },
          { icon: "2", q: "Mode appairage", a: "Appuyez sur le bouton de l'appareil jusqu'à la lumière bleue clignotante" },
          { icon: "3", q: "Connecter", a: "Cliquez 'Connecter' → Choisissez votre appareil dans la liste" },
          { icon: "4", q: "Problème de connexion ?", a: "Redémarrez l'appareil, rapprochez-vous et réessayez" },
        ].map(item => (
          <div key={item.q} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${G.border}` }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: G.accentDim, border: `1px solid ${G.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: G.accent, flexShrink: 0 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{item.q}</div>
              <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.5 }}>{item.a}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY & PRIVACY PAGE
// ═══════════════════════════════════════════════════════════════════════════
const SecurityPage = ({ onBack, user }) => {
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [twoFA, setTwoFA] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const iS = { background: G.surface, border: `1.5px solid ${G.border}`, borderRadius: 10, color: G.text, fontFamily: "'Syne',sans-serif", fontSize: 14, padding: "12px 16px", width: "100%", outline: "none", marginBottom: 14 };

  const changePassword = async () => {
    if (newPass.length < 6) { setErr("Le mot de passe doit avoir au moins 6 caractères."); return; }
    if (newPass !== confirmPass) { setErr("Les mots de passe ne correspondent pas."); return; }
    try {
      const { updatePassword } = await import("firebase/auth");
      await updatePassword(auth.currentUser, newPass);
      setMsg("✅ Mot de passe changé avec succès !"); setErr(""); setNewPass(""); setConfirmPass("");
    } catch (e) {
      setErr("Erreur: " + (e.code === "auth/requires-recent-login" ? "Reconnectez-vous et réessayez." : e.message));
    }
  };

  const Toggle = ({ val, onToggle }) => (
    <div onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 12, background: val ? G.accent : G.border, cursor: "pointer", position: "relative", transition: "background .3s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: val ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .3s" }} />
    </div>
  );

  return (
    <div className="screen" style={{ padding: "0 16px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 0 16px" }}>
        <button onClick={onBack} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", color: G.text, fontSize: 18 }}>←</button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Security & Privacy</div>
          <div style={{ fontSize: 12, color: G.muted }}>Gérer la sécurité de votre compte</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: G.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>CHANGER LE MOT DE PASSE</div>
        <input style={iS} type="password" placeholder="Nouveau mot de passe" value={newPass} onChange={e => setNewPass(e.target.value)} />
        <input style={{ ...iS, marginBottom: 0 }} type="password" placeholder="Confirmer le mot de passe" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
        {err && <div style={{ color: G.danger, fontSize: 12, marginTop: 10 }}>{err}</div>}
        {msg && <div style={{ color: G.success, fontSize: 12, marginTop: 10 }}>{msg}</div>}
        <button className="btn-primary" style={{ marginTop: 14 }} onClick={changePassword}>Changer le mot de passe</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: G.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>SÉCURITÉ AVANCÉE</div>
        {[
          { label: "Authentification 2 facteurs", sub: "SMS de vérification à la connexion", val: twoFA, toggle: () => setTwoFA(!twoFA) },
          { label: "Authentification biométrique", sub: "Empreinte digitale ou Face ID", val: biometric, toggle: () => setBiometric(!biometric) },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${G.border}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: G.muted }}>{item.sub}</div>
            </div>
            <Toggle val={item.val} onToggle={item.toggle} />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: G.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>INFORMATIONS DU COMPTE</div>
        <div style={{ padding: "10px 0", borderBottom: `1px solid ${G.border}` }}>
          <div style={{ fontSize: 12, color: G.muted }}>Email</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{user?.email}</div>
        </div>
        <div style={{ padding: "10px 0" }}>
          <div style={{ fontSize: 12, color: G.muted }}>Compte créé le</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString("fr-FR") : "—"}</div>
        </div>
      </div>

      <div className="card" style={{ border: `1px solid ${G.danger}40` }}>
        <div style={{ fontSize: 12, color: G.danger, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>ZONE DANGEREUSE</div>
        <button onClick={() => { if (window.confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) { auth.currentUser?.delete().catch(e => alert("Reconnectez-vous d'abord.")); } }} style={{ background: G.danger + "22", border: `1px solid ${G.danger}40`, borderRadius: 10, padding: "12px 16px", color: G.danger, cursor: "pointer", fontSize: 13, fontWeight: 700, width: "100%" }}>
          🗑️ Supprimer mon compte
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE TAB — avec navigation vers sous-pages
// ═══════════════════════════════════════════════════════════════════════════
const ProfileTab = ({ profile, user, onBleChange }) => {
  const [subPage, setSubPage] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [shareGps, setShareGps] = useState(true);
  const [autoCall, setAutoCall] = useState(true);
  const [editContact, setEditContact] = useState(false);
  const [newContact, setNewContact] = useState(profile?.emergencyContact || "");
  const [newPhone, setNewPhone] = useState(profile?.emergencyPhone || "");
  const [savingContact, setSavingContact] = useState(false);
  const handleLogout = () => signOut(auth);
  const initial = profile?.name ? profile.name[0].toUpperCase() : "?";

  useEffect(() => {
    setNewContact(profile?.emergencyContact || "");
    setNewPhone(profile?.emergencyPhone || "");
  }, [profile]);

  const saveContact = async () => {
    setSavingContact(true);
    try {
      await setDoc(doc(db, "users", user.uid), { emergencyContact: newContact, emergencyPhone: newPhone }, { merge: true });
      setEditContact(false);
    } catch (e) { alert("Erreur de sauvegarde"); }
    setSavingContact(false);
  };

  const Toggle = ({ val, onToggle }) => (
    <div onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 12, background: val ? G.accent : G.border, cursor: "pointer", position: "relative", transition: "background .3s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: val ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .3s" }} />
    </div>
  );

  if (subPage === "bluetooth") return <BluetoothPage onBack={() => setSubPage(null)} onBleChange={onBleChange} />;
  if (subPage === "security") return <SecurityPage onBack={() => setSubPage(null)} user={user} />;

  const iS = { background: G.surface, border: `1.5px solid ${G.border}`, borderRadius: 10, color: G.text, fontFamily: "'Syne',sans-serif", fontSize: 14, padding: "12px 16px", width: "100%", outline: "none", marginBottom: 10 };

  return (
    <div className="screen" style={{ padding: "0 16px 24px" }}>
      <div style={{ padding: "20px 0 16px" }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Profile</div>
      </div>

      {/* Avatar */}
      <div className="card" style={{ textAlign: "center", marginBottom: 16, padding: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg, ${G.accent}, #0080ff)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 32, fontWeight: 800, color: "#fff" }}>
          {initial}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, textTransform: "lowercase" }}>{profile?.name || "Patient"}</div>
        <div style={{ color: G.muted, fontSize: 13, marginTop: 4 }}>{user?.email}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
          {profile?.diabetesType && profile.diabetesType !== "None" && (
            <span style={{ background: "#30d15822", color: G.success, border: `1px solid ${G.success}40`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{profile.diabetesType} Diabetic</span>
          )}
          {profile?.medHistory && (
            <span style={{ background: G.accentDim, color: G.accent, border: `1px solid ${G.accent}40`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>Cardiac Monitor</span>
          )}
          {profile?.bloodGroup && (
            <span style={{ background: "#ff2d5522", color: G.danger, border: `1px solid ${G.danger}40`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{profile.bloodGroup}</span>
          )}
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: G.muted, fontWeight: 700, letterSpacing: 1 }}>CONTACT D'URGENCE</div>
          <button onClick={() => setEditContact(!editContact)} style={{ background: "none", border: "none", color: G.accent, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {editContact ? "Annuler" : "✏️ Modifier"}
          </button>
        </div>

        {editContact ? (
          <>
            <label style={{ fontSize: 11, color: G.muted, fontWeight: 600, letterSpacing: 1, display: "block", marginBottom: 6 }}>NOM</label>
            <input style={iS} type="text" placeholder="Nom du contact" value={newContact} onChange={e => setNewContact(e.target.value)} />
            <label style={{ fontSize: 11, color: G.muted, fontWeight: 600, letterSpacing: 1, display: "block", marginBottom: 6 }}>NUMÉRO WHATSAPP</label>
            <input style={{ ...iS, marginBottom: 14 }} type="tel" placeholder="+213..." value={newPhone} onChange={e => setNewPhone(e.target.value)} />
            <button className="btn-primary" onClick={saveContact} disabled={savingContact}>
              {savingContact ? "Sauvegarde..." : "💾 Sauvegarder"}
            </button>
          </>
        ) : profile?.emergencyContact ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: G.danger + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: G.danger, flexShrink: 0 }}>
              {profile.emergencyContact[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{profile.emergencyContact}</div>
              <div style={{ fontSize: 12, color: G.muted }}>{profile.emergencyPhone}</div>
            </div>
            <button onClick={() => { if (profile.emergencyPhone) window.open(`https://wa.me/${profile.emergencyPhone.replace(/\D/g, "")}`, "_blank"); }} style={{ background: "#25d36622", border: "1px solid #25d36640", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "#25d366", fontWeight: 700 }}>
              WA
            </button>
          </div>
        ) : (
          <div style={{ color: G.muted, fontSize: 13 }}>Aucun contact défini</div>
        )}
      </div>

      {/* Emergency Settings */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: G.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>EMERGENCY SETTINGS</div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Alert Countdown Delay</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[15, 30, 60, 120].map(s => (
            <button key={s} onClick={() => setCountdown(s)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${countdown === s ? G.accent : G.border}`, background: countdown === s ? G.accentDim : "transparent", color: countdown === s ? G.accent : G.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne'" }}>{s}s</button>
          ))}
        </div>
        {[
          { icon: "phone", label: "Share GPS Location", sub: "Envoyé avec le message WhatsApp", val: shareGps, toggle: () => setShareGps(!shareGps) },
          { icon: "bell", label: "Auto-Send WhatsApp", sub: "Envoi automatique après countdown", val: autoCall, toggle: () => setAutoCall(!autoCall) },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: `1px solid ${G.border}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: G.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={item.icon} size={18} color={G.accent} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: G.muted }}>{item.sub}</div>
            </div>
            <Toggle val={item.val} onToggle={item.toggle} />
          </div>
        ))}
      </div>

      {/* System */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: G.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>SYSTEM</div>
        {[
          { icon: "watch", label: "Bluetooth Devices", sub: "Gérer les appareils connectés", page: "bluetooth" },
          { icon: "shield", label: "Security & Privacy", sub: "Mot de passe & sécurité", page: "security" },
        ].map(item => (
          <div key={item.label} onClick={() => setSubPage(item.page)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid ${G.border}`, cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: G.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={item.icon} size={18} color={G.accent} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: G.muted }}>{item.sub}</div>
            </div>
            <span style={{ color: G.muted, fontSize: 18 }}>›</span>
          </div>
        ))}
      </div>

      <button className="btn-danger" onClick={handleLogout} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Icon name="logout" size={16} color="#fff" /> Sign Out
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ALERTS TAB
// ═══════════════════════════════════════════════════════════════════════════
const AlertsTab = ({ bio }) => {
  const [filter, setFilter] = useState("all");
  const [alerts, setAlerts] = useState([
    { id: 1, title: "Devices Connected", msg: "Bracelet and patch are synced.", time: "3 hr ago", type: "info", read: true },
  ]);

  useEffect(() => {
    if (bio.riskLevel === "warning" && bio.heartRate > 110) {
      setAlerts(prev => {
        const exists = prev.find(a => a.title === "Elevated Heart Rate" && !a.read);
        if (exists) return prev;
        return [{ id: Date.now(), title: "Elevated Heart Rate", msg: `HR reached ${bio.heartRate} BPM. Consider resting.`, time: "Just now", type: "warning", read: false }, ...prev];
      });
    }
    if (bio.riskLevel === "danger") {
      setAlerts(prev => {
        const exists = prev.find(a => a.title === "Critical Alert" && !a.read);
        if (exists) return prev;
        return [{ id: Date.now(), title: "Critical Alert", msg: `Dangerous values detected! HR: ${bio.heartRate}, Glucose: ${bio.glucose}`, time: "Just now", type: "danger", read: false }, ...prev];
      });
    }
  }, [bio.riskLevel, bio.heartRate, bio.glucose]);

  const unread = alerts.filter(a => !a.read).length;
  const filtered = filter === "all" ? alerts : filter === "unread" ? alerts.filter(a => !a.read) : alerts.filter(a => a.type === filter);
  const typeColor = { danger: G.danger, warning: G.warning, info: G.accent, normal: G.success };

  return (
    <div className="screen" style={{ padding: "0 16px 16px" }}>
      <div style={{ padding: "20px 0 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Notifications</div>
          <div style={{ color: G.muted, fontSize: 13, marginTop: 4 }}>{unread} unread</div>
        </div>
        {unread > 0 && (
          <button onClick={() => setAlerts(prev => prev.map(a => ({ ...a, read: true })))} style={{ background: "none", border: "none", color: G.accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Mark all read</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "unread", "danger", "warning"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${filter === f ? G.accent : G.border}`, background: filter === f ? G.accentDim : "transparent", color: filter === f ? G.accent : G.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize", fontFamily: "'Syne'" }}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: G.muted, padding: 60 }}>No notifications</div>
      ) : filtered.map(a => (
        <div key={a.id} style={{ background: G.card, border: `1px solid ${a.read ? G.border : typeColor[a.type] + "60"}`, borderRadius: 14, padding: "16px", marginBottom: 12, display: "flex", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${typeColor[a.type]}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name={a.type === "danger" ? "alert" : a.type === "warning" ? "alert" : "bell"} size={20} color={typeColor[a.type]} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{a.title}</div>
              {!a.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: G.accent, flexShrink: 0, marginTop: 4 }} />}
            </div>
            <div style={{ fontSize: 13, color: G.muted, marginTop: 4, lineHeight: 1.5 }}>{a.msg}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: G.muted }}>{a.time}</span>
              <span style={{ background: `${typeColor[a.type]}22`, color: typeColor[a.type], border: `1px solid ${typeColor[a.type]}40`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                {a.type.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// EMERGENCY OVERLAY — with real phone call
// ═══════════════════════════════════════════════════════════════════════════
const EmergencyOverlay = ({ bio, profile, onClose }) => {
  const [countdown, setCountdown] = useState(30);
  const [phase, setPhase] = useState("countdown");

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { setPhase("sent"); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000ee", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "urgent 1s infinite" }}>
      <div style={{ width: "100%", maxWidth: 400, background: G.card, border: `2px solid ${G.danger}`, borderRadius: 20, padding: 28, boxShadow: `0 0 60px ${G.danger}44` }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: G.danger }}>
            {phase === "countdown" ? "⚠️ EMERGENCY DETECTED" : "✅ ALERT DISPATCHED"}
          </div>
          <div style={{ color: G.muted, fontSize: 13, marginTop: 6 }}>
            {phase === "countdown" ? `Auto-call in ${countdown}s` : "Emergency contact notified"}
          </div>
        </div>

        <div style={{ background: G.surface, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: G.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>CRITICAL BIOMETRICS</div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontFamily: "'Space Mono'", fontSize: 24, fontWeight: 700, color: G.danger }}>{bio.heartRate}</div>
              <div style={{ fontSize: 10, color: G.muted }}>BPM</div>
            </div>
            <div style={{ width: 1, background: G.border }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontFamily: "'Space Mono'", fontSize: 24, fontWeight: 700, color: G.warning }}>{bio.glucose}</div>
              <div style={{ fontSize: 10, color: G.muted }}>mg/dL</div>
            </div>
          </div>
        </div>

        {profile?.emergencyContact && (
          <div style={{ background: G.surface, borderRadius: 12, padding: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <Icon name="phone" size={20} color={G.danger} />
            <div>
              <div style={{ fontWeight: 700 }}>{profile.emergencyContact}</div>
              <div style={{ fontSize: 12, color: G.muted }}>{profile.emergencyPhone}</div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-danger" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => {
            if (profile?.emergencyPhone) {
              const phone = profile.emergencyPhone.replace(/\D/g, "");
              const sendWA = (locationText) => {
                const msg = encodeURIComponent(
                  `🚨 URGENCE SAFELIFE 🚨\n` +
                  `Patient: ${profile.name || "Utilisateur"}\n` +
                  `❤️ Fréquence cardiaque: ${bio.heartRate} BPM\n` +
                  `🩸 Glycémie: ${bio.glucose} mg/dL\n` +
                  `⚠️ État: CRITIQUE — Besoin d'aide immédiate!\n` +
                  `📍 Localisation: ${locationText}`
                );
                window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
              };
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  pos => {
                    const { latitude, longitude } = pos.coords;
                    sendWA(`https://maps.google.com/?q=${latitude},${longitude}`);
                  },
                  () => sendWA("Localisation non disponible")
                );
              } else {
                sendWA("Localisation non supportée");
              }
            }
            setPhase("sent");
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.554 4.099 1.523 5.824L0 24l6.344-1.498A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.807 9.807 0 01-5.001-1.367l-.36-.214-3.733.881.899-3.634-.235-.374A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/></svg>
            WhatsApp SOS
          </button>
          <button className="btn-outline" style={{ flex: 1 }} onClick={onClose}>
            I'm Safe
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
const MainApp = ({ user }) => {
  const [tab, setTab] = useState("dashboard");
  const [profile, setProfile] = useState(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [bleConnected, setBleConnected] = useState(false);
  const bio = useBiometrics(user.uid, profile);
  const prevRisk = useRef("normal");
  const prevPred = useRef("none");
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", user.uid), snap => {
      if (snap.exists()) setProfile(snap.data());
    });
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    if (bio.riskLevel === "danger" && prevRisk.current !== "danger") {
      setShowEmergency(true);
      setAlertCount(c => c + 1);
    }
    if (bio.riskLevel === "warning" && prevRisk.current !== "warning") setAlertCount(c => c + 1);
    prevRisk.current = bio.riskLevel;
  }, [bio.riskLevel]);

  // Alerte prédiction
  useEffect(() => {
    if (bio.prediction?.level === "danger" && prevPred.current !== "danger") {
      setAlertCount(c => c + 1);
    }
    prevPred.current = bio.prediction?.level || "none";
  }, [bio.prediction?.level]);

  const tabs = [
    { id: "dashboard", icon: "home", label: "Home" },
    { id: "history", icon: "activity", label: "History" },
    { id: "ai", icon: "bot", label: "AI" },
    { id: "alerts", icon: "bell", label: "Alerts", badge: alertCount },
    { id: "profile", icon: "user", label: "Profile" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: G.bg, display: "flex", flexDirection: "column" }}>
      {showEmergency && <EmergencyOverlay bio={bio} profile={profile} onClose={() => setShowEmergency(false)} />}

      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {tab === "dashboard" && <DashboardTab bio={bio} profile={profile} onEmergency={() => setShowEmergency(true)} bleConnected={bleConnected} />}
        {tab === "history" && <HistoryTab bio={bio} userId={user.uid} />}
        {tab === "ai" && <AITab bio={bio} profile={profile} />}
        {tab === "alerts" && <AlertsTab bio={bio} />}
        {tab === "profile" && <ProfileTab profile={profile} user={user} onBleChange={setBleConnected} />}
      </div>

      <div style={{ background: G.surface, borderTop: `1px solid ${G.border}`, padding: "8px 0 10px", display: "flex", justifyContent: "space-around" }}>
        {tabs.map(t => (
          <button key={t.id} className={`nav-tab ${tab === t.id ? "active" : ""}`} onClick={() => { setTab(t.id); if (t.id === "alerts") setAlertCount(0); }} style={{ position: "relative" }}>
            <Icon name={t.icon} size={20} color={tab === t.id ? G.accent : G.muted} />
            {t.badge > 0 && (
              <div style={{ position: "absolute", top: 4, right: 8, width: 16, height: 16, borderRadius: "50%", background: G.danger, fontSize: 9, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{t.badge}</div>
            )}
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [appState, setAppState] = useState("splash");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthLoading(false);
      if (u) setAppState("app");
    });
    return () => unsub();
  }, []);

  if (authLoading) return (
    <div style={{ position: "fixed", inset: 0, background: G.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{css}</style>
      <div style={{ animation: "spin 1s linear infinite" }}><Icon name="heart" size={32} color={G.accent} /></div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: G.bg }}>
      <style>{css}</style>
      {appState === "splash" && <SplashScreen onDone={() => setAppState(user ? "app" : "login")} />}
      {appState === "login" && !user && <LoginScreen onRegister={() => setAppState("register")} />}
      {appState === "register" && !user && <RegisterScreen onBack={() => setAppState("login")} />}
      {(user || appState === "app") && user && <MainApp user={user} />}
      {!user && appState === "app" && <LoginScreen onRegister={() => setAppState("register")} />}
    </div>
  );
}
