# AuraGen - WebSocket Telemetry Ingestion & Cognitive Load Engine

Real-time backend telemetry ingestion server built with Node.js for AuraGen. It ingests live interaction events via WebSocket connections and dynamically calculates cognitive load scores.

## Project Overview

The WebSocket Telemetry Engine acts as the central ingestion hub for client-side interaction signals. It validates incoming telemetry payloads, tracks active connected clients, streams live score updates, and provides session reset capabilities.

## Week 1 Implementation

The following features have been implemented and verified in this module:

- **Real-Time WebSocket Ingestion Server (`server.js`):** Listens on port 8080 to process client telemetry streams.
- **Sliding-Window Cognitive Load Calculator (`cognitiveLoad.js`):** Computes live cognitive load metrics based on interaction duration, keypress delay, and activity frequency.
- **Payload Schema Validation & Active Client Tracking:** Rejects malformed JSON and logs connected client session IDs.
- **End-to-End Test Client (`test-client.js`):** Automated client script simulating live telemetry payloads and session resets.

## Setup & Running Instructions

1. **Install Dependencies:**
   ```bash
   npm install