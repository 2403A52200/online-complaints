class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const bad = (m) => new HttpError(400, m);
function readBody(req, limit = 4e6) {
  return new Promise((ok, no) => {
    let n = 0, big = false; const chunks = [];
    req.on('data', (d) => { n += d.length; if (n > limit) big = true; else chunks.push(d); });
    req.on('end', () => {
      if (big) return no(new HttpError(413, 'Request is too large'));
      if (!chunks.length) return ok({});
      try { const b = JSON.parse(Buffer.concat(chunks)); ok(b && typeof b === 'object' ? b : {}); }
      catch { no(bad('Invalid JSON body')); }
    });
    req.on('error', no);
  });
}
module.exports = { HttpError, bad, readBody };
