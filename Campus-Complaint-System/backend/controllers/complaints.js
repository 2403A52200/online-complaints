const fs = require('fs'), path = require('path'), crypto = require('crypto');
const db = require('../db');
const { bad, HttpError } = require('../middleware/http');
const STATUSES = ['Pending', 'In Progress', 'Resolved', 'Rejected'], PRIORITIES = ['Low', 'Medium', 'High'];
const DAYS = { Low: 7, Medium: 5, High: 3 };
const UPLOADS = path.join(process.env.DATA_DIR || path.join(__dirname, '..'), 'uploads');
const now = () => new Date().toISOString();
const str = (s) => String(s ?? '').trim();
const BASE = `SELECT c.*, cat.name AS category, cat.department_id AS suggested_department_id, d.name AS department, u.name AS student_name, u.email AS student_email
  FROM complaints c JOIN categories cat ON cat.id = c.category_id LEFT JOIN departments d ON d.id = c.department_id JOIN users u ON u.id = c.student_id`;

const notify = (uid, msg, cid) => db.prepare('INSERT INTO notifications(user_id,message,complaint_id,created_at) VALUES(?,?,?,?)').run(uid, msg, cid, now());
const notifyDept = (dept, msg, cid) => { for (const r of db.prepare('SELECT user_id FROM staff WHERE department_id = ?').all(dept)) notify(r.user_id, msg, cid); };
const notifyAdmins = (msg, cid) => { for (const r of db.prepare("SELECT id FROM users WHERE role = 'admin' AND active = 1").all()) notify(r.id, msg, cid); };
const addHistory = (cid, status, comment, uid) => db.prepare('INSERT INTO status_history(complaint_id,status,comment,changed_by,created_at) VALUES(?,?,?,?,?)').run(cid, status, comment, uid, now());
const deptOf = (user) => db.prepare('SELECT department_id FROM staff WHERE user_id = ?').get(user.id)?.department_id ?? -1;

function scrub(c, user) {
  const o = { ...c };
  if (o.anonymous && user.role !== 'student') { o.student_name = 'Anonymous'; o.student_email = null; delete o.student_id; }
  return o;
}
function canAccess(c, user) {
  return user.role === 'admin' || (user.role === 'student' && c.student_id === user.id) || (user.role === 'staff' && c.department_id === deptOf(user));
}
function find(idOrCode, user) {
  const c = db.prepare(BASE + ' WHERE c.id = ? OR c.code = ?').get(Number(idOrCode) || 0, String(idOrCode).toUpperCase());
  if (!c || !canAccess(c, user)) throw new HttpError(404, 'Complaint not found');
  return c;
}

function saveImage(img) {
  if (!img) return null;
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(img.data || ''));
  if (!m) throw bad('Evidence must be a PNG or JPEG image');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 2 * 1024 * 1024) throw bad('Image must be 2 MB or smaller');
  const png = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])), jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!png && !jpg) throw bad('File content is not a valid PNG or JPEG image');
  const name = crypto.randomBytes(16).toString('hex') + (png ? '.png' : '.jpg');
  fs.mkdirSync(UPLOADS, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS, name), buf);
  return name;
}

