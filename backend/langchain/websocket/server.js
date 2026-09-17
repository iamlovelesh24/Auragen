const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Validate required structure of telemetry payload
function validateTelemetryPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const validTypes = ['mouse_move', 'click', 'hesitation'];
  if (!validTypes.includes(payload.type)) return false;
  return true;
}

wss.on('connection', (socket) => {
  console.log('[WebSocket] Client connected');

  socket.on('message', (data) => {
    try {
      const payload = JSON.parse(data.toString());

      if (!validateTelemetryPayload(payload)) {
        console.warn('[Telemetry Validation Failed]: Malformed event structure', payload);
        socket.send(JSON.stringify({ status: 'error', message: 'Invalid telemetry schema' }));
        return;
      }

      // Route parsed event type
      switch (payload.type) {
        case 'mouse_move':
          console.log(`[Mouse Movement] Velocity: ${payload.velocity} | Coordinates: (${payload.x}, ${payload.y})`);
          break;
        case 'click':
          console.log(`[Click Event] Target: ${payload.target || 'unknown'}`);
          break;
        case 'hesitation':
          console.log(`[Hesitation Detected] Duration: ${payload.duration}ms`);
          break;
        default:
          console.log('[Telemetry Stream]:', payload);
      }

      // Acknowledge receipt
      socket.send(JSON.stringify({ status: 'ack', type: payload.type, timestamp: Date.now() }));

    } catch (err) {
      console.error('[JSON Parse Error]: Incoming message is not valid JSON');
    }
  });

  socket.on('close', () => {
    console.log('[WebSocket] Client disconnected');
  });
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);