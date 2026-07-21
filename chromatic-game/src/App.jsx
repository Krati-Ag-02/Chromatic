import { useState, useRef, useEffect, useCallback } from "react";
import { Circle, Square, Triangle, Gem, Eye, Volume2, VolumeX } from "lucide-react";

const PADS = [
  { id: 0, color: "#d98a7a", glow: "#e8a99b", shape: Circle, freq: 261.6, name: "coral" },
  { id: 1, color: "#7fae9c", glow: "#9cc4b3", shape: Square, freq: 329.6, name: "sage" },
  { id: 2, color: "#c9a35f", glow: "#dbbb80", shape: Triangle, freq: 392.0, name: "ochre" },
  { id: 3, color: "#9584b0", glow: "#af9fc8", shape: Gem, freq: 493.9, name: "violet" },
];

const MODES = {
  classic: { label: "Classic", desc: "Repeat the sequence in order.", baseSpeed: 650 },
  reverse: { label: "Reverse", desc: "Repeat the sequence backwards.", baseSpeed: 700 },
  rush: { label: "Speed Rush", desc: "No pauses. Gets faster every round.", baseSpeed: 550 },
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
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.3);
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
    setMessage("Watch closely...");
    setMessageTone("neutral");
    await wait(450);
    for (const step of seq) {
      if (cancelledRef.current) return;
      await flashPad(step, curSpeed);
    }
    if (cancelledRef.current) return;
    setUserStep(0);
    setAccepting(true);
    setMessage(mode === "reverse" ? "Your turn — repeat it backwards." : "Your turn.");
    setMessageTone("neutral");
  }

  function nextRound(prevSeq, prevRound) {
    const newSeq = [...prevSeq, Math.floor(Math.random() * 4)];
    const newRound = prevRound + 1;
    setSequence(newSeq);
    setRound(newRound);
    let curSpeed = MODES[mode].baseSpeed;
    if (mode === "rush") {
      curSpeed = Math.max(220, MODES.rush.baseSpeed - newRound * 25);
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
    setMessage("Get ready...");
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
        setMessage("Nice — next round...");
        setMessageTone("good");
        setTimeout(() => nextRound(sequence, round), mode === "rush" ? 350 : 850);
      }
    } else {
      setAccepting(false);
      setMessage(`Sequence broken at round ${round}. Best (${MODES[mode].label}): ${Math.max(scores[mode] || 0, round)}`);
      setMessageTone("bad");
      setStreak(0);
    }
  }

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const theme = {
    bg: "#f3ede0",
    panel: "#faf6ec",
    ink: "#33302a",
    sub: "#8c8578",
    line: "#e0d8c4",
    accent: "#6d7f6f",
  };

  const monoFont = "'Courier New', monospace";

  if (screen === "home") {
    return (
      <div
        style={{
          minHeight: "500px",
          background: theme.bg,
          color: theme.ink,
          fontFamily: monoFont,
          display: "flex",
          justifyContent: "center",
          padding: "40px 16px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "420px" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: theme.accent, margin: "0 0 8px" }}>
              // sequence memory
            </p>
            <h1 style={{ fontSize: "34px", margin: 0, fontFamily: "Georgia, serif", fontWeight: 700 }}>Chromatic</h1>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "22px" }}>
            {Object.entries(MODES).map(([key, m]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                style={{
                  textAlign: "left",
                  background: mode === key ? theme.panel : "transparent",
                  border: `1px solid ${mode === key ? theme.accent : theme.line}`,
                  borderRadius: "10px",
                  padding: "12px 16px",
                  cursor: "pointer",
                  color: theme.ink,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "14px" }}>{m.label}</span>
                  <span style={{ fontSize: "11px", color: theme.sub }}>best: {scores[key] || 0}</span>
                </div>
                <p style={{ fontSize: "12px", color: theme.sub, margin: "4px 0 0" }}>{m.desc}</p>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "22px", flexWrap: "wrap" }}>
            <button
              onClick={() => setColorblind((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                background: colorblind ? theme.accent : "transparent",
                color: colorblind ? "#fff" : theme.sub,
                border: `1px solid ${colorblind ? theme.accent : theme.line}`,
                borderRadius: "16px",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              <Eye size={13} /> Colorblind mode
            </button>
            <button
              onClick={() => setSoundOn((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                background: "transparent",
                color: theme.sub,
                border: `1px solid ${theme.line}`,
                borderRadius: "16px",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />} Sound
            </button>
          </div>

          <button
            onClick={startGame}
            style={{
              width: "100%",
              padding: "14px",
              background: theme.accent,
              color: "#faf6ec",
              border: "none",
              borderRadius: "10px",
              fontFamily: monoFont,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Start {MODES[mode].label}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "500px",
        background: theme.bg,
        color: theme.ink,
        fontFamily: monoFont,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px",
        gap: "20px",
      }}
    >
      <button
        onClick={() => {
          cancelledRef.current = true;
          setScreen("home");
        }}
        style={{ alignSelf: "flex-start", background: "none", border: "none", color: theme.sub, fontSize: "12px", cursor: "pointer" }}
      >
        ← back
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", width: "100%", maxWidth: "300px" }}>
        {[
          ["Mode", MODES[mode].label],
          ["Round", round],
          ["Streak", streak],
        ].map(([label, val]) => (
          <div key={label} style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: "8px", padding: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: theme.sub }}>{label}</div>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ position: "relative", width: "260px", height: "260px" }}>
        <svg viewBox="0 0 308 308" style={{ position: "absolute", inset: "-14px", width: "288px", height: "288px" }}>
          <circle cx="154" cy="154" r="148" fill="none" stroke={theme.line} strokeWidth="3" />
          <circle
            cx="154"
            cy="154"
            r="148"
            fill="none"
            stroke={theme.accent}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={ringOffset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 0.4s ease" }}
          />
        </svg>
        <div
          style={{
            position: "relative",
            width: "260px",
            height: "260px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: "6px",
            borderRadius: "50%",
            overflow: "hidden",
            border: `6px solid ${theme.panel}`,
            background: theme.panel,
          }}
        >
          {PADS.map((pad, i) => {
            const ShapeIcon = pad.shape;
            const isActive = activePad === pad.id;
            const radii = [
              "100% 0 0 0",
              "0 100% 0 0",
              "0 0 0 100%",
              "0 0 100% 0",
            ];
            return (
              <button
                key={pad.id}
                onClick={() => handlePadClick(pad.id)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  background: isActive ? pad.glow : pad.color,
                  borderRadius: radii[i],
                  opacity: isActive ? 1 : 0.7,
                  transform: isActive ? "scale(0.97)" : "scale(1)",
                  transition: "all 0.12s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: i === 0 ? "flex-start" : i === 1 ? "flex-end" : i === 2 ? "flex-start" : "flex-end",
                  padding: "18px",
                }}
              >
                {colorblind && <ShapeIcon size={22} color="#2b2620" strokeWidth={2.5} />}
              </button>
            );
          })}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "78px",
              height: "78px",
              borderRadius: "50%",
              background: theme.bg,
              border: `4px solid ${theme.panel}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "13px",
              color: theme.accent,
            }}
          >
            {round || "—"}
          </div>
        </div>
      </div>

      <p
        style={{
          fontSize: "12px",
          textAlign: "center",
          minHeight: "16px",
          color: messageTone === "bad" ? "#b4685a" : messageTone === "good" ? "#6d7f6f" : theme.sub,
          maxWidth: "280px",
        }}
      >
        {message}
      </p>

      {!accepting && message.startsWith("Sequence broken") && (
        <button
          onClick={startGame}
          style={{
            padding: "10px 20px",
            background: theme.accent,
            color: "#faf6ec",
            border: "none",
            borderRadius: "8px",
            fontFamily: monoFont,
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            cursor: "pointer",
          }}
        >
          Play Again
        </button>
      )}
    </div>
  );
}
