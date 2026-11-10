const db = require('../db');
const { hashPassword } = require('../middleware/auth');
const { bad, HttpError } = require('../middleware/http');
const str = (s) => String(s ?? '').trim();

exports.meta = () => ({
  categories: db.prepare('SELECT c.id, c.name, c.department_id, d.name AS department FROM categories c JOIN departments d ON d.id = c.department_id ORDER BY c.name').all(),
  departments: db.prepare('SELECT * FROM departments ORDER BY name').all(),
});

exports.departments = () => db.prepare('SELECT id, name FROM departments ORDER BY name').all();

exports.stats = () => ({
  total: db.prepare('SELECT COUNT(*) n FROM complaints').get().n,
  byStatus: db.prepare('SELECT status, COUNT(*) n FROM complaints GROUP BY status').all(),
  byCategory: db.prepare('SELECT cat.name, COUNT(*) n FROM complaints c JOIN categories cat ON cat.id = c.category_id GROUP BY cat.name ORDER BY n DESC').all(),
  byDepartment: db.prepare("SELECT COALESCE(d.name, 'Awaiting assignment') AS name, COUNT(*) n FROM complaints c LEFT JOIN departments d ON d.id = c.department_id GROUP BY 1 ORDER BY n DESC").all(),
  unassigned: db.prepare('SELECT COUNT(*) n FROM complaints WHERE department_id IS NULL').get().n,
  escalated: db.prepare('SELECT COUNT(*) n FROM complaints WHERE escalated = 1').get().n,
  avgRating: db.prepare('SELECT ROUND(AVG(rating),2) a FROM feedback').get().a,
  users: db.prepare('SELECT role, COUNT(*) n FROM users GROUP BY role').all(),
});

exports.users = () => db.prepare(`SELECT u.id, u.name, u.email, u.role, u.active, u.created_at, d.name AS department FROM users u
  LEFT JOIN staff s ON s.user_id = u.id LEFT JOIN departments d ON d.id = s.department_id ORDER BY u.id`).all();

exports.createUser = ({ body }) => {
  const name = str(body.name), email = str(body.email).toLowerCase(), role = body.role;
  if (name.length < 2) throw bad('Enter a name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('Enter a valid email address');
  if (!['staff', 'admin'].includes(role)) throw bad('Role must be staff or admin');
  if (typeof body.password !== 'string' || body.password.length < 8 || !/\d/.test(body.password) || !/[A-Za-z]/.test(body.password)) throw bad('Password must be at least 8 characters with a letter and a number');
  if (role === 'staff' && !db.prepare('SELECT 1 FROM departments WHERE id = ?').get(Number(body.department_id))) throw bad('Choose a department for staff');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'Email already in use');
  const id = db.prepare('INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)').run(name, email, hashPassword(body.password), role, new Date().toISOString()).lastInsertRowid;
  if (role === 'staff') db.prepare('INSERT INTO staff VALUES(?,?)').run(id, Number(body.department_id));
  return { id };
};

exports.setActive = ({ params, body, user }) => {
  if (Number(params.id) === user.id) throw bad('You cannot deactivate your own account');
  const r = db.prepare('UPDATE users SET active = ? WHERE id = ?').run(body.active ? 1 : 0, Number(params.id));
  if (!r.changes) throw new HttpError(404, 'User not found');
  return { ok: true };
};

exports.addCategory = ({ body }) => {
  const name = str(body.name);
  if (name.length < 3 || name.length > 60) throw bad('Category name must be 3-60 characters');
  if (!db.prepare('SELECT 1 FROM departments WHERE id = ?').get(Number(body.department_id))) throw bad('Choose a department');
  if (db.prepare('SELECT 1 FROM categories WHERE name = ?').get(name)) throw new HttpError(409, 'Category already exists');
  return { id: db.prepare('INSERT INTO categories(name,department_id) VALUES(?,?)').run(name, Number(body.department_id)).lastInsertRowid };
};

exports.report = () => {
  const rows = db.prepare(`SELECT c.code, c.title, cat.name category, d.name department, c.priority, c.status, c.escalated, c.created_at, c.resolved_at
    FROM complaints c JOIN categories cat ON cat.id = c.category_id LEFT JOIN departments d ON d.id = c.department_id ORDER BY c.id`).all();
  const cell = (v) => { v = String(v ?? ''); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  const head = ['Complaint ID', 'Title', 'Category', 'Department', 'Priority', 'Status', 'Escalated', 'Created', 'Resolved'];
  const csv = [head.join(','), ...rows.map((r) => Object.values(r).map(cell).join(','))].join('\n');
  return { raw: csv, type: 'text/csv', filename: 'complaints-report.csv' };
};