exports.create = ({ user, body }) => {
  const title = str(body.title), description = str(body.description), priority = body.priority || 'Medium';
  if (title.length < 5 || title.length > 120) throw bad('Title must be 5-120 characters');
  if (description.length < 10 || description.length > 2000) throw bad('Description must be 10-2000 characters');
  if (!PRIORITIES.includes(priority)) throw bad('Invalid priority');
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(body.category_id));
  if (!cat) throw bad('Choose a valid category');
  const image = saveImage(body.image), t = new Date(), due = new Date(t.getTime() + DAYS[priority] * 864e5).toISOString();
  const id = db.prepare(`INSERT INTO complaints(code,student_id,category_id,department_id,title,description,priority,anonymous,image,created_at,updated_at,due_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run('TMP' + crypto.randomBytes(6).toString('hex'), user.id, cat.id, null, title, description, priority, body.anonymous ? 1 : 0, image, t.toISOString(), t.toISOString(), due).lastInsertRowid;
  const code = `CMP-${t.getFullYear()}-${String(id).padStart(4, '0')}`;
  db.prepare('UPDATE complaints SET code = ? WHERE id = ?').run(code, id);
  addHistory(id, 'Pending', 'Complaint submitted', user.id);
  notifyAdmins(`New ${priority} priority complaint ${code} is waiting to be assigned: ${title}`, id);
  notify(user.id, `Your complaint ${code} was submitted and is waiting for admin review`, id);
  return { id, code };
};

exports.list = ({ user, query }) => {
  const where = [], args = [];
  if (user.role === 'student') { where.push('c.student_id = ?'); args.push(user.id); }
  if (user.role === 'staff') { where.push('c.department_id = ?'); args.push(deptOf(user)); }
  if (query.assigned === '0') where.push('c.department_id IS NULL');
  if (query.status) { if (!STATUSES.includes(query.status)) throw bad('Invalid status filter'); where.push('c.status = ?'); args.push(query.status); }
  if (query.priority) { if (!PRIORITIES.includes(query.priority)) throw bad('Invalid priority filter'); where.push('c.priority = ?'); args.push(query.priority); }
  if (query.q) { where.push('(c.title LIKE ? OR c.code LIKE ?)'); args.push(`%${query.q.slice(0, 60)}%`, `%${query.q.slice(0, 60)}%`); }
  const rows = db.prepare(BASE + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY c.created_at DESC LIMIT 200').all(...args);
  return rows.map((r) => scrub(r, user));
};

exports.get = ({ user, params }) => {
  const c = find(params.id, user);
  const history = db.prepare(`SELECT h.status, h.comment, h.created_at, u.name, u.role FROM status_history h LEFT JOIN users u ON u.id = h.changed_by WHERE h.complaint_id = ? ORDER BY h.id`).all(c.id)
    .map((h) => ({ status: h.status, comment: h.comment, created_at: h.created_at, by: h.role === 'student' ? (c.anonymous && user.role !== 'student' ? 'Anonymous' : h.name) : (h.name || 'System') }));
  const feedback = db.prepare('SELECT rating, comment, created_at FROM feedback WHERE complaint_id = ?').get(c.id) || null;
  return { ...scrub(c, user), history, feedback };
};

exports.updateStatus = ({ user, params, body }) => {
  const c = find(params.id, user), status = body.status, comment = str(body.comment).slice(0, 500);
  if (!STATUSES.includes(status)) throw bad('Invalid status');
  if (['Resolved', 'Rejected'].includes(c.status) && user.role !== 'admin') throw new HttpError(409, 'This complaint is already closed');
  if (status === c.status && !comment) throw bad('Add a comment or choose a different status');
  if (status === 'Rejected' && !comment) throw bad('Give a reason when rejecting a complaint');
  db.prepare('UPDATE complaints SET status = ?, updated_at = ?, resolved_at = ? WHERE id = ?').run(status, now(), status === 'Resolved' ? now() : null, c.id);
  addHistory(c.id, status, comment || null, user.id);
  notify(c.student_id, status === c.status ? `New update on ${c.code}` : `Your complaint ${c.code} is now ${status}`, c.id);
  if (user.role === 'staff') notifyAdmins(`${c.department} updated ${c.code}: ${status === c.status ? 'new comment' : status}`, c.id);
  return { ok: true };
};

exports.assign = ({ params, body, user }) => {
  const c = find(params.id, user), d = db.prepare('SELECT * FROM departments WHERE id = ?').get(Number(body.department_id));
  if (!d) throw bad('Choose a valid department');
  if (['Resolved', 'Rejected'].includes(c.status)) throw new HttpError(409, 'Closed complaints cannot be assigned');
  db.prepare('UPDATE complaints SET department_id = ?, updated_at = ? WHERE id = ?').run(d.id, now(), c.id);
  addHistory(c.id, c.status, `Assigned to ${d.name}`, user.id);
  notifyDept(d.id, `Complaint ${c.code} was assigned to your department`, c.id);
  notify(c.student_id, `Your complaint ${c.code} was assigned to ${d.name}`, c.id);
  return { ok: true };
};

exports.feedback = ({ user, params, body }) => {
  const c = find(params.id, user), rating = Number(body.rating);
  if (c.student_id !== user.id) throw new HttpError(403, 'Only the complainant can give feedback');
  if (c.status !== 'Resolved') throw bad('Feedback is available once a complaint is resolved');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw bad('Rating must be 1 to 5');
  if (db.prepare('SELECT 1 FROM feedback WHERE complaint_id = ?').get(c.id)) throw new HttpError(409, 'Feedback already submitted');
  db.prepare('INSERT INTO feedback(complaint_id,student_id,rating,comment,created_at) VALUES(?,?,?,?,?)').run(c.id, user.id, rating, str(body.comment).slice(0, 500), now());
  notifyAdmins(`Feedback (${rating}/5) received for ${c.code}`, c.id);
  return { ok: true };
};

exports.notifications = ({ user }) => ({
  items: db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30').all(user.id),
  unread: db.prepare('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND is_read = 0').get(user.id).n,
});
exports.readNotifications = ({ user }) => { db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(user.id); return { ok: true }; };

exports.file = ({ params }) => {
  if (!/^[a-f0-9]{32}\.(png|jpg)$/.test(params.name)) throw new HttpError(404, 'File not found');
  const f = path.join(UPLOADS, params.name);
  if (!fs.existsSync(f)) throw new HttpError(404, 'File not found');
  return { raw: fs.readFileSync(f), type: params.name.endsWith('png') ? 'image/png' : 'image/jpeg' };
};

exports.escalateOverdue = () => {
  const rows = db.prepare("SELECT id, code, department_id FROM complaints WHERE status IN ('Pending','In Progress') AND escalated = 0 AND due_at < ?").all(now());
  for (const r of rows) {
    db.prepare("UPDATE complaints SET escalated = 1, priority = 'High', updated_at = ? WHERE id = ?").run(now(), r.id);
    addHistory(r.id, 'Escalated', 'Automatically escalated: past due date', null);
    notifyAdmins(`Complaint ${r.code} is overdue and was escalated`, r.id);
    if (r.department_id) notifyDept(r.department_id, `Complaint ${r.code} is overdue and was escalated`, r.id);
  }
  return rows.length;
};
