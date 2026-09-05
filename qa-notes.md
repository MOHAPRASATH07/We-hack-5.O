# QA Notes

## Live workflow verification

The live app loaded over HTTPS with the Quiet Command title and the expected mobile-first incident rail. The default state is calm and honest: no active hazard, score 0/100, all streams off, and no final action available.

The explicit rehearsal toggle successfully changed the page into a high-risk stage-demo state. It visibly labeled camera, microphone, and motion inputs as `REHEARSAL` with `Operator rehearsal` provenance, produced a HIGH risk score, changed the recommendation to avoid the east stairwell, and enabled the human-confirmation hold control. This prevents simulated evidence from being mistaken for live detection.

The structured trace control opened a readable JSON payload containing schema version, risk score, recommendation, reasons, signal provenance, confidence, operator cues, and a local-only trace statement. This is the primary explainability proof for judges.

## Build verification

`pnpm run check` passed. `pnpm run build` passed. Vite reports a large JavaScript chunk warning because the static template and TensorFlow runtime remain substantial, but the local vision model was code-split so it loads only when camera sensing starts.

## Known demo truth

Camera and microphone permissions must be granted on the phone. Device motion permission must be requested from the explicit Enable button because some mobile browsers require transient user activation. The browser-local person model should be warmed once while online; the service worker caches future requests for disconnected operation. This build does not claim smoke classification or alarm classification; those are operator cues until a tested model adapter is added.
