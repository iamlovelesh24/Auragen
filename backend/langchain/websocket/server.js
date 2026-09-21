const WebSocket = require('ws');
const CognitiveLoadCalculator = require('./cognitiveLoad');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });
const calculator = new CognitiveLoadCalculator();

let activeClientsCount = 0;

console.log(`WebSocket telemetry server running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  activeClientsCount++;
  const clientId = `client_${Math.random().toString(36).substring(2, 9)}`;
  console.log(`[${clientId}] Connected to telemetry stream. Total active: ${activeClientsCount}`);

  ws.on('message', (message) => {
    try {
      const payload = JSON.parse(message);
      
      if (!payload || typeof payload !== 'object' || !payload.type) {
        ws.send(JSON.stringify({ 
          status: 'error', 
          message: 'Invalid payload schema: "type" property is required' 
        }));
        return;
      }

      calculator.addEvent(payload);
      const score = calculator.calculateScore();
      const overloaded = calculator.isOverloaded();

      console.log(`[${clientId} Telemetry Event]: ${payload.type} | Score: ${score} | Overloaded: ${overloaded}`);

      ws.send(JSON.stringify({
        status: 'received',
        clientId: clientId,
        cognitiveLoadScore: score,
        isOverloaded: overloaded,
        timestamp: Date.now()
      }));

    } catch (err) {
      ws.send(JSON.stringify({ status: 'error', message: 'Invalid JSON format' }));
    }
  });

  ws.on('close', () => {
    activeClientsCount--;
    console.log(`[${clientId}] Disconnected. Total active: ${activeClientsCount}`);
  });
});