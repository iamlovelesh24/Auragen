import React, { useState, useEffect, useRef } from "react";
import AuraContainer from "./AuraGenContainer";
import LLMFallbackBoundary from "./LLMFallbackBoundary";
import GeneratedPanel from "./src/GeneratedPanel";

const WS_URL =
  import.meta.env.VITE_WS_URL || "ws://localhost:8080";

export default function AuraGenApp() {
  const [telemetry, setTelemetry] = useState({
    score: 0,
    isOverloaded: false,
    status: "Connecting...",
  });

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const retryCount = useRef(0);
  const unmountedRef = useRef(false);

  const sendEvent = (event) => {
    const ws = socketRef.current;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  };

  const connectWebSocket = () => {
    if (unmountedRef.current) return;

    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      setTelemetry((prev) => ({
        ...prev,
        status: "Connected",
      }));

      retryCount.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        const incoming =
          data.cognitiveLoadScore !== undefined
            ? data.cognitiveLoadScore
            : data.score;

        if (incoming !== undefined) {
          setTelemetry((prev) => ({
            ...prev,
            score: incoming,
            isOverloaded: Boolean(data.isOverloaded),
          }));
        }
      } catch (err) {
        console.error(
          "Error parsing telemetry packet:",
          err
        );
      }
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;

      setTelemetry((prev) => ({
        ...prev,
        status: "Disconnected (Retrying...)",
      }));

      const delay = Math.min(
        1000 * Math.pow(2, retryCount.current),
        10000
      );

      retryCount.current += 1;

      reconnectTimeoutRef.current =
        setTimeout(connectWebSocket, delay);
    };

    ws.onerror = (err) => {
      console.error("WebSocket Error:", err);
      ws.close();
    };
  };

  useEffect(() => {
    unmountedRef.current = false;

    connectWebSocket();

    return () => {
      unmountedRef.current = true;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Backspace") {
        sendEvent({
          type: "backspace",
        });
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eff6ff, #ecfeff)",
        fontFamily:
          "Inter, system-ui, -apple-system, sans-serif",
        color: "#0f172a",
        padding: "32px",
      }}
    >
      {/* Header */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, #0f4c81, #0891b2)",
            color: "white",
            borderRadius: "20px",
            padding: "28px 32px",
            boxShadow:
              "0 12px 35px rgba(15,76,129,0.18)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "2px",
              opacity: 0.85,
            }}
          >
            ADAPTIVE AI SYSTEM
          </div>

          <h1
            style={{
              margin: "6px 0",
              fontSize: "34px",
            }}
          >
            AuraGen
          </h1>

          <p
            style={{
              margin: 0,
              opacity: 0.9,
            }}
          >
            Self-healing financial form powered by
            cognitive telemetry
          </p>
        </div>

        {/* Telemetry */}
        <div
          style={{
            marginTop: "20px",
            background: "white",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid #bae6fd",
            boxShadow:
              "0 8px 24px rgba(15,23,42,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>Live Telemetry</strong>
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "13px",
                  color: "#64748b",
                }}
              >
                Status:{" "}
                <strong>
                  {telemetry.status}
                </strong>
              </div>
            </div>

            <div
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: "#0891b2",
              }}
            >
              {telemetry.score}
            </div>
          </div>

          <div
            style={{
              marginTop: "16px",
            }}
          >
            <button
              onClick={() =>
                sendEvent({
                  type: "hesitation",
                  durationMs: 4000,
                })
              }
              style={{
                padding: "10px 16px",
                marginRight: "10px",
                border: "none",
                borderRadius: "10px",
                background: "#0891b2",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Simulate Hesitation
            </button>

            <button
              onClick={() =>
                sendEvent({
                  type: "reset_session",
                })
              }
              style={{
                padding: "10px 16px",
                border: "1px solid #bae6fd",
                borderRadius: "10px",
                background: "white",
                color: "#0f4c81",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reset Session
            </button>
          </div>
        </div>

        {/* Financial Application */}
        <div
          style={{
            marginTop: "20px",
            background: "white",
            borderRadius: "20px",
            padding: "28px",
            border: "1px solid #bae6fd",
            boxShadow:
              "0 10px 30px rgba(15,23,42,0.07)",
          }}
        >
          <div
            style={{
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                color: "#0891b2",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "1.5px",
              }}
            >
              FINANCIAL APPLICATION
            </div>

            <h2
              style={{
                margin: "6px 0",
                color: "#0f4c81",
              }}
            >
              Personal Loan Application
            </h2>

            <p
              style={{
                color: "#64748b",
                marginBottom: 0,
              }}
            >
              Complete the form below. AuraGen
              adapts the experience when cognitive
              friction is detected.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "18px",
            }}
          >
            <input
              name="fullName"
              placeholder="Full Name"
              style={inputStyle}
            />

            <input
              name="mobileNumber"
              placeholder="Mobile Number"
              style={inputStyle}
            />

            <input
              name="monthlyIncome"
              placeholder="Monthly Income"
              style={inputStyle}
            />

            <select
              name="employmentType"
              style={inputStyle}
              defaultValue=""
            >
              <option value="" disabled>
                Employment Type
              </option>
              <option>Salaried</option>
              <option>Self Employed</option>
              <option>Business Owner</option>
            </select>

            <input
              name="loanAmount"
              placeholder="Loan Amount"
              style={inputStyle}
            />

            <select
              name="loanTenure"
              style={inputStyle}
              defaultValue=""
            >
              <option value="" disabled>
                Loan Tenure
              </option>
              <option value="12">12 Months</option>
              <option value="24">24 Months</option>
              <option value="36">36 Months</option>
              <option value="60">60 Months</option>
            </select>
          </div>

          <button
            style={{
              marginTop: "24px",
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "12px",
              background:
                "linear-gradient(90deg, #0f4c81, #0891b2)",
              color: "white",
              fontSize: "15px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Continue Application
          </button>

          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              borderRadius: "12px",
              background: telemetry.isOverloaded
                ? "#ecfeff"
                : "#f8fafc",
              border: "1px solid #bae6fd",
            }}
          >
            <strong>
              Cognitive Threshold
            </strong>

            <div
              style={{
                marginTop: "5px",
                color: "#0891b2",
                fontWeight: 700,
              }}
            >
              {telemetry.isOverloaded
                ? "High Load (Focused Mode)"
                : "Normal Operations"}
            </div>
          </div>

          {/* IMPORTANT:
              This is the financial-form trigger
              for the generated redesign.
          */}
          <LLMFallbackBoundary>
            <AuraContainer
              score={telemetry.score}
            >
              <GeneratedPanel
                isOverloaded={
                  telemetry.isOverloaded
                }
                fieldName="loan_application"
                originalFieldType="financial_form"
              />
            </AuraContainer>
          </LLMFallbackBoundary>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 14px",
  border: "1px solid #bae6fd",
  borderRadius: "10px",
  fontSize: "14px",
  outline: "none",
  background: "#ffffff",
};