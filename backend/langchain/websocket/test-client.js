const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('Connected to WebSocket server.');

  // Simulated continuous telemetry stream
  const events = [
    { type: 'mouse_move', x: 120, y: 350, velocity: 1.8 },
    { type: 'hesitation', durationMs: 1200 },
    { type: 'click', target: 'buy-button' },
    { type: 'hesitation', durationMs: 2500 }
  ];

  events.forEach((event, index) => {
    setTimeout(() => {
      console.log(`Sending telemetry payload [${index + 1}]:`, event);
      ws.send(JSON.stringify(event));
    }, index * 1000);
  });
});

ws.on('message', (data) => {
  console.log('Server response:', JSON.parse(data));
});

ws.on('close', () => {
  console.log('Disconnected from server.');
});