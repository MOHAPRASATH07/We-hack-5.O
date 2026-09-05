# Research Notes — Phone-First Offline Architecture

## Key findings

| Area | Finding | Product implication |
|---|---|---|
| Device motion | `DeviceMotionEvent` is broadly available, but motion data requires a secure context and browser coordinate behavior varies. | Serve over HTTPS, normalize axes, and show a visible sensor status. Treat motion as a cue, not a definitive fall diagnosis. [1] |
| Motion permission | `DeviceMotionEvent.requestPermission()` is limited-availability and requires transient user activation such as a button click. | Put a clear “Enable motion sensing” button in onboarding; do not request motion permission on page load. [2] |
| Camera and microphone | `navigator.mediaDevices.getUserMedia()` is widely available but requires HTTPS/secure context and explicit user permission. | Stage camera and microphone permission requests separately, explain why each is needed, and handle denied/unavailable states without breaking the app. [3] |
| Offline shell | Service workers can cache app-shell assets and respond from cache when offline. Cache versioning and cleanup are required for safe updates. | Build an installable PWA with a first-run “offline readiness” check and cache indicator. [4] |
| Local inference | Heavy model downloads are a demo risk on a phone. A robust first version should make the browser’s actual signals, lightweight heuristics, and transparent fusion the core. | Use real camera frames, mic amplitude/audio activity, and motion events as traceable cues. Keep learned model adapters optional and clearly labeled until packaged/tested locally. |

## Architecture decision

The product will be **phone-first and local by default**. The phone browser is the sensing device and runs the evidence ledger, motion detection, audio activity detection, explainable risk rules, and human-confirmation workflow. A lightweight visual “smoke cue” adapter can be added behind a clearly labeled model status, but the demo must remain honest if that model is unavailable. A future local-network bridge to a laptop running Ollama can provide richer narrative explanation, but the core phone flow must not depend on it.

## Judge-facing differentiation

The strongest story is not “we detected everything.” It is: **we designed emergency AI to fail safely**. Every signal exposes provenance, confidence, freshness, and failure state; rules are inspectable; humans confirm actions; the app works without internet after first load; and reconnect sync is additive rather than required for safety.

## References

[1]: https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent "MDN: DeviceMotionEvent"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/requestPermission_static "MDN: DeviceMotionEvent.requestPermission()"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia "MDN: MediaDevices.getUserMedia()"
[4]: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Offline_Service_workers "MDN: Making a PWA work offline with service workers"
