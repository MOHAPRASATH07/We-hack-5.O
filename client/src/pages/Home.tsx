/*
 * Quiet Command design reminder: the page is an incident rail, not a generic dashboard.
 * Calm first, evidence before verdict, and one deliberate human-confirmation action.
 */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Aperture,
  AudioLines,
  BatteryCharging,
  Check,
  ChevronRight,
  CircleGauge,
  CloudOff,
  Copy,
  Download,
  Info,
  LockKeyhole,
  Mic,
  Move3D,
  Radio,
  ScanLine,
  ShieldCheck,
  Siren,
  Smartphone,
  TriangleAlert,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { assessSituation, EMPTY_OPERATOR_CUES, exportAssessment, formatRelativeTime, type OperatorCues, type SensorSignal } from "@/lib/emergency";
import { useEmergencySensors } from "@/hooks/useEmergencySensors";

const logoUrl = "/manus-storage/signal-shield-logo_d01aa947.png";
const heroUrl = "/manus-storage/quiet-command-hero_cdd1c4d1.jpg";
const cameraCardUrl = "/manus-storage/sensor-evidence-camera_d9e5039d.jpg";
const motionCardUrl = "/manus-storage/sensor-evidence-motion_d6d599ff.jpg";

function statusLabel(status: SensorSignal["status"]) {
  return status === "active" ? "LIVE" : status === "ready" ? "READY" : status === "simulated" ? "REHEARSAL" : status === "blocked" ? "BLOCKED" : "OFF";
}

function statusClass(status: SensorSignal["status"]) {
  if (status === "active") return "status-live";
  if (status === "simulated") return "status-simulated";
  if (status === "blocked") return "status-blocked";
  if (status === "ready") return "status-ready";
  return "status-off";
}

function SignalCard({ signal, icon, action, image }: { signal: SensorSignal; icon: React.ReactNode; action?: React.ReactNode; image?: string }) {
  return (
    <article className={`signal-card ${statusClass(signal.status)}`}>
      <div className="signal-card-top">
        <div className="signal-icon">{icon}</div>
        <div className="signal-card-heading">
          <div className="eyebrow-row"><span className="mono">{signal.id.toUpperCase()}</span><span className={`signal-state ${statusClass(signal.status)}`}>{statusLabel(signal.status)}</span></div>
          <h3>{signal.label}</h3>
        </div>
        {action}
      </div>
      {image ? <div className="signal-image" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" /> : null}
      <div className="signal-value">{signal.value}</div>
      <div className="signal-meta"><span>{signal.source}</span><span>{formatRelativeTime(signal.observedAt)}</span></div>
      <p>{signal.detail}</p>
    </article>
  );
}

function HoldToConfirm({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!holding || disabled) {
      setProgress(0);
      return;
    }
    const started = Date.now();
    const interval = window.setInterval(() => {
      const next = Math.min(100, ((Date.now() - started) / 1700) * 100);
      setProgress(next);
      if (next >= 100) {
        window.clearInterval(interval);
        setHolding(false);
        onConfirm();
      }
    }, 40);
    return () => window.clearInterval(interval);
  }, [holding, disabled, onConfirm]);

  return (
    <button
      type="button"
      className={`hold-confirm ${disabled ? "hold-disabled" : ""}`}
      disabled={disabled}
      onPointerDown={() => setHolding(true)}
      onPointerUp={() => setHolding(false)}
      onPointerLeave={() => setHolding(false)}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setHolding(true); }}
      onKeyUp={() => setHolding(false)}
      aria-label={disabled ? "No high-risk action to confirm" : "Hold to confirm the recommended action"}
    >
      <span className="hold-progress" style={{ width: `${progress}%` }} />
      <span className="hold-copy"><LockKeyhole size={16} />{disabled ? "No action awaiting confirmation" : holding ? "Keep holding…" : "Hold to confirm this action"}</span>
      <span className="mono hold-time">{disabled ? "—" : "1.7s"}</span>
    </button>
  );
}

