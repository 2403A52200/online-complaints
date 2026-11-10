const db = require('../db');
const { sign, hashPassword, checkPassword } = require('../middleware/auth');
const { bad, HttpError } = require('../middleware/http');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (s) => String(s ?? '').trim();
const strong = (p) => typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
const PW_MSG = 'Password must be at least 8 characters and include a letter and a number';
const fails = new Map();

function loadUser(id) {
  return db.prepare(`SELECT u.*, s.department_id, d.name AS department_name, st.roll_no, st.course FROM users u
    LEFT JOIN staff s ON s.user_id = u.id LEFT JOIN departments d ON d.id = s.department_id LEFT JOIN students st ON st.user_id = u.id WHERE u.id = ?`).get(id);
}
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, department_id: u.department_id ?? null, department: u.department_name ?? null, roll_no: u.roll_no ?? null, course: u.course ?? null });

exports.register = ({ body }) => {
  const name = str(body.name), email = str(body.email).toLowerCase();
  if (name.length < 2 || name.length > 80) throw bad('Enter your full name (2-80 characters)');
  if (!EMAIL.test(email)) throw bad('Enter a valid email address');
  if (!strong(body.password)) throw bad(PW_MSG);
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'An account with this email already exists');
  const id = db.prepare('INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)')
    .run(name, email, hashPassword(body.password), 'student', new Date().toISOString()).lastInsertRowid;
  db.prepare('INSERT INTO students(user_id,roll_no,course) VALUES(?,?,?)').run(id, str(body.roll_no).slice(0, 30), str(body.course).slice(0, 60));
  const u = loadUser(id);
  return { token: sign({ id: u.id, role: u.role }), user: pub(u) };
};

exports.login = ({ body, req }) => {
  const email = str(body.email).toLowerCase(), key = req.socket.remoteAddress + '|' + email;
  const f = fails.get(key);
  if (f && f.n >= 5 && Date.now() - f.t < 15 * 60e3) throw new HttpError(429, 'Too many failed attempts. Try again in 15 minutes');
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || typeof body.password !== 'string' || !checkPassword(body.password, row.password_hash)) {
    fails.set(key, { n: (f && Date.now() - f.t < 15 * 60e3 ? f.n : 0) + 1, t: Date.now() });
    throw new HttpError(401, 'Incorrect email or password');
  }
  if (!row.active) throw new HttpError(403, 'This account has been deactivated');
  fails.delete(key);
  const u = loadUser(row.id);
  if (body.portal && body.portal !== row.role) throw new HttpError(403, `This account is not a ${body.portal} account. Please use the correct login.`);
  if (row.role === 'staff' && body.portal === 'staff' && Number(body.department_id) !== u.department_id) throw new HttpError(403, 'This account does not belong to the selected department');
  return { token: sign({ id: u.id, role: u.role }), user: pub(u) };
};

exports.me = ({ user }) => pub(loadUser(user.id));

exports.updateProfile = ({ user, body }) => {
  const name = str(body.name);
  if (name.length < 2 || name.length > 80) throw bad('Enter your full name (2-80 characters)');
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, user.id);
  if (user.role === 'student') db.prepare('UPDATE students SET roll_no = ?, course = ? WHERE user_id = ?').run(str(body.roll_no).slice(0, 30), str(body.course).slice(0, 60), user.id);
  if (body.new_password) {
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id);
    if (!checkPassword(String(body.current_password ?? ''), row.password_hash)) throw bad('Current password is incorrect');
    if (!strong(body.new_password)) throw bad(PW_MSG);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(body.new_password), user.id);
  }
  return pub(loadUser(user.id));
};
exports.loadUser = loadUser;
