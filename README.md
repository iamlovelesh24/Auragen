

## Member 2 - Interaction Telemetry

## Project Overview

AuraGen is a browser-based prototype for capturing and analyzing
user interaction behavior.

The current prototype focuses on click behavior, hesitation
detection, mouse movement telemetry, interaction patterns, and
basic telemetry validation.

## Week 1 Implementation

The following interaction features have been implemented in the
current prototype.

### 1. Click Detection

The application records the number of times the user clicks the
"Click Me" button.

The click counter increases after every valid button interaction.

### 2. Hesitation Detection

The application calculates hesitation time between user clicks.

For the first click, hesitation time is measured from the beginning
of the browser session to the first click.

For subsequent clicks, hesitation time is measured from the previous
click to the current click.

### 3. Hesitation Threshold

The prototype currently uses a hesitation threshold of:

3 seconds

If hesitation time is greater than or equal to 3 seconds, the
application identifies the interaction as:

"Hesitation detected"

If hesitation time is below 3 seconds, the application identifies
the interaction as:

"Quick interaction"

### 4. Click Pattern Detection

The prototype classifies click behavior using interaction timing
and click count.

Current patterns include:

- First click
- Hesitant interaction
- Rapid interaction
- Exploring
- High click activity
- Normal interaction

### 5. Mouse Velocity

Mouse movement velocity is calculated using:

Velocity = Distance / Time

The velocity is displayed in pixels per second.

### 6. Average Mouse Velocity

The prototype calculates average mouse velocity using total mouse
distance divided by total valid mouse movement time.

Average Velocity = Total Distance / Total Movement Time

### 7. Maximum Mouse Velocity

The highest valid mouse velocity recorded during the session is
displayed as maximum mouse velocity.

The prototype uses a maximum accepted velocity of 3000 pixels per
second to reduce unrealistic velocity spikes.

### 8. Mouse Distance

The application calculates the total distance travelled by the
mouse during the interaction session.

Distance is calculated using the movement of the mouse across the
X and Y coordinates.

### 9. Mouse Movement Time

The prototype records the total valid time associated with mouse
movement.

Very small time intervals are excluded using a minimum time
interval of 0.01 seconds.

### 10. Mouse Movement Activity

Mouse movement is classified based on the total mouse distance.

The current classifications are:

- Low movement
- Moderate movement
- High movement

### 11. Mouse Velocity Activity

Current mouse velocity is classified into:

- Slow movement
- Normal movement
- Fast movement

### 12. Interaction Event Logging

The application maintains an interaction event log.

Each recorded click event contains:

- Event number
- Time
- Click number
- Hesitation time
- Hesitation status
- Click pattern

The prototype displays the latest interaction events on the page.

The event log is limited to the latest 10 events.

### 13. Telemetry Validation

The prototype performs basic telemetry validation.

The validation checks that:

- Click count is non-negative
- Mouse distance is non-negative
- Mouse movement time is non-negative
- Mouse velocity values are non-negative
- Average mouse velocity is consistent with the calculated
  distance and movement time

The validation result is displayed as:

"Valid"

when the telemetry values pass the checks.

## Current Technical Structure

The prototype currently uses:

- HTML
- JavaScript
- Browser DOM APIs
- Mouse movement events
- Click events
- Performance timing

### Main Files

`index.html`

Contains the user interface and telemetry metric displays.

`script.js`

Contains the click detection, hesitation calculation,
mouse telemetry, interaction classification, event logging,
and telemetry validation logic.

## Testing Performed

The prototype has been tested using multiple interaction scenarios.

### Quick Interaction

Clicking the button within less than 3 seconds produces:

Quick interaction

### Hesitant Interaction

Waiting 3 seconds or longer before clicking produces:

Hesitation detected

### Repeated Interaction

Multiple clicks produce different click pattern classifications
depending on timing and click count.

### Mouse Movement

Moving the mouse across the page updates:

- Current velocity
- Velocity activity
- Average velocity
- Maximum velocity
- Mouse distance
- Mouse movement activity
- Mouse movement time

### Event Logging

Each button interaction is recorded in the Interaction Event Log.

### Telemetry Validation

The current prototype displays:

Telemetry Validation: Valid

when the collected telemetry passes the implemented validation checks.

## Week 1 Status

The current browser prototype contains the core interaction
telemetry functionality implemented for the Week 1 work.

Further development can extend the prototype with additional
telemetry storage, backend integration, real-time data streaming,
and a production-ready application architecture.

## React Telemetry Hook

### Member 2 Integration Layer

AuraGen provides a reusable React telemetry hook through:

`useAuraGenTelemetry.js`

The hook consumes the existing AuraGen telemetry API:

`window.getAuraGenTelemetry()`

It exposes the following telemetry metrics to a React component:

- Click count
- Hesitation time
- Hesitation status
- Mouse velocity
- Average mouse velocity
- Maximum mouse velocity
- Mouse distance
- Mouse movement time
- Click pattern

The hook refreshes telemetry periodically and cleans up its timer when the React component is unmounted.

### Purpose

This hook provides a bridge between the existing AuraGen JavaScript telemetry engine and a future React-based user interface without changing the current telemetry detection logic.

