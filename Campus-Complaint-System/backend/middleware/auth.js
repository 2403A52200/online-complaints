const crypto = require('crypto'), fs = require('fs'), path = require('path');
const file = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'database'), '.secret');
let SECRET = process.env.JWT_SECRET;
if (!SECRET) { try { SECRET = fs.readFileSync(file, 'utf8'); } catch { SECRET = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(file, SECRET, { mode: 0o600 }); } }
const b64 = (s) => Buffer.from(s).toString('base64url');
const mac = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
function sign(payload) {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + 8 * 3600e3 }));
  const head = b64('{"alg":"HS256","typ":"JWT"}');
  return `${head}.${body}.${mac(head + '.' + body)}`;
}
function verify(token) {
  const [h, b, s] = String(token).split('.');
  if (!h || !b || !s) return null;
  const good = Buffer.from(mac(h + '.' + b)), got = Buffer.from(s);
  if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
  try { const p = JSON.parse(Buffer.from(b, 'base64url')); return p.exp > Date.now() ? p : null; } catch { return null; }
}
function hashPassword(pw) { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex'); }
function checkPassword(pw, stored) {
  const [salt, hash] = stored.split(':'); const k = crypto.scryptSync(pw, salt, 64);
  return crypto.timingSafeEqual(k, Buffer.from(hash, 'hex'));
}
function authenticate(req) { const m = /^Bearer (.+)$/.exec(req.headers.authorization || ''); return m ? verify(m[1]) : null; }
module.exports = { sign, verify, hashPassword, checkPassword, authenticate };
