const WebSocket = require('ws');
const CognitiveLoadCalculator = require('./cognitiveLoad');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });
const calculator = new CognitiveLoadCalculator();

console.log(`WebSocket telemetry server running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('Client connected to telemetry stream.');

  ws.on('message', (message) => {
    try {
      const payload = JSON.parse(message);
      
      if (!payload.type) {
        ws.send(JSON.stringify({ status: 'error', message: 'Missing event type' }));
        return;
      }

      calculator.addEvent(payload);
      const score = calculator.calculateScore();
      const overloaded = calculator.isOverloaded();

      console.log(`[Telemetry Event]: ${payload.type} | Score: ${score} | Overloaded: ${overloaded}`);

      ws.send(JSON.stringify({
        status: 'received',
        cognitiveLoadScore: score,
        isOverloaded: overloaded
      }));

    } catch (err) {
      ws.send(JSON.stringify({ status: 'error', message: 'Invalid JSON payload' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected.');
  });
});