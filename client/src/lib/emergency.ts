/*
 * Quiet Command design reminder: evidence before verdict, calm public-service ergonomics,
 * and explicit provenance for every signal. This file owns the inspectable data contract.
 */

export type SignalStatus = "ready" | "active" | "blocked" | "unavailable" | "simulated";
export type RiskLevel = "LOW" | "ELEVATED" | "HIGH";

export type SensorSignal = {
  id: "camera" | "microphone" | "motion" | "operator";
  label: string;
  status: SignalStatus;
  value: string;
  numericValue?: number;
  confidence: number;
  source: string;
  observedAt: number | null;
  detail: string;
};

export type OperatorCues = {
  smokeObserved: boolean;
  alarmHeard: boolean;
  blockedExit: "unknown" | "east-stairwell" | "west-stairwell" | "both";
};

export type SituationAssessment = {
  risk: RiskLevel;
  score: number;
  headline: string;
  recommendation: string;
  nextStep: string;
  reasons: string[];
  signals: SensorSignal[];
  operatorCues: OperatorCues;
  generatedAt: number;
};

export const EMPTY_OPERATOR_CUES: OperatorCues = {
  smokeObserved: false,
  alarmHeard: false,
  blockedExit: "unknown",
};

const freshness = (observedAt: number | null) => {
  if (!observedAt) return 0;
  const age = Date.now() - observedAt;
  if (age < 3000) return 1;
  if (age < 12000) return 0.7;
  return 0.35;
};

export function assessSituation(signals: SensorSignal[], operatorCues: OperatorCues): SituationAssessment {
  const motion = signals.find((signal) => signal.id === "motion");
  const audio = signals.find((signal) => signal.id === "microphone");
  const camera = signals.find((signal) => signal.id === "camera");
  const reasons: string[] = [];
  let score = 0;

  if (operatorCues.smokeObserved) {
    score += 42;
    reasons.push("Operator marked visible smoke.");
  }
  if (operatorCues.alarmHeard) {
    score += 28;
    reasons.push("Operator marked an audible alarm.");
  }
  if (motion?.status === "active" && (motion.numericValue ?? 0) >= 2.2) {
    score += Math.min(22, Math.round((motion.numericValue ?? 0) * 4));
    reasons.push(`Motion spike measured at ${motion.value}.`);
  }
  if (audio?.status === "active" && (audio.numericValue ?? 0) >= 0.12) {
    score += 12;
    reasons.push(`Microphone energy is elevated at ${audio.value}.`);
  }
  if (camera?.status === "active" && (camera.numericValue ?? 0) > 0) {
    reasons.push(`${camera.value} detected by the on-device vision model.`);
  }
  if (operatorCues.blockedExit !== "unknown") {
    score += operatorCues.blockedExit === "both" ? 25 : 15;
    reasons.push(`${operatorCues.blockedExit === "both" ? "Both" : operatorCues.blockedExit === "east-stairwell" ? "East" : "West"} stairwell marked blocked.`);
  }

  const confidenceInputs = signals
    .filter((signal) => signal.status === "active" || signal.status === "simulated")
    .map((signal) => signal.confidence * freshness(signal.observedAt));
  const confidence = confidenceInputs.length ? confidenceInputs.reduce((sum, value) => sum + value, 0) / confidenceInputs.length : 0;
  score = Math.min(100, Math.round(score * (0.7 + confidence * 0.3)));

  const risk: RiskLevel = score >= 65 ? "HIGH" : score >= 30 ? "ELEVATED" : "LOW";
  const headline = risk === "HIGH" ? "Potential fire signal" : risk === "ELEVATED" ? "Verify before moving" : "No active hazard confirmed";
  const recommendation = risk === "HIGH"
    ? operatorCues.blockedExit === "east-stairwell"
      ? "Avoid the east stairwell. Move toward the west exit and alert people nearby."
      : operatorCues.blockedExit === "west-stairwell"
        ? "Avoid the west stairwell. Move toward the east exit and alert people nearby."
        : "Move away from the observed signal and check the nearest clear exit."
    : risk === "ELEVATED"
      ? "Pause, scan the nearest exit, and ask another person to verify the signal."
      : "Keep the phone ready and continue monitoring local signals.";
  const nextStep = risk === "HIGH" ? "Human confirmation required before logging this action." : "Continue sensing; no action has been finalized.";

  return {
    risk,
    score,
    headline,
    recommendation,
    nextStep,
    reasons: reasons.length ? reasons : ["No active operator cue or sensor threshold is currently present."],
    signals,
    operatorCues,
    generatedAt: Date.now(),
  };
}

export function formatRelativeTime(timestamp: number | null) {
  if (!timestamp) return "Waiting";
  const delta = Math.max(0, Date.now() - timestamp);
  if (delta < 1000) return "just now";
  if (delta < 60000) return `${Math.round(delta / 1000)}s ago`;
  return `${Math.round(delta / 60000)}m ago`;
}

export function exportAssessment(assessment: SituationAssessment) {
  return JSON.stringify({
    schema: "offline-emergency-copilot/v1",
    assessment,
    trace: "Generated locally from browser sensor readings and operator cues. No cloud request made.",
  }, null, 2);
}
