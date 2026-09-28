# AuraGen - Real-Time Interaction Telemetry & Sliding-Window Cognitive Load Engine

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
backend/langchain/websocket/
├── cognitiveLoad.js    # Sliding-window cognitive load calculation engine
├── server.js           # Real-time WebSocket ingestion server (port 8080)
├── test-client.js      # Telemetry event simulation and execution test client
├── package.json        # Dependencies (ws module) and runtime script configs
└── README.md           # Modular documentation and API specs
