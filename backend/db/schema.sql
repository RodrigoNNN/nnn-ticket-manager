-- NNN Ticket Manager Database Schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  department TEXT NOT NULL CHECK(department IN ('Management', 'Marketing', 'IT', 'Accounting')),
  role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  is_active INTEGER DEFAULT 1,
  whatsapp_number TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS spas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  country TEXT DEFAULT 'USA',
  status TEXT DEFAULT 'active',
  tier INTEGER CHECK(tier IN (1, 2, 3) OR tier IS NULL),
  monthly_budget REAL,
  arrival_goal INTEGER,
  onboarding_data TEXT DEFAULT '{}',
  extra_fields TEXT DEFAULT '[]',
  onboarded_at TEXT,
  onboarded_via TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS spa_promos (
  id TEXT PRIMARY KEY,
  spa_id TEXT NOT NULL REFERENCES spas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price REAL,
  value_price REAL,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS spa_team_members (
  spa_id TEXT NOT NULL REFERENCES spas(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (spa_id, department, user_id)
);

CREATE TABLE IF NOT EXISTS ticket_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  is_active INTEGER DEFAULT 1,
  instructions TEXT DEFAULT '',
  custom_fields TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS ticket_type_subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_type_id TEXT NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  name TEXT NOT NULL,
  estimated_minutes INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_type_id TEXT REFERENCES ticket_types(id),
  ticket_type TEXT NOT NULL,
  spa_id TEXT REFERENCES spas(id),
  treatment_name TEXT DEFAULT '',
  promo_price REAL,
  value_price REAL,
  priority TEXT DEFAULT 'Medium' CHECK(priority IN ('Immediate', 'High', 'Medium')),
  target_audience TEXT DEFAULT '',
  due_date TEXT,
  start_ads_date TEXT,
  first_booking_date TEXT,
  domain TEXT DEFAULT '',
  status TEXT DEFAULT 'Not Started' CHECK(status IN ('Not Started', 'Open', 'In Progress', 'Done')),
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  additional_info TEXT DEFAULT '',
  custom_field_values TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  task_name TEXT NOT NULL,
  estimated_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Not Started' CHECK(status IN ('Not Started', 'In Progress', 'Done')),
  completed_by TEXT REFERENCES users(id),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS task_assignments (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT DEFAULT 'primary' CHECK(role IN ('primary', 'helper')),
  assigned_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS onboarding_forms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT DEFAULT '',
  ticket_type TEXT DEFAULT '',
  fields TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_ticket_id ON tasks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_ticket_id ON activity_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_spa_team_members_spa_id ON spa_team_members(spa_id);
CREATE INDEX IF NOT EXISTS idx_ticket_type_subtasks_type_id ON ticket_type_subtasks(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_tickets_spa_id ON tickets(spa_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_spa_promos_spa_id ON spa_promos(spa_id);
