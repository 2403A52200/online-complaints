const { DatabaseSync } = require('node:sqlite');
const fs = require('fs'), path = require('path');
const { hashPassword } = require('./middleware/auth');
const db = new DatabaseSync(process.env.DB_FILE || path.join(process.env.DATA_DIR || path.join(__dirname, 'database'), 'campus.db'));
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
db.exec(fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8'));

function seed() {
  if (db.prepare('SELECT COUNT(*) n FROM users').get().n) return;
  const now = new Date().toISOString();
  const depts = { 'Hostel & Mess': ['Hostel', 'Mess / Canteen'], 'Academics': ['Classroom & Faculty', 'Exams & Results'],
    'Infrastructure': ['Maintenance', 'Water & Electricity'], 'IT & Network': ['Wi-Fi & Internet', 'Computer Labs'],
    'Library': ['Library'], 'Administration': ['Fees & Office', 'Ragging & Safety'] };
  const ids = {};
  for (const [d, cats] of Object.entries(depts)) {
    const id = db.prepare('INSERT INTO departments(name) VALUES(?)').run(d).lastInsertRowid; ids[d] = id;
    for (const c of cats) db.prepare('INSERT INTO categories(name,department_id) VALUES(?,?)').run(c, id);
  }
  const mk = (name, email, pw, role) => db.prepare('INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)').run(name, email, hashPassword(pw), role, now).lastInsertRowid;
  mk('Admin User', 'admin@campus.edu', 'Admin@123', 'admin');
  const staffList = [['Hostel Staff', 'hostel@campus.edu', 'Hostel & Mess'], ['Academics Staff', 'academics@campus.edu', 'Academics'],
    ['Maintenance Staff', 'staff@campus.edu', 'Infrastructure'], ['IT Staff', 'it@campus.edu', 'IT & Network'],
    ['Library Staff', 'library@campus.edu', 'Library'], ['Administration Staff', 'administration@campus.edu', 'Administration']];
  for (const [n, e, d] of staffList) db.prepare('INSERT INTO staff VALUES(?,?)').run(mk(n, e, 'Staff@123', 'staff'), ids[d]);
  const st = mk('Demo Student', 'student@campus.edu', 'Student@123', 'student');
  db.prepare('INSERT INTO students VALUES(?,?,?)').run(st, 'CS2024001', 'B.Tech CSE');
}
seed();
module.exports = db;
