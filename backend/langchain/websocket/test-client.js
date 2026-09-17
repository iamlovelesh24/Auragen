const WebSocket = require('ws');
const socket = new WebSocket('ws://localhost:8080');

socket.on('open', () => {
  console.log('Streaming test telemetry batches...');

  // 1. Send valid hesitation event
  socket.send(JSON.stringify({
    type: 'hesitation',
    duration: 1200,
    timestamp: Date.now()
  }));

  // 2. Send malformed event after 500ms (testing validation error response)
  setTimeout(() => {
    socket.send(JSON.stringify({ invalidField: true }));
  }, 500);
});

socket.on('message', (response) => {
  console.log('[Server Feedback]:', response.toString());
});