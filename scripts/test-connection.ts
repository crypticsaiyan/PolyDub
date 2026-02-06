import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8080?source=en&target=es');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  
  // Send a dummy audio buffer (silence) just to test data flow
  const silence = Buffer.alloc(32000); // ~1 sec of silence at 16kHz
  ws.send(silence);
  console.log('📡 Sent dummy audio data');
  
  setTimeout(() => {
    console.log('⏹️ Closing connection');
    ws.close();
  }, 1000);
});

ws.on('message', (data) => {
  console.log('📩 Received message from server:', data.toString());
});

ws.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
});

ws.on('close', () => {
  console.log('Disconnected');
});
