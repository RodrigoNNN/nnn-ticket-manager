/**
 * Seed script — populates the SQLite database with all mock data.
 * Run: node db/seed.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { getDb, closeDb } = require('./database');

const DEFAULT_PASSWORD = 'password123';
const HASH = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

// ─── Users (18 total) ───
const USERS = [
  { id: 'u1', name: 'tpradas', email: 'tpradas@nnn.com', department: 'Management', role: 'admin' },
  { id: 'u2', name: 'Joe', email: 'joe@nnn.com', department: 'Management', role: 'admin' },
  { id: 'u3', name: 'Olivia', email: 'olivia@nnn.com', department: 'Management', role: 'admin' },
  { id: 'u4', name: 'Jizza', email: 'jizza@nnn.com', department: 'Management', role: 'admin' },
  { id: 'u5', name: 'AJ', email: 'aj@nnn.com', department: 'Management', role: 'admin' },
  { id: 'u6', name: 'Rachel', email: 'rachel@nnn.com', department: 'Management', role: 'admin' },
  { id: 'u7', name: 'Reut', email: 'reut@nnn.com', department: 'Management', role: 'admin' },
  { id: 'u8', name: 'Trisha', email: 'trisha@nnn.com', department: 'Management', role: 'admin' },
  { id: 'u9', name: 'Catherine', email: 'catherine@nnn.com', department: 'Management', role: 'admin' },
  { id: 'u10', name: 'Matt', email: 'matt@nnn.com', department: 'Management', role: 'admin' },
  { id: 'u11', name: 'Daniel', email: 'daniel@nnn.com', department: 'Marketing', role: 'member' },
  { id: 'u12', name: 'Rodrigo', email: 'rodrigo@nnn.com', department: 'Marketing', role: 'member' },
  { id: 'u13', name: 'Mon', email: 'mon@nnn.com', department: 'IT', role: 'member' },
  { id: 'u14', name: 'Miriam', email: 'miriam@nnn.com', department: 'IT', role: 'member' },
  { id: 'u15', name: 'Juda', email: 'juda@nnn.com', department: 'IT', role: 'member' },
  { id: 'u16', name: 'Hosam', email: 'hosam@nnn.com', department: 'IT', role: 'member' },
  { id: 'u17', name: 'Christy', email: 'christy@nnn.com', department: 'Accounting', role: 'member' },
  { id: 'u18', name: 'Julia Benyamin', email: 'julia@nnn.com', department: 'Accounting', role: 'member' },
];

// ─── Spas (10 total) ───
const SPAS = [
  { id: 's1', name: 'Glow Medical Spa', location: 'Miami, FL', country: 'USA', tier: 1, monthly_budget: 5000, arrival_goal: 50, onboarding_data: { 'ob-1': 'Glow Medical Spa', 'ob-2': 'Dr. Sarah Johnson', 'ob-3': 'sarah@glowmedicalspa.com', 'ob-4': '+1-305-555-0100' }, onboarded_at: '2025-06-15T10:00:00Z' },
  { id: 's2', name: 'Radiance Aesthetics', location: 'Los Angeles, CA', country: 'USA', tier: 1, monthly_budget: 8000, arrival_goal: 80, onboarding_data: {}, onboarded_at: '2025-07-01T10:00:00Z' },
  { id: 's3', name: 'Pure Skin Clinic', location: 'Toronto, ON', country: 'Canada', tier: 2, monthly_budget: 3000, arrival_goal: 30, onboarding_data: {}, onboarded_at: '2025-08-01T10:00:00Z' },
  { id: 's4', name: 'Luxe MedSpa', location: 'New York, NY', country: 'USA', tier: 1, monthly_budget: 10000, arrival_goal: 100, onboarding_data: {}, onboarded_at: '2025-08-15T10:00:00Z' },
  { id: 's5', name: 'Revive Wellness', location: 'Chicago, IL', country: 'USA', tier: 2, monthly_budget: 4000, arrival_goal: 40, onboarding_data: {}, onboarded_at: '2025-09-01T10:00:00Z' },
  { id: 's6', name: 'Bella Derma', location: 'Houston, TX', country: 'USA', tier: 3, monthly_budget: 2000, arrival_goal: 20, onboarding_data: {}, onboarded_at: '2025-09-15T10:00:00Z' },
  { id: 's7', name: 'Aura Med Spa', location: 'Vancouver, BC', country: 'Canada', tier: 2, monthly_budget: 3500, arrival_goal: 35, onboarding_data: {}, onboarded_at: '2025-10-01T10:00:00Z' },
  { id: 's8', name: 'Elite Skin Care', location: 'Dallas, TX', country: 'USA', tier: 3, monthly_budget: 1500, arrival_goal: 15, onboarding_data: {}, onboarded_at: '2025-10-15T10:00:00Z' },
  { id: 's9', name: 'Zenith Aesthetics', location: 'San Francisco, CA', country: 'USA', tier: null, monthly_budget: null, arrival_goal: null, onboarding_data: {}, onboarded_at: '2026-02-23T09:00:00Z' },
  { id: 's10', name: 'Harmony Medi Spa', location: 'Atlanta, GA', country: 'USA', tier: 1, monthly_budget: 6000, arrival_goal: 60, onboarding_data: {}, onboarded_at: '2025-11-01T10:00:00Z' },
];

// Spa promos
const SPA_PROMOS = [
  { id: 'p1', spa_id: 's1', name: 'Spring Botox Special', price: 199, value_price: 450, active: 1 },
];

// Spa team assignments
const SPA_TEAMS = [
  // s1: Glow Medical Spa
  { spa_id: 's1', department: 'Management', user_id: 'u2' },
  { spa_id: 's1', department: 'Management', user_id: 'u6' },
  { spa_id: 's1', department: 'Marketing', user_id: 'u12' },
  { spa_id: 's1', department: 'IT', user_id: 'u13' },
  { spa_id: 's1', department: 'Accounting', user_id: 'u17' },
  // s2: Radiance Aesthetics
  { spa_id: 's2', department: 'Management', user_id: 'u3' },
  { spa_id: 's2', department: 'Management', user_id: 'u5' },
  { spa_id: 's2', department: 'Marketing', user_id: 'u11' },
  { spa_id: 's2', department: 'IT', user_id: 'u15' },
  { spa_id: 's2', department: 'Accounting', user_id: 'u18' },
  // s3: Pure Skin Clinic
  { spa_id: 's3', department: 'Management', user_id: 'u4' },
  { spa_id: 's3', department: 'Marketing', user_id: 'u12' },
  { spa_id: 's3', department: 'IT', user_id: 'u14' },
  // s4: Luxe MedSpa
  { spa_id: 's4', department: 'Management', user_id: 'u2' },
  { spa_id: 's4', department: 'Management', user_id: 'u8' },
  { spa_id: 's4', department: 'Marketing', user_id: 'u11' },
  { spa_id: 's4', department: 'Marketing', user_id: 'u12' },
  { spa_id: 's4', department: 'IT', user_id: 'u13' },
  { spa_id: 's4', department: 'IT', user_id: 'u16' },
  { spa_id: 's4', department: 'Accounting', user_id: 'u17' },
  // s5: Revive Wellness
  { spa_id: 's5', department: 'Management', user_id: 'u7' },
  { spa_id: 's5', department: 'Marketing', user_id: 'u11' },
  { spa_id: 's5', department: 'IT', user_id: 'u15' },
  // s6: Bella Derma
  { spa_id: 's6', department: 'Management', user_id: 'u9' },
  { spa_id: 's6', department: 'Marketing', user_id: 'u12' },
  { spa_id: 's6', department: 'IT', user_id: 'u14' },
  // s7: Aura Med Spa
  { spa_id: 's7', department: 'Management', user_id: 'u5' },
  { spa_id: 's7', department: 'Marketing', user_id: 'u11' },
  { spa_id: 's7', department: 'IT', user_id: 'u16' },
  { spa_id: 's7', department: 'Accounting', user_id: 'u18' },
  // s8: Elite Skin Care
  { spa_id: 's8', department: 'Management', user_id: 'u10' },
  { spa_id: 's8', department: 'Marketing', user_id: 'u12' },
  { spa_id: 's8', department: 'IT', user_id: 'u14' },
  // s9: Zenith Aesthetics (no team)
  // s10: Harmony Medi Spa
  { spa_id: 's10', department: 'Management', user_id: 'u2' },
  { spa_id: 's10', department: 'Management', user_id: 'u4' },
  { spa_id: 's10', department: 'Marketing', user_id: 'u11' },
  { spa_id: 's10', department: 'IT', user_id: 'u13' },
  { spa_id: 's10', department: 'Accounting', user_id: 'u17' },
];

// ─── Ticket Types (9 total) ───
const TICKET_TYPES = [
  { id: 'tt1', name: 'New Campaign', color: '#3B82F6', subtasks: {
    Management: [{ name: 'Notify AM and TL', estimated_minutes: 5 }],
    Marketing: [{ name: 'Request LP', estimated_minutes: 1 }, { name: 'Choose Creatives', estimated_minutes: 10 }, { name: 'Create Form', estimated_minutes: 15 }],
    IT: [{ name: 'Technical Setup', estimated_minutes: 20 }, { name: 'Pixel and Tracking Setup', estimated_minutes: 15 }, { name: 'Campaign Configuration', estimated_minutes: 30 }],
    Accounting: [{ name: 'Budget Setup', estimated_minutes: 10 }, { name: 'Billing Update', estimated_minutes: 5 }],
  }},
  { id: 'tt2', name: 'New Spa', color: '#10B981', subtasks: {
    Management: [{ name: 'Notify AM and TL', estimated_minutes: 5 }, { name: 'Client Onboarding Review', estimated_minutes: 20 }],
    Marketing: [{ name: 'Request LP', estimated_minutes: 1 }, { name: 'Choose Creatives', estimated_minutes: 10 }, { name: 'Create Form', estimated_minutes: 15 }, { name: 'Setup Ad Copy', estimated_minutes: 15 }],
    IT: [{ name: 'Domain Setup', estimated_minutes: 15 }, { name: 'Pixel Installation', estimated_minutes: 20 }, { name: 'Tracking Configuration', estimated_minutes: 20 }, { name: 'Campaign Technical Setup', estimated_minutes: 30 }],
    Accounting: [{ name: 'Contract Setup', estimated_minutes: 15 }, { name: 'Initial Budget Configuration', estimated_minutes: 10 }, { name: 'Billing Setup', estimated_minutes: 10 }],
  }},
  { id: 'tt3', name: 'Campaign Price Change', color: '#F59E0B', subtasks: {
    Management: [{ name: 'Approve Price Change', estimated_minutes: 5 }],
    Marketing: [{ name: 'Update Ad Copy', estimated_minutes: 10 }, { name: 'Update Landing Page', estimated_minutes: 15 }, { name: 'Update Creatives', estimated_minutes: 10 }],
    IT: [{ name: 'Update Form Fields', estimated_minutes: 10 }, { name: 'Verify Conversion Tracking', estimated_minutes: 10 }],
    Accounting: [{ name: 'Update Revenue Projections', estimated_minutes: 10 }],
  }},
  { id: 'tt4', name: 'Budget Change', color: '#EF4444', subtasks: {
    Management: [{ name: 'Approve Budget Change', estimated_minutes: 5 }],
    Marketing: [{ name: 'Update Campaign Settings', estimated_minutes: 10 }],
    IT: [{ name: 'Verify Tracking After Change', estimated_minutes: 10 }],
    Accounting: [{ name: 'Update Billing Records', estimated_minutes: 10 }, { name: 'Confirm New Budget', estimated_minutes: 5 }],
  }},
  { id: 'tt5', name: 'Service Status Change', color: '#8B5CF6', subtasks: {
    Management: [{ name: 'Confirm Status Change', estimated_minutes: 5 }],
    Marketing: [{ name: 'Pause or Activate Campaigns', estimated_minutes: 10 }],
    IT: [{ name: 'Update Tracking Status', estimated_minutes: 10 }],
    Accounting: [{ name: 'Update Billing Status', estimated_minutes: 5 }],
  }},
  { id: 'tt6', name: 'Availability Change', color: '#EC4899', subtasks: {
    Management: [{ name: 'Review Availability Update', estimated_minutes: 5 }],
    Marketing: [{ name: 'Update Ad Scheduling', estimated_minutes: 10 }],
    IT: [{ name: 'Update Calendar Integration', estimated_minutes: 15 }],
    Accounting: [{ name: 'Adjust Budget Allocation', estimated_minutes: 10 }],
  }},
  { id: 'tt7', name: 'Spa Performance Issues', color: '#DC2626', subtasks: {
    Management: [{ name: 'Review Performance Report', estimated_minutes: 15 }],
    Marketing: [{ name: 'Analyze Campaign Metrics', estimated_minutes: 20 }, { name: 'Propose Optimization Plan', estimated_minutes: 30 }],
    IT: [{ name: 'Check Technical Issues', estimated_minutes: 20 }, { name: 'Review Tracking Data', estimated_minutes: 15 }],
    Accounting: [{ name: 'Review Spend vs Performance', estimated_minutes: 15 }],
  }},
  { id: 'tt8', name: 'Ad Pause Request', color: '#6B7280', subtasks: {
    Management: [{ name: 'Approve Ad Pause', estimated_minutes: 5 }],
    Marketing: [{ name: 'Pause Active Campaigns', estimated_minutes: 5 }],
    IT: [{ name: 'Verify Campaigns Paused', estimated_minutes: 5 }],
    Accounting: [{ name: 'Update Budget Status', estimated_minutes: 5 }],
  }},
  { id: 'tt9', name: 'Campaign GHL Migration', color: '#0EA5E9', subtasks: {
    Management: [{ name: 'Approve Migration Plan', estimated_minutes: 10 }],
    Marketing: [{ name: 'Migrate Campaign Assets', estimated_minutes: 30 }, { name: 'Update Tracking Links', estimated_minutes: 15 }],
    IT: [{ name: 'Setup GHL Integration', estimated_minutes: 45 }, { name: 'Migrate Technical Configuration', estimated_minutes: 30 }, { name: 'Test New Setup', estimated_minutes: 20 }],
    Accounting: [{ name: 'Update Platform Billing', estimated_minutes: 10 }],
  }},
];

// ─── Tickets (8 total) ───
// Task statuses by department per ticket
const TICKETS = [
  {
    id: 'tk1', ticket_type: 'New Campaign', ticket_type_id: 'tt1', spa_id: 's1',
    treatment_name: 'Botox Special', promo_price: 199, value_price: 450, priority: 'High',
    target_audience: 'Women', due_date: '2026-03-01', status: 'In Progress',
    created_by: 'u2', created_at: '2026-02-20T10:00:00Z', additional_info: 'Launch before March. Target age 25-55.',
    deptStatuses: { Management: 'Done', Marketing: 'In Progress', IT: 'Not Started', Accounting: 'Not Started' },
  },
  {
    id: 'tk2', ticket_type: 'New Spa', ticket_type_id: 'tt2', spa_id: 's9',
    treatment_name: 'Full Service Launch', promo_price: null, value_price: null, priority: 'Immediate',
    target_audience: 'Both', due_date: '2026-02-28', start_ads_date: '2026-03-05', first_booking_date: '2026-03-10', domain: 'zenith-aesthetics.com',
    status: 'Open', created_by: 'u3', created_at: '2026-02-23T09:00:00Z',
    additional_info: 'Brand new client. Need full onboarding.',
    deptStatuses: {},
  },
  {
    id: 'tk3', ticket_type: 'Budget Change', ticket_type_id: 'tt4', spa_id: 's2',
    treatment_name: 'Laser Hair Removal', promo_price: 149, value_price: 350, priority: 'Medium',
    target_audience: 'Women', due_date: '2026-02-18', status: 'Done',
    created_by: 'u2', created_at: '2026-02-10T08:00:00Z', completed_at: '2026-02-17T16:00:00Z',
    additional_info: 'Increase daily budget from $50 to $100.',
    deptStatuses: { Management: 'Done', Marketing: 'Done', IT: 'Done', Accounting: 'Done' },
  },
  {
    id: 'tk4', ticket_type: 'Campaign Price Change', ticket_type_id: 'tt3', spa_id: 's4',
    treatment_name: 'CoolSculpting', promo_price: 599, value_price: 1200, priority: 'High',
    target_audience: 'Both', due_date: '2026-03-05', status: 'In Progress',
    created_by: 'u6', created_at: '2026-02-21T14:00:00Z', additional_info: 'New spring pricing.',
    deptStatuses: { Management: 'Done' },
  },
  {
    id: 'tk5', ticket_type: 'Spa Performance Issues', ticket_type_id: 'tt7', spa_id: 's6',
    treatment_name: 'Hydrafacial', promo_price: 129, value_price: 250, priority: 'Immediate',
    target_audience: 'Women', due_date: '2026-02-25', status: 'Open',
    created_by: 'u2', created_at: '2026-02-24T07:00:00Z',
    additional_info: 'CPA is too high. Need immediate review.',
    deptStatuses: {},
  },
  {
    id: 'tk6', ticket_type: 'Ad Pause Request', ticket_type_id: 'tt8', spa_id: 's5',
    treatment_name: 'Chemical Peel', promo_price: 99, value_price: 200, priority: 'Medium',
    target_audience: 'Women', due_date: '2026-02-27', status: 'In Progress',
    created_by: 'u4', created_at: '2026-02-19T11:00:00Z',
    additional_info: 'Client requested temporary pause for 2 weeks.',
    deptStatuses: { Management: 'Done', Marketing: 'Done', IT: 'In Progress' },
  },
  {
    id: 'tk7', ticket_type: 'Service Status Change', ticket_type_id: 'tt5', spa_id: 's3',
    treatment_name: 'Dermal Fillers', promo_price: 399, value_price: 700, priority: 'High',
    target_audience: 'Both', due_date: '2026-02-26', status: 'In Progress',
    created_by: 'u8', created_at: '2026-02-18T09:00:00Z',
    additional_info: 'Re-activating service after supply restock.',
    deptStatuses: { Management: 'Done', Marketing: 'Done', IT: 'Done', Accounting: 'In Progress' },
  },
  {
    id: 'tk8', ticket_type: 'New Campaign', ticket_type_id: 'tt1', spa_id: 's7',
    treatment_name: 'Microneedling', promo_price: 179, value_price: 400, priority: 'Medium',
    target_audience: 'Women', due_date: '2026-03-10', status: 'In Progress',
    created_by: 'u5', created_at: '2026-02-22T13:00:00Z', additional_info: '',
    deptStatuses: { Management: 'In Progress' },
  },
];

// Comments
const COMMENTS = [
  { ticket_id: 'tk1', user_id: 'u2', text: "Priority client - let's get this done ASAP", created_at: '2026-02-20T10:30:00Z' },
  { ticket_id: 'tk1', user_id: 'u12', text: 'Creatives are being prepared, should be ready by tomorrow', created_at: '2026-02-20T15:00:00Z' },
];

// Activity log entries
const ACTIVITIES = [
  { ticket_id: 'tk1', user_id: 'u2', action: 'Created New Campaign ticket', created_at: '2026-02-20T10:00:00Z' },
  { ticket_id: 'tk1', user_id: 'u2', action: 'Completed task: Notify AM and TL', created_at: '2026-02-20T11:00:00Z' },
];

// Onboarding forms
const ONBOARDING_FORMS = [
  {
    id: 'form-1', name: 'Spa Onboarding', slug: 'spa', ticket_type: 'New Spa',
    fields: [
      { id: 'ob-1', label: 'Spa/Business Name', type: 'text', required: true, options: [] },
      { id: 'ob-2', label: 'Owner Name', type: 'text', required: true, options: [] },
      { id: 'ob-3', label: 'Email', type: 'text', required: true, options: [] },
      { id: 'ob-4', label: 'Phone Number', type: 'text', required: true, options: [] },
      { id: 'ob-5', label: 'Address', type: 'text', required: false, options: [] },
      { id: 'ob-6', label: 'City', type: 'text', required: false, options: [] },
      { id: 'ob-7', label: 'State/Province', type: 'text', required: false, options: [] },
      { id: 'ob-8', label: 'Country', type: 'select', required: true, options: ['USA', 'Canada'] },
      { id: 'ob-9', label: 'Website/Domain', type: 'text', required: false, options: [] },
      { id: 'ob-10', label: 'Services Offered', type: 'textarea', required: false, options: [] },
      { id: 'ob-11', label: 'How did you hear about us?', type: 'select', required: false, options: ['Referral', 'Google', 'Social Media', 'Other'] },
      { id: 'ob-12', label: 'Choose your Facial Protocol', type: 'tier_select', required: true, options: [], tiers: null },
    ],
  },
];

// ─── Seed functions ───

function seedUsers(db) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, password_hash, department, role, is_active, whatsapp_number)
    VALUES (?, ?, ?, ?, ?, ?, 1, '')
  `);
  for (const u of USERS) {
    insert.run(u.id, u.name, u.email, HASH, u.department, u.role);
  }
  console.log(`  Inserted ${USERS.length} users`);
}

function seedSpas(db) {
  const insertSpa = db.prepare(`
    INSERT OR REPLACE INTO spas (id, name, location, country, status, tier, monthly_budget, arrival_goal, onboarding_data, extra_fields, onboarded_at, onboarded_via)
    VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, '[]', ?, 'manual')
  `);
  for (const s of SPAS) {
    insertSpa.run(s.id, s.name, s.location, s.country, s.tier, s.monthly_budget, s.arrival_goal,
      JSON.stringify(s.onboarding_data), s.onboarded_at);
  }
  console.log(`  Inserted ${SPAS.length} spas`);

  // Promos
  const insertPromo = db.prepare('INSERT OR REPLACE INTO spa_promos (id, spa_id, name, price, value_price, active) VALUES (?, ?, ?, ?, ?, ?)');
  for (const p of SPA_PROMOS) {
    insertPromo.run(p.id, p.spa_id, p.name, p.price, p.value_price, p.active);
  }
  console.log(`  Inserted ${SPA_PROMOS.length} promos`);

  // Team members
  const insertTeam = db.prepare('INSERT OR REPLACE INTO spa_team_members (spa_id, department, user_id) VALUES (?, ?, ?)');
  for (const t of SPA_TEAMS) {
    insertTeam.run(t.spa_id, t.department, t.user_id);
  }
  console.log(`  Inserted ${SPA_TEAMS.length} team assignments`);
}

function seedTicketTypes(db) {
  const insertType = db.prepare(`
    INSERT OR REPLACE INTO ticket_types (id, name, color, is_active, instructions, custom_fields)
    VALUES (?, ?, ?, 1, '', '[]')
  `);
  const insertSubtask = db.prepare(`
    INSERT INTO ticket_type_subtasks (ticket_type_id, department, name, estimated_minutes)
    VALUES (?, ?, ?, ?)
  `);

  // Clear existing subtasks first
  db.prepare('DELETE FROM ticket_type_subtasks').run();

  for (const tt of TICKET_TYPES) {
    insertType.run(tt.id, tt.name, tt.color);
    for (const [dept, tasks] of Object.entries(tt.subtasks)) {
      for (const task of tasks) {
        insertSubtask.run(tt.id, dept, task.name, task.estimated_minutes);
      }
    }
  }
  console.log(`  Inserted ${TICKET_TYPES.length} ticket types with subtasks`);
}

function seedTickets(db) {
  const insertTicket = db.prepare(`
    INSERT OR REPLACE INTO tickets (id, ticket_type_id, ticket_type, spa_id, treatment_name, promo_price, value_price,
      priority, target_audience, due_date, start_ads_date, first_booking_date, domain, status, created_by, created_at,
      completed_at, additional_info, custom_field_values)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')
  `);
  const insertTask = db.prepare(`
    INSERT OR REPLACE INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status, completed_by, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAssignment = db.prepare(`
    INSERT OR REPLACE INTO task_assignments (task_id, user_id, role)
    VALUES (?, ?, 'primary')
  `);

  // Helper: get subtasks for a ticket type
  function getSubtasksForType(typeId) {
    return db.prepare('SELECT * FROM ticket_type_subtasks WHERE ticket_type_id = ? ORDER BY department, id').all(typeId);
  }

  // Helper: find least loaded employee in department
  function findLeastLoaded(department) {
    const users = db.prepare('SELECT * FROM users WHERE department = ? AND is_active = 1').all(department);
    if (users.length === 0) return null;

    let best = null;
    let bestLoad = Infinity;
    for (const user of users) {
      const result = db.prepare(`
        SELECT COALESCE(SUM(t.estimated_minutes), 0) as total
        FROM task_assignments ta
        JOIN tasks t ON t.id = ta.task_id
        WHERE ta.user_id = ? AND t.status != 'Done'
      `).get(user.id);
      if (result.total < bestLoad) {
        bestLoad = result.total;
        best = user;
      }
    }
    return best;
  }

  // Helper: spa-aware assignment
  function findAssignee(department, spaId) {
    if (spaId) {
      const teamMembers = db.prepare(`
        SELECT u.* FROM spa_team_members stm
        JOIN users u ON u.id = stm.user_id
        WHERE stm.spa_id = ? AND stm.department = ? AND u.is_active = 1
      `).all(spaId, department);

      if (teamMembers.length > 0) {
        let best = null;
        let bestLoad = Infinity;
        for (const user of teamMembers) {
          const result = db.prepare(`
            SELECT COALESCE(SUM(t.estimated_minutes), 0) as total
            FROM task_assignments ta
            JOIN tasks t ON t.id = ta.task_id
            WHERE ta.user_id = ? AND t.status != 'Done'
          `).get(user.id);
          if (result.total < bestLoad) {
            bestLoad = result.total;
            best = user;
          }
        }
        return best;
      }
    }
    return findLeastLoaded(department);
  }

  for (const tk of TICKETS) {
    insertTicket.run(
      tk.id, tk.ticket_type_id, tk.ticket_type, tk.spa_id,
      tk.treatment_name, tk.promo_price || null, tk.value_price || null,
      tk.priority, tk.target_audience, tk.due_date,
      tk.start_ads_date || null, tk.first_booking_date || null, tk.domain || '',
      tk.status, tk.created_by, tk.created_at,
      tk.completed_at || null, tk.additional_info
    );

    // Generate tasks from subtask templates
    const subtasks = getSubtasksForType(tk.ticket_type_id);
    let taskIdx = 0;
    for (const sub of subtasks) {
      const taskId = `${tk.id}-t${taskIdx}`;
      const deptStatus = tk.deptStatuses[sub.department] || 'Not Started';
      const completedBy = deptStatus === 'Done' ? 'u2' : null;
      const completedAt = deptStatus === 'Done' ? '2026-02-22T14:00:00Z' : null;

      insertTask.run(taskId, tk.id, sub.department, sub.name, sub.estimated_minutes,
        deptStatus, completedBy, completedAt);

      // Auto-assign using spa-aware logic
      const assignee = findAssignee(sub.department, tk.spa_id);
      if (assignee) {
        insertAssignment.run(taskId, assignee.id);
      }
      taskIdx++;
    }
  }
  console.log(`  Inserted ${TICKETS.length} tickets with tasks and assignments`);
}

function seedComments(db) {
  const insert = db.prepare('INSERT INTO comments (ticket_id, user_id, text, created_at) VALUES (?, ?, ?, ?)');
  for (const c of COMMENTS) {
    insert.run(c.ticket_id, c.user_id, c.text, c.created_at);
  }
  console.log(`  Inserted ${COMMENTS.length} comments`);
}

function seedActivity(db) {
  const insert = db.prepare('INSERT INTO activity_log (ticket_id, user_id, action, created_at) VALUES (?, ?, ?, ?)');
  for (const a of ACTIVITIES) {
    insert.run(a.ticket_id, a.user_id, a.action, a.created_at);
  }
  console.log(`  Inserted ${ACTIVITIES.length} activity entries`);
}

function seedOnboardingForms(db) {
  const insert = db.prepare('INSERT OR REPLACE INTO onboarding_forms (id, name, slug, ticket_type, fields) VALUES (?, ?, ?, ?, ?)');
  for (const f of ONBOARDING_FORMS) {
    insert.run(f.id, f.name, f.slug, f.ticket_type, JSON.stringify(f.fields));
  }
  console.log(`  Inserted ${ONBOARDING_FORMS.length} onboarding forms`);
}

// ─── Main ───
function seed() {
  console.log('Seeding NNN Ticket Manager database...\n');
  const db = getDb();

  // Clear existing data (in order due to foreign keys)
  console.log('Clearing existing data...');
  db.exec(`
    DELETE FROM activity_log;
    DELETE FROM comments;
    DELETE FROM task_assignments;
    DELETE FROM tasks;
    DELETE FROM tickets;
    DELETE FROM ticket_type_subtasks;
    DELETE FROM ticket_types;
    DELETE FROM spa_team_members;
    DELETE FROM spa_promos;
    DELETE FROM spas;
    DELETE FROM users;
    DELETE FROM onboarding_forms;
  `);

  console.log('\nInserting seed data...');
  seedUsers(db);
  seedSpas(db);
  seedTicketTypes(db);
  seedTickets(db);
  seedComments(db);
  seedActivity(db);
  seedOnboardingForms(db);

  console.log('\nSeed complete!');
  console.log(`\nDefault login: any user email (e.g., joe@nnn.com) with password: ${DEFAULT_PASSWORD}`);

  closeDb();
}

seed();
