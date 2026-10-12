AuraGen — Self-Healing Generative UI
An adaptive financial application that detects user interaction friction and dynamically transforms the UI when cognitive load becomes high.

Overview
AuraGen is a self-healing Generative UI system designed to improve user experience by detecting signs of cognitive friction during form interaction.
The system captures real-time interaction telemetry such as mouse movement, velocity, clicks, and hesitation. These signals are used to determine the user's cognitive-load state.
When high cognitive load is detected, AuraGen triggers a backend generation pipeline that:
1. Captures the current UI context and user state
2. Sends the context to the LangChain + Groq generation pipeline
3. Generates React UI code
4. Validates the generated code using Babel
5. Compiles the validated component
6. Dynamically renders an adaptive financial experience
The financial application demonstrates this through a focused, step-by-step wizard.
Architecture
                    USER
                     │
                     ▼
             React Financial Form
                     │
                     ▼
            Interaction Telemetry
        ┌────────────┼────────────┐
        │            │            │
     Movement     Clicks      Hesitation
        │            │            │
        └────────────┼────────────┘
                     ▼
             Cognitive Load Score
                     │
                     ▼
             High Load Detection
                     │
                     ▼
              WebSocket Layer
                     │
                     ▼
             FastAPI Backend
                     │
                     ▼
            LangChain + Groq
                     │
                     ▼
             React Code Generation
                     │
                     ▼
              Babel Validation
                     │
                     ▼
             Component Compilation
                     │
                     ▼
              Dynamic Rendering
                     │
                     ▼
          AuraGen Adaptive Wizard
Key Features
Real-Time Telemetry
Tracks user interaction signals including:
- Mouse movement
- Mouse velocity
- Click activity
- Hesitation
- Interaction patterns
Cognitive Load Detection
Telemetry signals are converted into a cognitive-load state.
Normal Operations
        ↓
High Load
        ↓
Focused Mode
Generative UI Pipeline
AuraGen uses a backend generation pipeline powered by:
- FastAPI
- LangChain
- Groq
- React
- Babel validation
Generated UI code is validated before being rendered.
Adaptive Financial Wizard
The financial application can transform into a focused six-step experience:
1. Full Name
2. Mobile Number
3. Monthly Income
4. Employment Type
5. Loan Amount
6. Loan Tenure
The wizard supports:
- Step-by-step navigation
- Back / Continue controls
- Input preservation
- Validation
- Application submission
Context Awareness
The generation request includes relevant UI context and current field values so that the adaptive experience can preserve the user's existing information.
Safety & Fallback
Generated UI code passes through a validation layer before rendering.
Fallback handling is also provided when generated output cannot safely be rendered.
Performance Monitoring
AuraGen records generation pipeline timings including:
- First response chunk
- Final validation
- Compilation
- Rendering
Technology Stack
Layer	Technology
Frontend	React + Vite
UI Animation	Framer Motion
Telemetry	JavaScript / React
Real-Time Communication	WebSocket
Backend API	FastAPI
AI Orchestration	LangChain
LLM	Groq
Code Validation	Babel
Frontend Deployment	Vercel
Backend Deployment	Render
WebSocket Deployment	Render


Project Structure
Auragen/
│
├── src/
│   ├── AuraGenApp.jsx
│   └── GeneratedPanel.jsx
│
├── backend/
│   └── langchain/
│       ├── codegen.py
│       ├── prompts.py
│       ├── stream_api.py
│       ├── dom_sanitizer.py
│       ├── babel_bridge.py
│       ├── test_codegen.py
│       │
│       ├── babel_validator/
│       │   └── validate.mjs
│       │
│       └── websocket/
│           └── server.js
│
├── package.json
├── vite.config.js
└── README.md
Live Demo
Production Frontend
https://auragen-blush.vercel.app
Production Architecture
                    Vercel
                      │
                      ▼
              React / Vite Frontend
                 │            │
                 │            │
            WebSocket       HTTP/SSE
                 │            │
                 ▼            ▼
             Render        Render
          WebSocket       FastAPI
            Server         Backend
                              │
                              ▼
                           Groq LLM
Running Locally
AuraGen uses three services during local development.
1. Start the WebSocket Server
cd C:\Users\Ruchitha\Auragen\backend\langchain\websocket
node server.js
The telemetry WebSocket server runs on:
ws://localhost:8080
2. Start the FastAPI Backend
cd C:\Users\Ruchitha\Auragen\backend\langchain
uvicorn stream_api:app --reload --port 8000
The API runs on:
http://localhost:8000
3. Start the Frontend
cd C:\Users\Ruchitha\Auragen
npm run dev
Open the Vite URL displayed in the terminal.
Demo Flow
1. Open the production application.
2. Confirm Status: Connected.
3. Use Simulate Hesitation until High Load (Focused Mode) appears.
4. Click Generate redesign.
5. Observe the generation, validation, compilation and rendering timings.
6. Complete the six-step AuraGen Adaptive Wizard.
7. Click Submit Application.
Team Contributions
- Member 1: Mouse movement and velocity telemetry
- Member 2: Click and hesitation detection
- Member 3: WebSocket telemetry communication
- Member 4: LangChain / Groq code generation and validation
- Team Integration: Context awareness, adaptive UI, fallback handling, performance optimization and deployment
Security
AuraGen follows a server-side secret management approach.
Do not commit API keys to GitHub.
The Groq API key is stored as a deployment environment variable on the backend.
Frontend environment variables should contain only non-secret configuration such as:
VITE_API_URL
VITE_WS_URL
Important Implementation Note
For the financial-form use case, the final six-step adaptive wizard is implemented through the application's financial wizard wrapper.
The backend generation pipeline still executes the generation, validation, compilation, and rendering flow as part of the redesign process.
This provides a reliable and controlled demonstration of the adaptive financial experience while maintaining the generative UI pipeline.
Project Outcome
AuraGen demonstrates how an application can move beyond static interfaces by responding to how a user interacts with the UI, rather than waiting for the user to explicitly request assistance.
Detect Friction
      ↓
Understand Context
      ↓
Generate Adaptation
      ↓
Validate Safely
      ↓
Render Better UI
AuraGen
Interfaces that adapt to the user.