-- ============================================================
-- NNN Ticket Manager — Supabase Setup (Schema + Seed)
-- Run this ENTIRE file in the Supabase SQL Editor
-- ============================================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing tables (safe for re-running)
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS task_assignments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS ticket_type_subtasks CASCADE;
DROP TABLE IF EXISTS ticket_types CASCADE;
DROP TABLE IF EXISTS spa_team_members CASCADE;
DROP TABLE IF EXISTS spa_promos CASCADE;
DROP TABLE IF EXISTS spas CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS onboarding_forms CASCADE;

-- ============================================================
-- SCHEMA
-- ============================================================

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  department TEXT NOT NULL CHECK(department IN ('Management', 'Marketing', 'IT', 'Accounting')),
  role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  is_active BOOLEAN DEFAULT true,
  whatsapp_number TEXT DEFAULT ''
);

CREATE TABLE spas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  country TEXT DEFAULT 'USA',
  status TEXT DEFAULT 'active',
  tier INTEGER CHECK(tier IN (1, 2, 3) OR tier IS NULL),
  monthly_budget REAL,
  arrival_goal INTEGER,
  onboarding_data JSONB DEFAULT '{}',
  extra_fields JSONB DEFAULT '[]',
  onboarded_at TIMESTAMPTZ,
  onboarded_via TEXT DEFAULT ''
);

CREATE TABLE spa_promos (
  id TEXT PRIMARY KEY,
  spa_id TEXT NOT NULL REFERENCES spas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price REAL,
  value_price REAL,
  active BOOLEAN DEFAULT true
);

CREATE TABLE spa_team_members (
  spa_id TEXT NOT NULL REFERENCES spas(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (spa_id, department, user_id)
);

CREATE TABLE ticket_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  is_active BOOLEAN DEFAULT true,
  instructions TEXT DEFAULT '',
  custom_fields JSONB DEFAULT '[]'
);

CREATE TABLE ticket_type_subtasks (
  id SERIAL PRIMARY KEY,
  ticket_type_id TEXT NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  name TEXT NOT NULL,
  estimated_minutes INTEGER DEFAULT 0
);

CREATE TABLE tickets (
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
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  additional_info TEXT DEFAULT '',
  custom_field_values JSONB DEFAULT '{}'
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  task_name TEXT NOT NULL,
  estimated_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Not Started' CHECK(status IN ('Not Started', 'In Progress', 'Done')),
  completed_by TEXT REFERENCES users(id),
  completed_at TIMESTAMPTZ
);

