const http = require('http'), fs = require('fs'), path = require('path');
const { authenticate } = require('./middleware/auth');
const { readBody, HttpError } = require('./middleware/http');
const routes = require('./routes');
const db = require('./db');
const { escalateOverdue } = require('./controllers/complaints');
const { loadUser } = require('./controllers/auth');

const FRONT = path.join(__dirname, '..', 'frontend');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const SEC = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' blob:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'" };

function send(res, status, body, type = 'application/json', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, ...SEC, ...extra });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

async function handleApi(req, res, url) {
  try {
    const route = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
    if (!route) return send(res, 404, { error: 'Not found' });
    let user = null;
    if (route.roles) {
      const t = authenticate(req);
      const row = t && db.prepare('SELECT id, role, active FROM users WHERE id = ?').get(t.id);
      if (!row || !row.active) return send(res, 401, { error: 'Please sign in again' });
      user = { id: row.id, role: row.role };               // role always re-read from the database
      if (route.roles.length && !route.roles.includes(user.role)) return send(res, 403, { error: 'You do not have permission to do that' });
    }
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
    const params = { ...route.re.exec(url.pathname).groups };
    const out = await route.handler({ req, user, body, params, query: Object.fromEntries(url.searchParams) });
    if (out && out.raw !== undefined) return send(res, 200, out.raw, out.type, out.filename ? { 'Content-Disposition': `attachment; filename="${out.filename}"` } : {});
    send(res, 200, out ?? {});
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message });
    console.error(e); send(res, 500, { error: 'Internal server error' });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  if (req.method !== 'GET') return send(res, 405, 'Method not allowed', 'text/plain');
  let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  const file = path.join(FRONT, p || 'index.html');
  if (!file.startsWith(FRONT + path.sep) && file !== FRONT) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(FRONT, 'index.html'), (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, data, MIME[path.extname(file)] || 'text/html; charset=utf-8');
  });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  escalateOverdue(); setInterval(escalateOverdue, 60e3).unref();
  server.listen(port, () => console.log(`Campus Complaint System running at http://localhost:${port}`));
}
module.exports = { server, escalateOverdue };