## Week 3: Contextual Awareness & UI Morphing

### Contextual Awareness

AuraGen now captures the current user and UI context before generating an adaptive interface.

Implemented through:

- `contextAwareness.js`
- Captures current user input and active UI state
- Captures DOM metadata such as page title, URL, forms, inputs, and element count
- Provides structured context through `getAuraGenContext()`
- Preserves user-entered information for adaptive UI generation

### UI Morphing

AuraGen now supports dynamic UI transformation based on the captured context.

Implemented through:

- `morphingUI.js`
- Dynamically transforms the existing interface into an adaptive UI
- Preserves previously entered user information
- Displays the generated contextual interface without requiring a page refresh
- Provides a foundation for future AI-generated UI components

### Week 3 Validation

The Week 3 implementation was validated through browser-based testing.

Verified:

- Context data is captured correctly
- User input is preserved
- DOM context is available
- Adaptive UI transformation completes successfully
- Contextual information is displayed in the transformed UI

## Week 4: Latency Optimization & Graceful Fallback

### Latency Optimization
- Added context-based caching for repeated UI transformations.
- Added browser performance measurement using `performance.now()`.
- Added cache hit/miss tracking.
- Reduced repeated UI processing through cached context reuse.

### Refine & Polish
- Added graceful fallback handling for UI transformation failures.
- Preserved the existing interface when adaptive UI generation fails.
- Added a user-friendly fallback notification.
- Safely replaces previously generated adaptive UI.

### Week 4 Validation
- Verified successful adaptive UI transformation.
- Verified cache miss on first transformation.
- Verified cache hit on repeated transformation.
- Verified latency measurement.
- Verified graceful fallback behavior.

# Member 3 Implementation: Real-Time Interaction Telemetry & Sliding-Window Cognitive Load Engine

## Project Overview
AuraGen is a browser-based prototype designed to capture, stream, and evaluate real-time user interaction behavior. As Member 3 (`pravalika022`), this module establishes the core backend telemetry streaming pipeline using WebSockets and processes live interaction metrics using a sliding-window cognitive load calculation engine.

The module ingests high-frequency behavioral signals—including mouse movements, cursor velocity, hesitation delays, and button interactions—and continuously evaluates user engagement and cognitive strain.

---

## Technical Scope & Architecture

### Key Deliverables
* **Real-Time Ingestion Server (`server.js`)**: A scalable WebSocket server operating on port 8080 to maintain persistent, low-latency connections with active client sessions.
* **Sliding-Window Scoring Engine (`cognitiveLoad.js`)**: An algorithmic engine that processes raw interaction events over a rolling time window to compute real-time cognitive load indicators.
* **Simulation & Verification Suite (`test-client.js`)**: An end-to-end telemetry event simulator that verifies active socket handshakes, payload ingestion, and session reset handling.
* **Module Specs & Documentation (`package.json`, `README.md`)**: Configured package manifests, npm dependencies (`ws`), and standardized repository documentation.

---

## Comprehensive Implementation Topics

### 1. WebSocket Server Initialization
* Built a dedicated WebSocket backend listening on `ws://localhost:8080`.
* Configured connection state management to handle client join/leave lifecycles cleanly.

### 2. Live Interaction Streaming Pipeline
* Configured real-time message listeners (`ws.on('message')`) to receive JSON interaction payloads.
* Maintained uninterrupted, bi-directional telemetry communication channels between browser clients and the backend engine.

### 3. Telemetry Payload Schema Validation
* Enforced schema validation for incoming JSON event structures.
* Handled edge cases such as malformed JSON, missing action types, or out-of-bounds metrics to maintain backend stability.

### 4. Sliding-Window Cognitive Load Processing Engine
* Implemented a sliding time-window algorithm to track real-time interaction density.
* Evaluates active user engagement and cognitive strain by measuring signal frequency within defined temporal boundaries.

### 5. Hesitation & Velocity Metric Integration
* Ingested hesitation metrics (measuring pause durations in milliseconds before critical user actions).
* Analyzed mouse movement dynamics, including coordinate deltas and cursor speed velocity vectors (`x`, `y`, `velocity`).

### 6. Session State Reset & Buffer Management
* Implemented listener support for `reset_session` telemetry signals.
* Clears active calculation buffers and re-initializes sliding window metrics dynamically upon receiving session reset signals.

### 7. End-to-End Simulation & Verification
* Developed `test-client.js` to emit automated sequences of simulated interaction payloads (`mouse_move`, `hesitation`, `click`, `reset_session`).
* Verified real-time transmission delays (`setTimeout` intervals) and confirmed live backend score processing logs.

---

## Current Technical File Structure

```text
AuraGen/
├── index.html
├── script.js
├── useAuraGenTelemetry.js
├── backend/langchain/websocket/
│   ├── cognitiveLoad.js    # Sliding-window cognitive load calculation engine
│   ├── server.js           # Real-time WebSocket ingestion server (port 8080)
│   ├── test-client.js      # Telemetry event simulation and execution test client
│   ├── package.json        # Dependencies (ws module) and runtime script configs
│   └── README.md           # Modular documentation and API specs
└── README.md               # Root repository documentation
```
