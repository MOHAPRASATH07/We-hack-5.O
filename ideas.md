# Offline AI Emergency Copilot — Design Direction

## Three possible directions

### Theme Name: Field Manual / Signal Red
Very high-contrast emergency field-console language: warm paper, charcoal ink, and a single red signal color. It makes evidence, not decoration, feel authoritative.

**Probability:** 0.03

### Theme Name: Quiet Command
A calm, spacious command-center interface with cool slate, mist, and safety amber. It reduces panic by turning noisy sensor streams into legible decisions.

**Probability:** 0.07

### Theme Name: Night Watch
A low-light incident console with deep navy surfaces, restrained cyan instrumentation, and a safety-orange alert band. It feels operational without becoming a generic cyberpunk dashboard.

**Probability:** 0.02

## Chosen approach: Quiet Command

### Design Movement
Contemporary public-service design blended with calm-control-room ergonomics: the visual language of a modern transit operations console, softened for a person holding a phone during an emergency.

### Core Principles
1. **Calm before clever.** The interface must lower cognitive load rather than dramatize the danger.
2. **Evidence before verdict.** Every risk state is paired with a visible sensor trace, confidence, and timestamp.
3. **One decisive action.** The next safest action is visually dominant, while secondary details remain available without competing.
4. **Honest boundaries.** Unsupported sensors are clearly labeled as unavailable or simulated; the UI never implies certainty it does not have.

### Color Philosophy
Use a pale mineral background and deep ink for legibility in daylight, with a signature safety amber for live signal and a restrained emergency coral only when the risk engine crosses a threshold. Amber means “pay attention and verify,” while coral means “act now.” The palette is intentionally not red-first so the product can show uncertainty without causing panic.

### Layout Paradigm
A vertical “incident rail” rather than a centered dashboard: the top establishes current safety posture, the middle shows the evidence stack as a timeline, and the bottom keeps the human-confirmation action reachable with one thumb. On wider screens, the rail opens into a two-column operational canvas with the live camera on the left and the reasoning/evidence column on the right.

### Signature Elements
1. A slim vertical signal rail that glows amber as real sensors become active.
2. Evidence chips that pair a sensor name, a compact reading, and a provenance label such as “device motion” or “microphone input.”
3. A “why this changed” drawer that turns the rule engine into a readable chain of causes.

### Interaction Philosophy
Permission requests are staged and explained before they appear. Sensor activation is explicit. The app celebrates readiness quietly, never with confetti. Risk transitions use a short color and position shift, while the confirmation control requires a deliberate press-and-hold to prevent accidental finalization.

### Animation
Use short 160–240ms transitions for state changes, with a slower 2-second linear hold for final confirmation. Sensor activity can pulse once when a new reading arrives, but never continuously flicker. Respect reduced-motion preferences and use opacity/transform only.

### Typography System
Use **Manrope** for interface text and **DM Mono** for sensor values, timestamps, and structured JSON. Headlines are compact, weight 700, and left-aligned. Body copy is 15–16px with generous line-height. Monospace is reserved for traceability, not used decoratively.

### Brand Essence
A trustworthy offline safety companion for students, campus staff, and event operators who need a clear next action when connectivity and attention are limited.

**Personality:** calm, accountable, ready.

### Brand Voice
Headlines are direct and situational. CTAs name the action and the consequence. Microcopy says what is known, what is not known, and what the person can do next.

Example lines:
- “Three signals agree. Check the east stairwell.”
- “This recommendation is not final until a person confirms it.”

### Wordmark & Logo
A compact signal-mark formed from three offset vertical bars inside a rounded shield: the bars represent camera, audio, and motion; the shield represents human responsibility around machine inference. The mark should work without text at small sizes.

### Signature Brand Color
**Signal Amber — #F2B84B.** It is warm enough to attract attention but calm enough to use continuously as the visual language of live evidence.
