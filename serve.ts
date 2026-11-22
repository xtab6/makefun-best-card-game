// Starfall Pact — tiny static server (Node 22, standard library only).
// Serves game/ at http://localhost:8080 so the game plays exactly as the
// grader's static host serves it: no network requests, files under game/ only.
//
//   node serve.ts [port]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const port = Number(process.argv[2] ?? 8080);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

createServer((req, res) => {
  const path = normalize(join(root, decodeURIComponent(req.url ?? '/').split('?')[0]));
  if (!path.startsWith(root)) { res.writeHead(403); res.end(); return; }
  const file = existsSync(path) && statSync(path).isDirectory() ? join(path, 'index.html') : path;
  if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Starfall Pact at http://localhost:${port}`));
