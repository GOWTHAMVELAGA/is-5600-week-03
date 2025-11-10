// app.js
const express = require('express');
const EventEmitter = require('events');
const path = require('path');

const port = process.env.PORT || 3000;
const app = express();
const chatEmitter = new EventEmitter();

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// ----------------- Route Handlers -----------------

// Respond with JSON
function respondJson(req, res) {
  res.json({ text: 'hi', numbers: [1, 2, 3] });
}

// Respond with echo transformations
function respondEcho(req, res) {
  const { input = '' } = req.query;
  res.json({
    normal: input,
    shouty: input.toUpperCase(),
    charCount: input.length,
    backwards: input.split('').reverse().join(''),
  });
}

// Catch-all 404
function respondNotFound(req, res) {
  res.status(404).send('Not Found');
}

// Serve chat app HTML
function chatApp(req, res) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Chat App</title>
<style>
  body { font-family: sans-serif; padding: 20px; }
  #messages { border: 1px solid #ccc; padding: 10px; height: 200px; overflow-y: auto; margin-bottom: 10px; }
</style>
</head>
<body>
<h2>Chat App</h2>
<div id="messages"></div>
<form id="form">
  <input id="input" placeholder="Type a message" autocomplete="off"/>
  <button>Send</button>
</form>
<script>
  const messages = document.getElementById('messages');
  const form = document.getElementById('form');
  const input = document.getElementById('input');

  const es = new EventSource("/sse");
  es.onmessage = function(event) {
    messages.innerHTML += "<p>" + event.data + "</p>";
    messages.scrollTop = messages.scrollHeight;
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    fetch(\`/chat?message=\${encodeURIComponent(input.value)}\`);
    input.value = '';
  });
</script>
</body>
</html>`;
  res.send(html);
}

// Receive chat messages
function respondChat(req, res) {
  const { message } = req.query;
  if (message) chatEmitter.emit('message', message);
  res.end();
}

// Server-Sent Events endpoint
function respondSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
  });

  const onMessage = msg => res.write(`data: ${msg}\n\n`);
  chatEmitter.on('message', onMessage);

  req.on('close', () => chatEmitter.off('message', onMessage));
}

// ----------------- Routes -----------------
app.get('/', chatApp);
app.get('/json', respondJson);
app.get('/echo', respondEcho);
app.get('/chat', respondChat);
app.get('/sse', respondSSE);
app.use(respondNotFound);

// Start server
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