CREATE TABLE task_assignments (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT DEFAULT 'primary' CHECK(role IN ('primary', 'helper')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE onboarding_forms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT DEFAULT '',
  ticket_type TEXT DEFAULT '',
  fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tasks_ticket_id ON tasks(ticket_id);
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX idx_comments_ticket_id ON comments(ticket_id);
CREATE INDEX idx_activity_log_ticket_id ON activity_log(ticket_id);
CREATE INDEX idx_spa_team_members_spa_id ON spa_team_members(spa_id);
CREATE INDEX idx_ticket_type_subtasks_type_id ON ticket_type_subtasks(ticket_type_id);
CREATE INDEX idx_tickets_spa_id ON tickets(spa_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_spa_promos_spa_id ON spa_promos(spa_id);

-- ============================================================
-- LOGIN FUNCTION (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION authenticate(p_email TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM users WHERE email = p_email AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid email or password');
  END IF;
  IF v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    RETURN json_build_object(
      'id', v_user.id,
      'name', v_user.name,
      'email', v_user.email,
      'department', v_user.department,
      'role', v_user.role,
      'is_active', v_user.is_active,
      'whatsapp_number', v_user.whatsapp_number
    );
  ELSE
    RETURN json_build_object('error', 'Invalid email or password');
  END IF;
END;
$$;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Users (18 total, password: password123)
INSERT INTO users (id, name, email, password_hash, department, role) VALUES
  ('u1', 'tpradas', 'tpradas@nnn.com', crypt('password123', gen_salt('bf')), 'Management', 'admin'),
  ('u2', 'Joe', 'joe@nnn.com', crypt('password123', gen_salt('bf')), 'Management', 'admin'),
  ('u3', 'Olivia', 'olivia@nnn.com', crypt('password123', gen_salt('bf')), 'Management', 'admin'),
  ('u4', 'Jizza', 'jizza@nnn.com', crypt('password123', gen_salt('bf')), 'Management', 'admin'),
  ('u5', 'AJ', 'aj@nnn.com', crypt('password123', gen_salt('bf')), 'Management', 'admin'),
  ('u6', 'Rachel', 'rachel@nnn.com', crypt('password123', gen_salt('bf')), 'Management', 'admin'),
  ('u7', 'Reut', 'reut@nnn.com', crypt('password123', gen_salt('bf')), 'Management', 'admin'),
  ('u8', 'Trisha', 'trisha@nnn.com', crypt('password123', gen_salt('bf')), 'Management', 'admin'),
  ('u9', 'Catherine', 'catherine@nnn.com', crypt('password123', gen_salt('bf')), 'Management', 'admin'),
  ('u10', 'Matt', 'matt@nnn.com', crypt('password123', gen_salt('bf')), 'Management', 'admin'),
  ('u11', 'Daniel', 'daniel@nnn.com', crypt('password123', gen_salt('bf')), 'Marketing', 'member'),
  ('u12', 'Rodrigo', 'rodrigo@nnn.com', crypt('password123', gen_salt('bf')), 'Marketing', 'member'),
  ('u13', 'Mon', 'mon@nnn.com', crypt('password123', gen_salt('bf')), 'IT', 'member'),
  ('u14', 'Miriam', 'miriam@nnn.com', crypt('password123', gen_salt('bf')), 'IT', 'member'),
  ('u15', 'Juda', 'juda@nnn.com', crypt('password123', gen_salt('bf')), 'IT', 'member'),
  ('u16', 'Hosam', 'hosam@nnn.com', crypt('password123', gen_salt('bf')), 'IT', 'member'),
  ('u17', 'Christy', 'christy@nnn.com', crypt('password123', gen_salt('bf')), 'Accounting', 'member'),
  ('u18', 'Julia Benyamin', 'julia@nnn.com', crypt('password123', gen_salt('bf')), 'Accounting', 'member');

-- Spas (10 total)
INSERT INTO spas (id, name, location, country, tier, monthly_budget, arrival_goal, onboarding_data, onboarded_at) VALUES
  ('s1', 'Glow Medical Spa', 'Miami, FL', 'USA', 1, 5000, 50, '{"ob-1":"Glow Medical Spa","ob-2":"Dr. Sarah Johnson","ob-3":"sarah@glowmedicalspa.com","ob-4":"+1-305-555-0100"}', '2025-06-15T10:00:00Z'),
  ('s2', 'Radiance Aesthetics', 'Los Angeles, CA', 'USA', 1, 8000, 80, '{}', '2025-07-01T10:00:00Z'),
  ('s3', 'Pure Skin Clinic', 'Toronto, ON', 'Canada', 2, 3000, 30, '{}', '2025-08-01T10:00:00Z'),
  ('s4', 'Luxe MedSpa', 'New York, NY', 'USA', 1, 10000, 100, '{}', '2025-08-15T10:00:00Z'),
  ('s5', 'Revive Wellness', 'Chicago, IL', 'USA', 2, 4000, 40, '{}', '2025-09-01T10:00:00Z'),
  ('s6', 'Bella Derma', 'Houston, TX', 'USA', 3, 2000, 20, '{}', '2025-09-15T10:00:00Z'),
  ('s7', 'Aura Med Spa', 'Vancouver, BC', 'Canada', 2, 3500, 35, '{}', '2025-10-01T10:00:00Z'),
  ('s8', 'Elite Skin Care', 'Dallas, TX', 'USA', 3, 1500, 15, '{}', '2025-10-15T10:00:00Z'),
  ('s9', 'Zenith Aesthetics', 'San Francisco, CA', 'USA', NULL, NULL, NULL, '{}', '2026-02-23T09:00:00Z'),
  ('s10', 'Harmony Medi Spa', 'Atlanta, GA', 'USA', 1, 6000, 60, '{}', '2025-11-01T10:00:00Z');

-- Spa promos
INSERT INTO spa_promos (id, spa_id, name, price, value_price, active) VALUES
  ('p1', 's1', 'Spring Botox Special', 199, 450, true);

-- Spa team assignments
INSERT INTO spa_team_members (spa_id, department, user_id) VALUES
  ('s1','Management','u2'),('s1','Management','u6'),('s1','Marketing','u12'),('s1','IT','u13'),('s1','Accounting','u17'),
  ('s2','Management','u3'),('s2','Management','u5'),('s2','Marketing','u11'),('s2','IT','u15'),('s2','Accounting','u18'),
  ('s3','Management','u4'),('s3','Marketing','u12'),('s3','IT','u14'),
  ('s4','Management','u2'),('s4','Management','u8'),('s4','Marketing','u11'),('s4','Marketing','u12'),('s4','IT','u13'),('s4','IT','u16'),('s4','Accounting','u17'),
  ('s5','Management','u7'),('s5','Marketing','u11'),('s5','IT','u15'),
  ('s6','Management','u9'),('s6','Marketing','u12'),('s6','IT','u14'),
  ('s7','Management','u5'),('s7','Marketing','u11'),('s7','IT','u16'),('s7','Accounting','u18'),
  ('s8','Management','u10'),('s8','Marketing','u12'),('s8','IT','u14'),
  ('s10','Management','u2'),('s10','Management','u4'),('s10','Marketing','u11'),('s10','IT','u13'),('s10','Accounting','u17');

-- Ticket types (9 total)
INSERT INTO ticket_types (id, name, color) VALUES
  ('tt1','New Campaign','#3B82F6'),('tt2','New Spa','#10B981'),('tt3','Campaign Price Change','#F59E0B'),
  ('tt4','Budget Change','#EF4444'),('tt5','Service Status Change','#8B5CF6'),('tt6','Availability Change','#EC4899'),
  ('tt7','Spa Performance Issues','#DC2626'),('tt8','Ad Pause Request','#6B7280'),('tt9','Campaign GHL Migration','#0EA5E9');

-- Subtask templates
INSERT INTO ticket_type_subtasks (ticket_type_id, department, name, estimated_minutes) VALUES
  -- tt1: New Campaign
  ('tt1','Management','Notify AM and TL',5),
  ('tt1','Marketing','Request LP',1),('tt1','Marketing','Choose Creatives',10),('tt1','Marketing','Create Form',15),
  ('tt1','IT','Technical Setup',20),('tt1','IT','Pixel and Tracking Setup',15),('tt1','IT','Campaign Configuration',30),
  ('tt1','Accounting','Budget Setup',10),('tt1','Accounting','Billing Update',5),
  -- tt2: New Spa
  ('tt2','Management','Notify AM and TL',5),('tt2','Management','Client Onboarding Review',20),
  ('tt2','Marketing','Request LP',1),('tt2','Marketing','Choose Creatives',10),('tt2','Marketing','Create Form',15),('tt2','Marketing','Setup Ad Copy',15),
  ('tt2','IT','Domain Setup',15),('tt2','IT','Pixel Installation',20),('tt2','IT','Tracking Configuration',20),('tt2','IT','Campaign Technical Setup',30),
  ('tt2','Accounting','Contract Setup',15),('tt2','Accounting','Initial Budget Configuration',10),('tt2','Accounting','Billing Setup',10),
  -- tt3: Campaign Price Change
  ('tt3','Management','Approve Price Change',5),
  ('tt3','Marketing','Update Ad Copy',10),('tt3','Marketing','Update Landing Page',15),('tt3','Marketing','Update Creatives',10),
  ('tt3','IT','Update Form Fields',10),('tt3','IT','Verify Conversion Tracking',10),
  ('tt3','Accounting','Update Revenue Projections',10),
  -- tt4: Budget Change
  ('tt4','Management','Approve Budget Change',5),
  ('tt4','Marketing','Update Campaign Settings',10),
  ('tt4','IT','Verify Tracking After Change',10),
  ('tt4','Accounting','Update Billing Records',10),('tt4','Accounting','Confirm New Budget',5),
  -- tt5: Service Status Change
  ('tt5','Management','Confirm Status Change',5),
  ('tt5','Marketing','Pause or Activate Campaigns',10),
  ('tt5','IT','Update Tracking Status',10),
  ('tt5','Accounting','Update Billing Status',5),
  -- tt6: Availability Change
  ('tt6','Management','Review Availability Update',5),
  ('tt6','Marketing','Update Ad Scheduling',10),
  ('tt6','IT','Update Calendar Integration',15),
  ('tt6','Accounting','Adjust Budget Allocation',10),
  -- tt7: Spa Performance Issues
  ('tt7','Management','Review Performance Report',15),
  ('tt7','Marketing','Analyze Campaign Metrics',20),('tt7','Marketing','Propose Optimization Plan',30),
  ('tt7','IT','Check Technical Issues',20),('tt7','IT','Review Tracking Data',15),
  ('tt7','Accounting','Review Spend vs Performance',15),
  -- tt8: Ad Pause Request
  ('tt8','Management','Approve Ad Pause',5),
  ('tt8','Marketing','Pause Active Campaigns',5),
  ('tt8','IT','Verify Campaigns Paused',5),
  ('tt8','Accounting','Update Budget Status',5),
  -- tt9: Campaign GHL Migration
  ('tt9','Management','Approve Migration Plan',10),
  ('tt9','Marketing','Migrate Campaign Assets',30),('tt9','Marketing','Update Tracking Links',15),
  ('tt9','IT','Setup GHL Integration',45),('tt9','IT','Migrate Technical Configuration',30),('tt9','IT','Test New Setup',20),
  ('tt9','Accounting','Update Platform Billing',10);

-- Tickets (8 total)
INSERT INTO tickets (id, ticket_type_id, ticket_type, spa_id, treatment_name, promo_price, value_price, priority, target_audience, due_date, start_ads_date, first_booking_date, domain, status, created_by, created_at, completed_at, additional_info) VALUES
  ('tk1','tt1','New Campaign','s1','Botox Special',199,450,'High','Women','2026-03-01',NULL,NULL,'','In Progress','u2','2026-02-20T10:00:00Z',NULL,'Launch before March. Target age 25-55.'),
  ('tk2','tt2','New Spa','s9','Full Service Launch',NULL,NULL,'Immediate','Both','2026-02-28','2026-03-05','2026-03-10','zenith-aesthetics.com','Open','u3','2026-02-23T09:00:00Z',NULL,'Brand new client. Need full onboarding.'),
  ('tk3','tt4','Budget Change','s2','Laser Hair Removal',149,350,'Medium','Women','2026-02-18',NULL,NULL,'','Done','u2','2026-02-10T08:00:00Z','2026-02-17T16:00:00Z','Increase daily budget from $50 to $100.'),
  ('tk4','tt3','Campaign Price Change','s4','CoolSculpting',599,1200,'High','Both','2026-03-05',NULL,NULL,'','In Progress','u6','2026-02-21T14:00:00Z',NULL,'New spring pricing.'),
  ('tk5','tt7','Spa Performance Issues','s6','Hydrafacial',129,250,'Immediate','Women','2026-02-25',NULL,NULL,'','Open','u2','2026-02-24T07:00:00Z',NULL,'CPA is too high. Need immediate review.'),
  ('tk6','tt8','Ad Pause Request','s5','Chemical Peel',99,200,'Medium','Women','2026-02-27',NULL,NULL,'','In Progress','u4','2026-02-19T11:00:00Z',NULL,'Client requested temporary pause for 2 weeks.'),
  ('tk7','tt5','Service Status Change','s3','Dermal Fillers',399,700,'High','Both','2026-02-26',NULL,NULL,'','In Progress','u8','2026-02-18T09:00:00Z',NULL,'Re-activating service after supply restock.'),
  ('tk8','tt1','New Campaign','s7','Microneedling',179,400,'Medium','Women','2026-03-10',NULL,NULL,'','In Progress','u5','2026-02-22T13:00:00Z',NULL,'');

-- Tasks for tk1 (New Campaign - tt1): Mgmt=Done, Mktg=InProgress
INSERT INTO tasks (id,ticket_id,department,task_name,estimated_minutes,status,completed_by,completed_at) VALUES
  ('tk1-t0','tk1','Management','Notify AM and TL',5,'Done','u2','2026-02-22T14:00:00Z'),
  ('tk1-t1','tk1','Marketing','Request LP',1,'Not Started',NULL,NULL),
  ('tk1-t2','tk1','Marketing','Choose Creatives',10,'Not Started',NULL,NULL),
  ('tk1-t3','tk1','Marketing','Create Form',15,'Not Started',NULL,NULL),
  ('tk1-t4','tk1','IT','Technical Setup',20,'Not Started',NULL,NULL),
  ('tk1-t5','tk1','IT','Pixel and Tracking Setup',15,'Not Started',NULL,NULL),
  ('tk1-t6','tk1','IT','Campaign Configuration',30,'Not Started',NULL,NULL),
  ('tk1-t7','tk1','Accounting','Budget Setup',10,'Not Started',NULL,NULL),
  ('tk1-t8','tk1','Accounting','Billing Update',5,'Not Started',NULL,NULL);

-- Tasks for tk2 (New Spa - tt2): all Not Started
INSERT INTO tasks (id,ticket_id,department,task_name,estimated_minutes,status) VALUES
  ('tk2-t0','tk2','Management','Notify AM and TL',5,'Not Started'),
  ('tk2-t1','tk2','Management','Client Onboarding Review',20,'Not Started'),
  ('tk2-t2','tk2','Marketing','Request LP',1,'Not Started'),
  ('tk2-t3','tk2','Marketing','Choose Creatives',10,'Not Started'),
  ('tk2-t4','tk2','Marketing','Create Form',15,'Not Started'),
  ('tk2-t5','tk2','Marketing','Setup Ad Copy',15,'Not Started'),
  ('tk2-t6','tk2','IT','Domain Setup',15,'Not Started'),
  ('tk2-t7','tk2','IT','Pixel Installation',20,'Not Started'),
  ('tk2-t8','tk2','IT','Tracking Configuration',20,'Not Started'),
  ('tk2-t9','tk2','IT','Campaign Technical Setup',30,'Not Started'),
  ('tk2-t10','tk2','Accounting','Contract Setup',15,'Not Started'),
  ('tk2-t11','tk2','Accounting','Initial Budget Configuration',10,'Not Started'),
  ('tk2-t12','tk2','Accounting','Billing Setup',10,'Not Started');

-- Tasks for tk3 (Budget Change - tt4): ALL Done
INSERT INTO tasks (id,ticket_id,department,task_name,estimated_minutes,status,completed_by,completed_at) VALUES
  ('tk3-t0','tk3','Management','Approve Budget Change',5,'Done','u2','2026-02-22T14:00:00Z'),
  ('tk3-t1','tk3','Marketing','Update Campaign Settings',10,'Done','u2','2026-02-22T14:00:00Z'),
  ('tk3-t2','tk3','IT','Verify Tracking After Change',10,'Done','u2','2026-02-22T14:00:00Z'),
  ('tk3-t3','tk3','Accounting','Update Billing Records',10,'Done','u2','2026-02-22T14:00:00Z'),
  ('tk3-t4','tk3','Accounting','Confirm New Budget',5,'Done','u2','2026-02-22T14:00:00Z');

-- Tasks for tk4 (Campaign Price Change - tt3): Mgmt=Done
INSERT INTO tasks (id,ticket_id,department,task_name,estimated_minutes,status,completed_by,completed_at) VALUES
  ('tk4-t0','tk4','Management','Approve Price Change',5,'Done','u2','2026-02-22T14:00:00Z'),
  ('tk4-t1','tk4','Marketing','Update Ad Copy',10,'Not Started',NULL,NULL),
  ('tk4-t2','tk4','Marketing','Update Landing Page',15,'Not Started',NULL,NULL),
  ('tk4-t3','tk4','Marketing','Update Creatives',10,'Not Started',NULL,NULL),
  ('tk4-t4','tk4','IT','Update Form Fields',10,'Not Started',NULL,NULL),
  ('tk4-t5','tk4','IT','Verify Conversion Tracking',10,'Not Started',NULL,NULL),
  ('tk4-t6','tk4','Accounting','Update Revenue Projections',10,'Not Started',NULL,NULL);

-- Tasks for tk5 (Spa Performance Issues - tt7): all Not Started
INSERT INTO tasks (id,ticket_id,department,task_name,estimated_minutes,status) VALUES
  ('tk5-t0','tk5','Management','Review Performance Report',15,'Not Started'),
  ('tk5-t1','tk5','Marketing','Analyze Campaign Metrics',20,'Not Started'),
  ('tk5-t2','tk5','Marketing','Propose Optimization Plan',30,'Not Started'),
  ('tk5-t3','tk5','IT','Check Technical Issues',20,'Not Started'),
  ('tk5-t4','tk5','IT','Review Tracking Data',15,'Not Started'),
  ('tk5-t5','tk5','Accounting','Review Spend vs Performance',15,'Not Started');

-- Tasks for tk6 (Ad Pause Request - tt8): Mgmt=Done, Mktg=Done, IT=InProgress
INSERT INTO tasks (id,ticket_id,department,task_name,estimated_minutes,status,completed_by,completed_at) VALUES
  ('tk6-t0','tk6','Management','Approve Ad Pause',5,'Done','u2','2026-02-22T14:00:00Z'),
  ('tk6-t1','tk6','Marketing','Pause Active Campaigns',5,'Done','u2','2026-02-22T14:00:00Z'),
  ('tk6-t2','tk6','IT','Verify Campaigns Paused',5,'In Progress',NULL,NULL),
  ('tk6-t3','tk6','Accounting','Update Budget Status',5,'Not Started',NULL,NULL);

-- Tasks for tk7 (Service Status Change - tt5): Mgmt=Done, Mktg=Done, IT=Done, Acct=InProgress
INSERT INTO tasks (id,ticket_id,department,task_name,estimated_minutes,status,completed_by,completed_at) VALUES
  ('tk7-t0','tk7','Management','Confirm Status Change',5,'Done','u2','2026-02-22T14:00:00Z'),
  ('tk7-t1','tk7','Marketing','Pause or Activate Campaigns',10,'Done','u2','2026-02-22T14:00:00Z'),
  ('tk7-t2','tk7','IT','Update Tracking Status',10,'Done','u2','2026-02-22T14:00:00Z'),
  ('tk7-t3','tk7','Accounting','Update Billing Status',5,'In Progress',NULL,NULL);

-- Tasks for tk8 (New Campaign - tt1): Mgmt=InProgress
INSERT INTO tasks (id,ticket_id,department,task_name,estimated_minutes,status) VALUES
  ('tk8-t0','tk8','Management','Notify AM and TL',5,'In Progress'),
  ('tk8-t1','tk8','Marketing','Request LP',1,'Not Started'),
  ('tk8-t2','tk8','Marketing','Choose Creatives',10,'Not Started'),
  ('tk8-t3','tk8','Marketing','Create Form',15,'Not Started'),
  ('tk8-t4','tk8','IT','Technical Setup',20,'Not Started'),
  ('tk8-t5','tk8','IT','Pixel and Tracking Setup',15,'Not Started'),
  ('tk8-t6','tk8','IT','Campaign Configuration',30,'Not Started'),
  ('tk8-t7','tk8','Accounting','Budget Setup',10,'Not Started'),
  ('tk8-t8','tk8','Accounting','Billing Update',5,'Not Started');

-- Task assignments (spa-aware: prefer spa team members)
-- tk1 (spa s1): Mgmt→u2, Mktg→u12, IT→u13, Acct→u17
INSERT INTO task_assignments (task_id, user_id, role) VALUES
  ('tk1-t0','u2','primary'),('tk1-t1','u12','primary'),('tk1-t2','u12','primary'),('tk1-t3','u12','primary'),
  ('tk1-t4','u13','primary'),('tk1-t5','u13','primary'),('tk1-t6','u13','primary'),
  ('tk1-t7','u17','primary'),('tk1-t8','u17','primary');
-- tk2 (spa s9 - no team): spread across dept
INSERT INTO task_assignments (task_id, user_id, role) VALUES
  ('tk2-t0','u1','primary'),('tk2-t1','u1','primary'),
  ('tk2-t2','u11','primary'),('tk2-t3','u11','primary'),('tk2-t4','u11','primary'),('tk2-t5','u11','primary'),
  ('tk2-t6','u14','primary'),('tk2-t7','u14','primary'),('tk2-t8','u15','primary'),('tk2-t9','u16','primary'),
  ('tk2-t10','u18','primary'),('tk2-t11','u18','primary'),('tk2-t12','u17','primary');
-- tk3 (spa s2): Mgmt→u3, Mktg→u11, IT→u15, Acct→u18
INSERT INTO task_assignments (task_id, user_id, role) VALUES
  ('tk3-t0','u3','primary'),('tk3-t1','u11','primary'),('tk3-t2','u15','primary'),
  ('tk3-t3','u18','primary'),('tk3-t4','u18','primary');
-- tk4 (spa s4): Mgmt→u2, Mktg→u11, IT→u13, Acct→u17
INSERT INTO task_assignments (task_id, user_id, role) VALUES
  ('tk4-t0','u2','primary'),('tk4-t1','u11','primary'),('tk4-t2','u12','primary'),('tk4-t3','u11','primary'),
  ('tk4-t4','u13','primary'),('tk4-t5','u16','primary'),('tk4-t6','u17','primary');
-- tk5 (spa s6): Mgmt→u9, Mktg→u12, IT→u14, Acct→u17(fallback)
INSERT INTO task_assignments (task_id, user_id, role) VALUES
  ('tk5-t0','u9','primary'),('tk5-t1','u12','primary'),('tk5-t2','u12','primary'),
  ('tk5-t3','u14','primary'),('tk5-t4','u14','primary'),('tk5-t5','u17','primary');
-- tk6 (spa s5): Mgmt→u7, Mktg→u11, IT→u15, Acct→u17(fallback)
INSERT INTO task_assignments (task_id, user_id, role) VALUES
  ('tk6-t0','u7','primary'),('tk6-t1','u11','primary'),('tk6-t2','u15','primary'),('tk6-t3','u17','primary');
-- tk7 (spa s3): Mgmt→u4, Mktg→u12, IT→u14, Acct→u18(fallback)
INSERT INTO task_assignments (task_id, user_id, role) VALUES
  ('tk7-t0','u4','primary'),('tk7-t1','u12','primary'),('tk7-t2','u14','primary'),('tk7-t3','u18','primary');
-- tk8 (spa s7): Mgmt→u5, Mktg→u11, IT→u16, Acct→u18
INSERT INTO task_assignments (task_id, user_id, role) VALUES
  ('tk8-t0','u5','primary'),('tk8-t1','u11','primary'),('tk8-t2','u11','primary'),('tk8-t3','u11','primary'),
  ('tk8-t4','u16','primary'),('tk8-t5','u16','primary'),('tk8-t6','u16','primary'),
  ('tk8-t7','u18','primary'),('tk8-t8','u18','primary');

-- Comments
INSERT INTO comments (ticket_id, user_id, text, created_at) VALUES
  ('tk1', 'u2', 'Priority client - let''s get this done ASAP', '2026-02-20T10:30:00Z'),
  ('tk1', 'u12', 'Creatives are being prepared, should be ready by tomorrow', '2026-02-20T15:00:00Z');

-- Activity log
INSERT INTO activity_log (ticket_id, user_id, action, created_at) VALUES
  ('tk1', 'u2', 'Created New Campaign ticket', '2026-02-20T10:00:00Z'),
  ('tk1', 'u2', 'Completed task: Notify AM and TL', '2026-02-20T11:00:00Z');

-- Onboarding form
INSERT INTO onboarding_forms (id, name, slug, ticket_type, fields) VALUES
  ('form-1', 'Spa Onboarding', 'spa', 'New Spa', '[{"id":"ob-1","label":"Spa/Business Name","type":"text","required":true,"options":[]},{"id":"ob-2","label":"Owner Name","type":"text","required":true,"options":[]},{"id":"ob-3","label":"Email","type":"text","required":true,"options":[]},{"id":"ob-4","label":"Phone Number","type":"text","required":true,"options":[]},{"id":"ob-5","label":"Address","type":"text","required":false,"options":[]},{"id":"ob-6","label":"City","type":"text","required":false,"options":[]},{"id":"ob-7","label":"State/Province","type":"text","required":false,"options":[]},{"id":"ob-8","label":"Country","type":"select","required":true,"options":["USA","Canada"]},{"id":"ob-9","label":"Website/Domain","type":"text","required":false,"options":[]},{"id":"ob-10","label":"Services Offered","type":"textarea","required":false,"options":[]},{"id":"ob-11","label":"How did you hear about us?","type":"select","required":false,"options":["Referral","Google","Social Media","Other"]},{"id":"ob-12","label":"Choose your Facial Protocol","type":"tier_select","required":true,"options":[],"tiers":null}]');

-- ============================================================
-- DISABLE RLS FOR TESTING (enable + add policies for production)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spas ENABLE ROW LEVEL SECURITY;
ALTER TABLE spa_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE spa_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_type_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_forms ENABLE ROW LEVEL SECURITY;

-- Permissive policies: allow all operations for anon and authenticated
CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON spas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON spa_promos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON spa_team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON ticket_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON ticket_type_subtasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON task_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON activity_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON onboarding_forms FOR ALL USING (true) WITH CHECK (true);

-- Done! All tables are populated and accessible.
-- Login with any user email + password123