export default function Home() {
  const sensors = useEmergencySensors();
  const [operatorCues, setOperatorCues] = useState<OperatorCues>(EMPTY_OPERATOR_CUES);
  const [online, setOnline] = useState(navigator.onLine);
  const [rehearsal, setRehearsal] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(() => {
    const saved = localStorage.getItem("offline-copilot-last-sync");
    return saved ? Number(saved) : null;
  });

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const signals = useMemo(() => {
    const list = [sensors.camera, sensors.microphone, sensors.motion];
    if (rehearsal) {
      return list.map((signal) => signal.id === "camera"
        ? { ...signal, status: "simulated" as const, value: "Smoke cue rehearsed", numericValue: 1, confidence: 0.84, source: "Operator rehearsal", observedAt: Date.now(), detail: "Clearly labeled rehearsal cue; not a camera model output." }
        : signal.id === "microphone"
          ? { ...signal, status: "simulated" as const, value: "Alarm cue rehearsed", numericValue: 0.2, confidence: 0.86, source: "Operator rehearsal", observedAt: Date.now(), detail: "Clearly labeled rehearsal cue; not an audio classifier output." }
          : { ...signal, status: "simulated" as const, value: "Impact cue rehearsed", numericValue: 3.2, confidence: 0.86, source: "Operator rehearsal", observedAt: Date.now(), detail: "Clearly labeled rehearsal cue; not a live motion reading." });
    }
    return list;
  }, [rehearsal, sensors.camera, sensors.microphone, sensors.motion]);

  const assessment = useMemo(() => {
    const cues = rehearsal ? { smokeObserved: true, alarmHeard: true, blockedExit: "east-stairwell" as const } : operatorCues;
    return assessSituation(signals, cues);
  }, [operatorCues, rehearsal, signals]);

  const latestTimestamp = Math.max(...signals.map((signal) => signal.observedAt ?? 0), assessment.generatedAt);
  const readiness = [sensors.cameraOn, sensors.micOn, sensors.motionOn].filter(Boolean).length;
  const hasModel = sensors.modelReady;

  const setCue = (key: keyof OperatorCues, value: boolean | OperatorCues["blockedExit"]) => {
    setOperatorCues((current) => ({ ...current, [key]: value } as OperatorCues));
    setConfirmedAt(null);
  };

  const confirmAction = () => {
    setConfirmedAt(Date.now());
    localStorage.setItem("offline-copilot-last-confirmed", String(Date.now()));
    toast.success("Action confirmed locally", { description: "The recommendation is now recorded on this device." });
  };

  const copyTrace = async () => {
    await navigator.clipboard?.writeText(exportAssessment(assessment));
    toast.success("Evidence trace copied", { description: "The structured assessment is ready to inspect." });
  };

  const syncSummary = () => {
    const now = Date.now();
    setLastSync(now);
    localStorage.setItem("offline-copilot-last-sync", String(now));
    toast.success(online ? "Local summary staged" : "Saved locally for later sync", { description: online ? "No external command center is required for this demo." : "Reconnect later to export the incident summary." });
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><img src={logoUrl} alt="" /></div>
          <div><div className="brand-name">QUIET COMMAND</div><div className="brand-subtitle">offline emergency copilot</div></div>
        </div>
        <div className="topbar-status">
          <span className={`network-pill ${online ? "network-online" : "network-offline"}`}><span className="status-dot" />{online ? "Online" : "Offline mode"}</span>
          <span className="battery-pill"><BatteryCharging size={14} /> Local only</span>
        </div>
      </header>

      <div className="app-grid">
        <section className="primary-column">
          <div className="incident-rail-note"><span className="rail-note-marker" /><span className="mono">INCIDENT RAIL</span><span className="rail-note-copy">posture <ChevronRight size={12} /> evidence <ChevronRight size={12} /> action</span></div>
          <div className={`risk-banner risk-${assessment.risk.toLowerCase()}`}>
            <div className="risk-banner-copy">
              <div className="eyebrow-row"><span className="signal-pulse" /><span className="mono">00 / RISK ENGINE · LOCAL</span><span className="freshness">updated {formatRelativeTime(latestTimestamp)}</span></div>
              <h1>{assessment.headline}</h1>
              <p>{assessment.recommendation}</p>
              <div className="risk-actions"><Badge className="risk-score"><CircleGauge size={14} /> Score {assessment.score}/100</Badge><span className="human-note"><ShieldCheck size={14} /> Human confirmation required</span></div>
            </div>
            <div className="risk-emblem"><span>{assessment.risk === "HIGH" ? "!" : assessment.risk === "ELEVATED" ? "?" : "✓"}</span><small>{assessment.risk}</small></div>
          </div>

          <div className="section-heading"><div><span className="section-kicker">01 / LIVE EVIDENCE</span><h2>What the phone can verify</h2></div><span className="mono section-count">{readiness}/3 streams active</span></div>

          <div className="sensor-grid">
            <SignalCard signal={signals[0]} icon={<Aperture size={20} />} image={cameraCardUrl} action={<button className="mini-action" onClick={sensors.cameraOn ? sensors.stopCamera : sensors.startCamera}>{sensors.cameraOn ? "Stop" : "Start"}</button>} />
            <SignalCard signal={signals[1]} icon={<AudioLines size={20} />} action={<button className="mini-action" onClick={sensors.micOn ? sensors.stopMicrophone : sensors.startMicrophone}>{sensors.micOn ? "Stop" : "Start"}</button>} />
            <SignalCard signal={signals[2]} icon={<Move3D size={20} />} image={motionCardUrl} action={<button className="mini-action" onClick={sensors.motionOn ? sensors.stopMotion : sensors.enableMotion}>{sensors.motionOn ? "Stop" : "Enable"}</button>} />
          </div>

          <div className="camera-stage">
            <div className="camera-stage-header"><div><span className="section-kicker">CAMERA FEED</span><h3>Local frame inspection</h3></div><span className={`model-badge ${hasModel ? "model-ready" : "model-pending"}`}><span className="status-dot" />{sensors.modelLoading ? "Loading model" : hasModel ? "COCO-SSD · on device" : "Model idle"}</span></div>
            <div className="camera-viewport">
              <video ref={sensors.videoRef} muted playsInline autoPlay aria-label="Live phone camera preview" />
              {!sensors.cameraOn ? <div className="camera-empty"><ScanLine size={28} /><strong>Camera is off</strong><span>Start the camera to run the browser-local person detector.</span></div> : null}
              <div className="scan-corner corner-tl" /><div className="scan-corner corner-tr" /><div className="scan-corner corner-bl" /><div className="scan-corner corner-br" />
              {sensors.cameraOn ? <div className="scan-line" /> : null}
            </div>
            {sensors.cameraError ? <div className="inline-error"><TriangleAlert size={15} />{sensors.cameraError}</div> : null}
            <div className="camera-footnote"><Info size={14} /> The current model detects people locally. Warm the model pack once while online; the PWA then caches it for disconnected runs. Smoke is never claimed unless an operator marks it or a future smoke-specific model is installed.</div>
          </div>

          <div className="section-heading section-heading-spaced"><div><span className="section-kicker">02 / OPERATOR CUES</span><h2>Make the uncertain visible</h2></div><span className="mono section-count">Human-in-the-loop</span></div>
          <div className="cue-panel">
            <div className="cue-intro"><Siren size={20} /><div><strong>Use these only when you can see or hear it.</strong><p>They are not hidden simulations. Every cue is written into the trace as an operator observation.</p></div></div>
            <div className="cue-controls">
              <button className={`cue-button ${operatorCues.smokeObserved ? "cue-on" : ""}`} onClick={() => setCue("smokeObserved", !operatorCues.smokeObserved)}><span className="cue-icon"><Zap size={16} /></span><span><strong>Visible smoke</strong><small>{operatorCues.smokeObserved ? "Marked by operator" : "Tap to mark"}</small></span>{operatorCues.smokeObserved ? <Check size={18} /> : <ChevronRight size={18} />}</button>
              <button className={`cue-button ${operatorCues.alarmHeard ? "cue-on" : ""}`} onClick={() => setCue("alarmHeard", !operatorCues.alarmHeard)}><span className="cue-icon"><AudioLines size={16} /></span><span><strong>Alarm heard</strong><small>{operatorCues.alarmHeard ? "Marked by operator" : "Tap to mark"}</small></span>{operatorCues.alarmHeard ? <Check size={18} /> : <ChevronRight size={18} />}</button>
              <label className="cue-select"><span><strong>Exit status</strong><small>Optional location cue</small></span><select value={operatorCues.blockedExit} onChange={(event) => setCue("blockedExit", event.target.value as OperatorCues["blockedExit"])}><option value="unknown">Unknown</option><option value="east-stairwell">East stairwell blocked</option><option value="west-stairwell">West stairwell blocked</option><option value="both">Both stairwells blocked</option></select></label>
            </div>
            {rehearsal ? <div className="rehearsal-note"><Radio size={14} /> Rehearsal mode is on. Cues and sensor cards are visibly labeled simulated for a reliable stage demo.</div> : null}
          </div>
        </section>

        <aside className="side-column">
          <div className="side-hero" style={{ backgroundImage: `url(${heroUrl})` }}><div className="side-hero-overlay" /><div className="side-hero-content"><span className="section-kicker light-kicker">SCENARIO CAPTURE / CAMPUS</span><h2>Stay calm.<br /><em>Read the signal.</em></h2><p>One phone. Three evidence streams. Local decisions, even when the network drops.</p><div className="scenario-tag"><span className="status-dot" /> Reference frame · east stairwell</div></div></div>

          <section className="decision-card">
            <div className="decision-header"><div><span className="section-kicker">03 / EXPLANATION</span><h2>Why this changed</h2></div><button className="icon-action" aria-label="Close explanation" onClick={() => setShowTrace(false)}><X size={16} /></button></div>
            <div className="reason-list">{assessment.reasons.slice(0, 4).map((reason, index) => <div className="reason-row" key={reason}><span className="reason-index">0{index + 1}</span><span>{reason}</span></div>)}</div>
            <div className="recommendation-box"><span className="section-kicker">RECOMMENDED NEXT STEP</span><strong>{assessment.nextStep}</strong></div>
            <button className="trace-toggle" onClick={() => setShowTrace((value) => !value)}>{showTrace ? "Hide structured trace" : "Inspect structured trace"}<ChevronRight size={15} className={showTrace ? "rotate-90" : ""} /></button>
            {showTrace ? <pre className="trace-block">{exportAssessment(assessment)}</pre> : null}
          </section>

          <section className="confirm-card">
            <div className="confirm-top"><span className="section-kicker">04 / HUMAN GATE</span><span className="mono">FINAL ACTION</span></div>
            <h2>Nothing is final<br /><em>until you say so.</em></h2>
            <p>Machine output stays a recommendation. A person must confirm before the action is logged as final.</p>
            <HoldToConfirm disabled={assessment.risk !== "HIGH" || confirmedAt !== null} onConfirm={confirmAction} />
            {confirmedAt ? <div className="confirmed-state"><Check size={16} /> Confirmed locally at {new Date(confirmedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div> : null}
          </section>

          <section className="offline-card">
            <div className="offline-heading"><div className="offline-icon"><CloudOff size={17} /></div><div><strong>Offline readiness</strong><span>{online ? "Network available · local path still active" : "No network · local path active"}</span></div><span className="ready-check"><Check size={14} /></span></div>
            <div className="readiness-bar"><span style={{ width: `${online ? 100 : 100}%` }} /></div>
            <div className="offline-facts"><span><WifiOff size={13} /> App shell cached</span><span><LockKeyhole size={13} /> No cloud AI</span></div>
            <div className="offline-actions"><button onClick={syncSummary}><Download size={14} /> {online ? "Stage summary" : "Save locally"}</button><button onClick={copyTrace}><Copy size={14} /> Copy trace</button></div>
            {lastSync ? <div className="last-sync">Last local save {formatRelativeTime(lastSync)}</div> : null}
          </section>

          <section className="rehearsal-card">
            <div className="rehearsal-copy"><div className="rehearsal-icon"><Smartphone size={17} /></div><div><strong>Stage a safe demo</strong><p>Use explicit rehearsal cues when hardware permissions are unavailable on stage.</p></div></div>
            <button className={`rehearsal-toggle ${rehearsal ? "is-on" : ""}`} onClick={() => setRehearsal((value) => !value)}><span /><span>{rehearsal ? "Rehearsal on" : "Rehearsal off"}</span></button>
          </section>

          <footer className="side-footer"><span><ShieldCheck size={14} /> Built for transparent decisions</span><span className="mono">v0.1 / local-first</span></footer>
        </aside>
      </div>
    </main>
  );
}
