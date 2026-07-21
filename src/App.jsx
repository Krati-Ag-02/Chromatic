import { useState, useRef, useEffect, useCallback } from "react";
import { Circle, Square, Triangle, Gem, Eye, Volume2, VolumeX, RotateCcw, Play, ArrowLeft, Trophy, Flame } from "lucide-react";

const PADS = [
  { id: 0, color: "#ff2a6d", glow: "#ff5a8d", shadow: "rgba(255, 42, 109, 0.6)", shape: Circle, freq: 261.6, name: "Neon Rose" },
  { id: 1, color: "#05d9e8", glow: "#3ae5f2", shadow: "rgba(5, 217, 232, 0.6)", shape: Square, freq: 329.6, name: "Cyan Beam" },
  { id: 2, color: "#ffc200", glow: "#ffd23f", shadow: "rgba(255, 194, 0, 0.6)", shape: Triangle, freq: 392.0, name: "Amber Glow" },
  { id: 3, color: "#b967ff", glow: "#cd8cff", shadow: "rgba(185, 103, 255, 0.6)", shape: Gem, freq: 493.9, name: "Laser Violet" },
];

const MODES = {
  classic: { label: "Classic", desc: "Repeat the sequence in original order.", baseSpeed: 650, badge: "STANDARD" },
  reverse: { label: "Reverse", desc: "Repeat the entire sequence backwards.", baseSpeed: 700, badge: "MIND FLIP" },
  rush: { label: "Speed Rush", desc: "Zero pauses. Accelerates round by round.", baseSpeed: 550, badge: "HIGH OCTANE" },
};

