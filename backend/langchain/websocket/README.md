# WebSocket Telemetry Server (AuraGen)

Real-time telemetry ingestion and cognitive load calculation service for AuraGen.

## Features
- **WebSocket Gateway (`ws://localhost:8080`)**: Ingests real-time interaction signals from client apps.
- **Sliding Window Calculator**: Computes user cognitive load based on interaction events (`hesitation`, `mouse_move`, `backspace`, `rapid_click`, etc.).
- **Session Management**: Tracks active clients with unique connection IDs (`client_xxxx`).
- **Session Reset**: Supports explicit `reset_session` commands to flush active telemetry buffers.

## Quick Start

### 1. Install Dependencies
```bash
npm install