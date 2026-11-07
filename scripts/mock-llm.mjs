// Tiny OpenAI-compatible streaming mock for manual/E2E testing: node scripts/mock-llm.mjs  (http://localhost:8787/v1)
import { createServer } from 'node:http';

const PAGE = `<!doctype html><title>Ritmo test article</title>
<body style="font:18px/1.6 sans-serif;max-width:640px;margin:40px">
<h1>How did a designer take a dating app to $4,103 MRR?</h1>
<p id=p1>A dating app that matches singles by the sports they do, from running to tennis and pilates, and runs city Run Clubs to meet in person.</p>
<p>Single people who play sport, mostly in Brazil, with French- and English-speaking users too.</p></body>`;

createServer((req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', '*');
  if (req.url === '/page') return res.writeHead(200, { 'content-type': 'text/html' }).end(PAGE);
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  let body = '';
  req.on('data', c => (body += c));
  req.on('end', () => {
    const { messages = [] } = JSON.parse(body || '{}');
    const sys = messages[0]?.content ?? '';
    const user = messages.at(-1)?.content ?? '';
    const reply = `**Mock reply**\n\n- system: ${sys.slice(0, 60)}\n- user chars: ${user.length}\n\n> ${user.slice(0, 160).replace(/\n/g, ' ')}`;
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const send = d => res.write(`data: ${JSON.stringify({ choices: [{ delta: d }] })}\n\n`);
    send({ reasoning_content: 'Reading the selection, then answering briefly. ' });
    let i = 0;
    const t = setInterval(() => {
      if (i >= reply.length) return (clearInterval(t), res.end('data: [DONE]\n\n'));
      send({ content: reply.slice(i, (i += 6)) });
    }, 25);
  });
}).listen(8787, () => console.log('mock llm on :8787'));
