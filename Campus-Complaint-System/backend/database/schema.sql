CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','staff','admin')), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS students (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, roll_no TEXT, course TEXT);
CREATE TABLE IF NOT EXISTS staff (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, department_id INTEGER NOT NULL REFERENCES departments(id));
CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, department_id INTEGER NOT NULL REFERENCES departments(id));
CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL,
  student_id INTEGER NOT NULL REFERENCES users(id), category_id INTEGER NOT NULL REFERENCES categories(id),
  department_id INTEGER REFERENCES departments(id), title TEXT NOT NULL, description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Low','Medium','High')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Resolved','Rejected')),
  anonymous INTEGER NOT NULL DEFAULT 0, image TEXT, escalated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, due_at TEXT NOT NULL, resolved_at TEXT);
CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY, complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  status TEXT NOT NULL, comment TEXT, changed_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY, complaint_id INTEGER UNIQUE NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id), rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL, complaint_id INTEGER, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_c_student ON complaints(student_id);
CREATE INDEX IF NOT EXISTS idx_c_dept ON complaints(department_id);
CREATE INDEX IF NOT EXISTS idx_c_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_n_user ON notifications(user_id);