function useBestScores() {
  const [scores, setScores] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("chromatic_scores_v2") || "{}");
    } catch {
      return {};
    }
  });
  const save = useCallback((mode, round) => {
    setScores((prev) => {
      const next = { ...prev, [mode]: Math.max(prev[mode] || 0, round) };
      try {
        localStorage.setItem("chromatic_scores_v2", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  return [scores, save];
}

export default function ChromaticApp() {
  const [screen, setScreen] = useState("home");
  const [mode, setMode] = useState("classic");
  const [colorblind, setColorblind] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [scores, saveScore] = useBestScores();

  const [sequence, setSequence] = useState([]);
  const [round, setRound] = useState(0);
  const [userStep, setUserStep] = useState(0);
  const [activePad, setActivePad] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("neutral");
  const [speed, setSpeed] = useState(MODES.classic.baseSpeed);
  const [streak, setStreak] = useState(0);

  const audioCtxRef = useRef(null);
  const cancelledRef = useRef(false);

  const RING_CIRC = 930;
  const ringPct = Math.min(streak / 12, 1);
  const ringOffset = RING_CIRC - RING_CIRC * ringPct;

  function beep(padId) {
    if (!soundOn) return;
    try {
      audioCtxRef.current = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = PADS[padId].freq;
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function flashPad(id, dur) {
    if (cancelledRef.current) return;
    setActivePad(id);
    beep(id);
    await wait(dur * 0.6);
    setActivePad(null);
    await wait(dur * 0.4);
  }

  async function playSequence(seq, curSpeed) {
    setAccepting(false);
    setMessage("WATCH THE PATTERN");
    setMessageTone("neutral");
    await wait(450);
    for (const step of seq) {
      if (cancelledRef.current) return;
      await flashPad(step, curSpeed);
    }
    if (cancelledRef.current) return;
    setUserStep(0);
    setAccepting(true);
    setMessage(mode === "reverse" ? "YOUR TURN — REPEAT IN REVERSE" : "YOUR TURN — REPEAT SEQUENCE");
    setMessageTone("neutral");
  }

  function nextRound(prevSeq, prevRound) {
    const newSeq = [...prevSeq, Math.floor(Math.random() * 4)];
    const newRound = prevRound + 1;
    setSequence(newSeq);
    setRound(newRound);
    let curSpeed = MODES[mode].baseSpeed;
    if (mode === "rush") {
      curSpeed = Math.max(200, MODES.rush.baseSpeed - newRound * 25);
    }
    setSpeed(curSpeed);
    playSequence(newSeq, curSpeed);
  }

  function startGame() {
    cancelledRef.current = false;
    setSequence([]);
    setRound(0);
    setStreak(0);
    setScreen("game");
    setMessage("INITIALIZING...");
    setTimeout(() => nextRound([], 0), 600);
  }

  function handlePadClick(id) {
    if (!accepting) return;
    flashPad(id, 200);

    const target = mode === "reverse" ? sequence[sequence.length - 1 - userStep] : sequence[userStep];

    if (id === target) {
      const nextStep = userStep + 1;
      setUserStep(nextStep);
      if (nextStep === sequence.length) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        saveScore(mode, round);
        setAccepting(false);
        setMessage("PERFECT RESPONSE!");
        setMessageTone("good");
        setTimeout(() => nextRound(sequence, round), mode === "rush" ? 350 : 850);
      }
    } else {
      setAccepting(false);
      setMessage(`SEQUENCE BROKEN AT ROUND ${round}`);
      setMessageTone("bad");
      setStreak(0);
    }
  }

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 20%, #150a2b 0%, #080311 100%)",
        color: "#ffffff",
        fontFamily: "'Space Mono', monospace, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Ambient Grid Background Overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        pointerEvents: "none",
        zIndex: 1
      }} />

      {/* Atmospheric Radial Glow */}
      <div style={{
        position: "absolute",
        width: "500px",
        height: "500px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(185, 103, 255, 0.15) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 1
      }} />

      {/* Main Glass Dashboard Card */}
      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: "440px",
        background: "rgba(20, 12, 38, 0.75)",
        backdropFilter: "blur(28px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "32px",
        padding: "32px 24px",
        boxShadow: "0 30px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.2)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>

        {/* HOME SCREEN */}
        {screen === "home" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              
              <h1 style={{
                fontSize: "38px",
                margin: 0,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                background: "linear-gradient(180deg, #FFFFFF 30%, #b967ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textTransform: "uppercase"
              }}>
                CHROMATIC
              </h1>
            </div>

            {/* Mode Selectors */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
              {Object.entries(MODES).map(([key, m]) => {
                const isSelected = mode === key;
                return (
                  <button
                    key={key}
                    onClick={() => setMode(key)}
                    style={{
                      textAlign: "left",
                      background: isSelected ? "rgba(185, 103, 255, 0.16)" : "rgba(255, 255, 255, 0.03)",
                      border: `1.5px solid ${isSelected ? "#b967ff" : "rgba(255, 255, 255, 0.08)"}`,
                      borderRadius: "18px",
                      padding: "16px 20px",
                      cursor: "pointer",
                      color: "#fff",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: isSelected ? "0 8px 24px rgba(185, 103, 255, 0.25)" : "none",
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "0.02em" }}>{m.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Trophy size={12} color={isSelected ? "#ffd23f" : "rgba(255,255,255,0.4)"} />
                        <span style={{ fontSize: "11px", fontWeight: 800, color: isSelected ? "#ffd23f" : "rgba(255,255,255,0.5)" }}>
                          BEST: {scores[key] || 0}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", margin: 0, lineHeight: 1.4 }}>{m.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Settings Toggles */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "28px", width: "100%" }}>
              <button
                onClick={() => setColorblind((v) => !v)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: colorblind ? "rgba(5, 217, 232, 0.2)" : "rgba(255, 255, 255, 0.04)",
                  color: colorblind ? "#05d9e8" : "rgba(255, 255, 255, 0.6)",
                  border: `1px solid ${colorblind ? "#05d9e8" : "rgba(255, 255, 255, 0.1)"}`,
                  borderRadius: "14px",
                  padding: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <Eye size={14} /> Colorblind Icons
              </button>
              <button
                onClick={() => setSoundOn((v) => !v)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: soundOn ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 42, 109, 0.15)",
                  color: soundOn ? "#ffffff" : "#ff2a6d",
                  border: `1px solid ${soundOn ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 42, 109, 0.3)"}`,
                  borderRadius: "14px",
                  padding: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />} Audio Synthesizer
              </button>
            </div>

            {/* Launch Game Button */}
            <button
              onClick={startGame}
              style={{
                width: "100%",
                padding: "18px",
                background: "linear-gradient(135deg, #b967ff 0%, #05d9e8 100%)",
                color: "#080311",
                border: "none",
                borderRadius: "18px",
                fontFamily: "inherit",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 12px 32px rgba(185, 103, 255, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "all 0.2s ease"
              }}
            >
              <Play size={18} fill="#080311" /> START {MODES[mode].label}
            </button>
          </div>
        )}

        {/* GAME SCREEN */}
        {screen === "game" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            
            {/* Navigation Header */}
            <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <button
                onClick={() => {
                  cancelledRef.current = true;
                  setScreen("home");
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "12px",
                  padding: "8px 14px",
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <ArrowLeft size={14} /> EXIT
              </button>
              
              <div style={{
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.15em",
                color: "#05d9e8",
                background: "rgba(5, 217, 232, 0.12)",
                border: "1px solid rgba(5, 217, 232, 0.25)",
                padding: "6px 12px",
                borderRadius: "12px",
                textTransform: "uppercase"
              }}>
                {MODES[mode].label}
              </div>
            </div>

            {/* HUD Status Counters */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", width: "100%", marginBottom: "28px" }}>
              {[
                ["ROUND", round, "#b967ff"],
                ["STREAK", streak, "#ff2a6d"],
                ["BEST", Math.max(scores[mode] || 0, round), "#ffd23f"],
              ].map(([label, val, color]) => (
                <div key={label} style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "12px 8px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255, 255, 255, 0.4)", fontWeight: 800, marginBottom: "4px" }}>{label}</div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: color }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Glowing Pad Ring Stage */}
            <div style={{ position: "relative", width: "270px", height: "270px", marginBottom: "24px" }}>
              
              {/* Outer Circular Ring Progress Indicator */}
              <svg viewBox="0 0 308 308" style={{ position: "absolute", inset: "-19px", width: "308px", height: "308px", pointerEvents: "none" }}>
                <circle cx="154" cy="154" r="148" fill="none" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="4" />
                <circle
                  cx="154"
                  cy="154"
                  r="148"
                  fill="none"
                  stroke="#ff2a6d"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={ringOffset}
                  style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 0.4s ease" }}
                />
              </svg>

              {/* Pad Quadrants Container */}
              <div
                style={{
                  position: "relative",
                  width: "270px",
                  height: "270px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gridTemplateRows: "1fr 1fr",
                  gap: "10px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  padding: "10px",
                  background: "rgba(10, 5, 20, 0.9)",
                  border: "2px solid rgba(255, 255, 255, 0.1)",
                  boxShadow: "0 0 40px rgba(0,0,0,0.8)"
                }}
              >
                {PADS.map((pad, i) => {
                  const ShapeIcon = pad.shape;
                  const isActive = activePad === pad.id;
                  const radii = [
                    "100% 12px 12px 12px",
                    "12px 100% 12px 12px",
                    "12px 12px 12px 100%",
                    "12px 12px 100% 12px",
                  ];
                  return (
                    <button
                      key={pad.id}
                      onClick={() => handlePadClick(pad.id)}
                      style={{
                        border: "none",
                        cursor: accepting ? "pointer" : "default",
                        background: isActive ? pad.glow : pad.color,
                        borderRadius: radii[i],
                        opacity: isActive ? 1 : 0.65,
                        transform: isActive ? "scale(0.95)" : "scale(1)",
                        boxShadow: isActive ? `0 0 35px ${pad.shadow}, inset 0 0 15px #ffffff` : "none",
                        transition: "all 0.12s cubic-bezier(0.4, 0, 0.2, 1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: i === 0 ? "flex-start" : i === 1 ? "flex-end" : i === 2 ? "flex-start" : "flex-end",
                        padding: "22px",
                        position: "relative"
                      }}
                    >
                      {colorblind && <ShapeIcon size={24} color="#080311" strokeWidth={3} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />}
                    </button>
                  );
                })}

                {/* Central Round Status Node */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "82px",
                    height: "82px",
                    borderRadius: "50%",
                    background: "#0d061a",
                    border: "3px solid rgba(255, 255, 255, 0.15)",
                    boxShadow: "0 0 25px rgba(0,0,0,0.9)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    color: "#ffffff",
                    zIndex: 20
                  }}
                >
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>ROUND</span>
                  <span style={{ fontSize: "22px", background: "linear-gradient(180deg, #FFFFFF, #b967ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {round || "0"}
                  </span>
                </div>
              </div>
            </div>

            {/* Message Banner */}
            <div style={{
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "8px 16px",
              borderRadius: "14px",
              background: messageTone === "bad" ? "rgba(255, 42, 109, 0.15)" : messageTone === "good" ? "rgba(5, 217, 232, 0.15)" : "rgba(255, 255, 255, 0.03)",
              border: `1px solid ${messageTone === "bad" ? "rgba(255, 42, 109, 0.4)" : messageTone === "good" ? "rgba(5, 217, 232, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
              width: "100%",
              marginBottom: "16px"
            }}>
              <p style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: messageTone === "bad" ? "#ff2a6d" : messageTone === "good" ? "#05d9e8" : "rgba(255, 255, 255, 0.7)",
                margin: 0,
                textTransform: "uppercase"
              }}>
                {message}
              </p>
            </div>

            {/* Game Over Retry Action */}
            {!accepting && message.startsWith("SEQUENCE BROKEN") && (
              <button
                onClick={startGame}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "linear-gradient(135deg, #ff2a6d 0%, #b967ff 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "16px",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 8px 24px rgba(255, 42, 109, 0.3)"
                }}
              >
                <RotateCcw size={16} /> REPLAY MODE
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}