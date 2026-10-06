import React, { useState, useEffect, useRef } from 'react';
import AuraContainer from './components/AuraContainer';
import LLMFallbackBoundary from './components/LLMFallbackBoundary';

export const AuraGenApp = () => {
  const [telemetry, setTelemetry] = useState({ score: 45, status: 'Connecting...' });
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const retryCount = useRef(0);

  const connectWebSocket = () => {
    const ws = new WebSocket('ws://localhost:8080');
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected to telemetry server');
      setTelemetry((prev) => ({ ...prev, status: 'Connected' }));
      retryCount.current = 0; // Reset reconnect attempts
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.score !== undefined) {
          setTelemetry((prev) => ({ ...prev, score: data.score }));
        }
      } catch (err) {
        console.error('Error parsing telemetry packet:', err);
      }
    };

    ws.onclose = () => {
      setTelemetry((prev) => ({ ...prev, status: 'Disconnected (Retrying...)' }));
      // Exponential backoff strategy
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 10000);
      retryCount.current += 1;
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      ws.close();
    };
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h2>AuraGen Live Telemetry Dashboard</h2>
      <p>
        Status: <strong>{telemetry.status}</strong> | Live Score: <strong>{telemetry.score}</strong>
      </p>

      <LLMFallbackBoundary>
        <AuraContainer score={telemetry.score}>
          <h3>Current Workspace State</h3>
          <p>
            Cognitive Threshold Level:{' '}
            <strong>
              {telemetry.score > 70 ? 'High Load (Focused Mode)' : 'Normal Operations'}
            </strong>
          </p>
        </AuraContainer>
      </LLMFallbackBoundary>
    </div>
  );
};

export default AuraGenApp;