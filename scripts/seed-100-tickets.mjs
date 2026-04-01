/**
 * Seed 100 varied tickets into the NNN Ticket Manager Supabase database.
 *
 * Usage:  node scripts/seed-100-tickets.mjs
 *
 * This script:
 *  - Fetches real users, spas, ticket types & subtask templates from the DB
 *  - Creates 100 tickets spread across spas & ticket types
 *  - Creates all subtasks per ticket type template
 *  - Assigns tasks to department-matching users with scheduled dates
 *  - Varies priority, status, due dates realistically
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwvkncrrisnhdxshhutd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_pNHE7IFIHwCrFMDX4YkX9A_gqLWl3y3';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ──────────────────────────────────────────────────────────────

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function businessDay(baseDate, offsetDays) {
  const d = new Date(baseDate);
  let added = 0;
  const dir = offsetDays >= 0 ? 1 : -1;
  const target = Math.abs(offsetDays);
  while (added < target) {
    d.setDate(d.getDate() + dir);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
}

function fmtDate(d) { return d.toISOString().slice(0, 10); }

// Treatment names to pair with spas
const TREATMENTS = [
  'LED Facial', 'Hydrafacial', 'Microneedling', 'Chemical Peel', 'Botox Package',
  'Lip Filler Special', 'CoolSculpting', 'Laser Hair Removal', 'PRP Therapy',
  'Skin Tightening', 'Anti-Aging Package', 'Acne Treatment', 'Deep Cleanse Facial',
  'Collagen Boost', 'Vitamin C Infusion', 'Dermaplaning', 'Oxygen Facial',
  "Men's Facial", 'Teen Acne Facial', 'Express Glow Treatment', 'Body Contouring',
  'Scar Revision', 'Rosacea Treatment', 'Pigmentation Correction', 'Detox Wrap',
];

const TARGET_AUDIENCES = ['Women', 'Men', 'Both', 'Women 25-45', 'Men 30-55', 'Women 40+', 'All Ages'];
const PRIORITIES = ['Immediate', 'High', 'Medium'];
const PRIORITY_WEIGHTS = [0.1, 0.3, 0.6]; // 10% Immediate, 30% High, 60% Medium

function weightedPick(items, weights) {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < items.length; i++) {
    cum += weights[i];
    if (r <= cum) return items[i];
  }
  return items[items.length - 1];
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 Fetching existing data from Supabase...');

  // Fetch all reference data in parallel
  const [usersRes, spasRes, typesRes, subtasksRes] = await Promise.all([
    supabase.from('users').select('id, name, department, role').eq('is_active', true),
    supabase.from('spas').select('id, name').eq('status', 'active'),
    supabase.from('ticket_types').select('id, name').eq('is_active', true),
    supabase.from('ticket_type_subtasks').select('*'),
  ]);

  const users = usersRes.data || [];
  const spas = spasRes.data || [];
  const ticketTypes = typesRes.data || [];
  const subtaskTemplates = subtasksRes.data || [];

  console.log(`  Users: ${users.length}`);
  console.log(`  Spas: ${spas.length}`);
  console.log(`  Ticket Types: ${ticketTypes.length}`);
  console.log(`  Subtask Templates: ${subtaskTemplates.length}`);

  if (spas.length === 0 || ticketTypes.length === 0 || users.length === 0) {
    console.error('❌ Missing base data. Make sure users, spas, and ticket types exist.');
    process.exit(1);
  }

  // Group users by department
  const usersByDept = {};
  for (const u of users) {
    if (!usersByDept[u.department]) usersByDept[u.department] = [];
    usersByDept[u.department].push(u);
  }
  console.log(`  Departments: ${Object.keys(usersByDept).join(', ')}`);

  // Group subtask templates by ticket_type_id
  const templatesByType = {};
  for (const st of subtaskTemplates) {
    if (!templatesByType[st.ticket_type_id]) templatesByType[st.ticket_type_id] = [];
    templatesByType[st.ticket_type_id].push(st);
  }

  // Only use ticket types that have subtask templates
  const usableTypes = ticketTypes.filter(tt => templatesByType[tt.id]?.length > 0);
  console.log(`  Usable Ticket Types (with templates): ${usableTypes.length}`);
  if (usableTypes.length === 0) {
    console.error('❌ No ticket types have subtask templates. Run the main seed.sql first.');
    process.exit(1);
  }

  // ── Generate 100 tickets ───────────────────────────────────────────────

  const NUM_TICKETS = 100;
  const now = new Date();
  const allTickets = [];
  const allTasks = [];
  const allAssignments = [];
  const allActivity = [];

  // Status distribution: 30% Done, 20% In Progress, 30% Open, 20% Not Started
  const STATUSES = ['Done', 'In Progress', 'Open', 'Not Started'];
  const STATUS_WEIGHTS = [0.30, 0.20, 0.30, 0.20];

  // Track user workload per day for smart scheduling
  const userDayLoad = {}; // { `${userId}:${date}` : minutes }

  function getLeastLoadedDay(userId, startDate, numDays = 10) {
    let bestDay = null;
    let bestLoad = Infinity;
    for (let i = 0; i < numDays; i++) {
      const day = businessDay(startDate, i);
      const key = `${userId}:${day}`;
      const load = userDayLoad[key] || 0;
      if (load < bestLoad) {
        bestLoad = load;
        bestDay = day;
      }
    }
    return bestDay;
  }

  function addLoad(userId, day, mins) {
    const key = `${userId}:${day}`;
    userDayLoad[key] = (userDayLoad[key] || 0) + mins;
  }

  console.log(`\n🚀 Generating ${NUM_TICKETS} tickets...`);

  for (let i = 0; i < NUM_TICKETS; i++) {
    const ts = Date.now() + i;
    const ticketId = `tk-seed-${ts}`;
    const spa = pick(spas);
    const tt = pick(usableTypes);
    const priority = weightedPick(PRIORITIES, PRIORITY_WEIGHTS);
    const status = weightedPick(STATUSES, STATUS_WEIGHTS);
    const treatment = pick(TREATMENTS);
    const audience = pick(TARGET_AUDIENCES);
    const creator = pick(users);

    // Due date: spread from 2 weeks ago to 4 weeks from now
    const dueOffset = rand(-14, 28);
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + dueOffset);
    const dueDateStr = fmtDate(dueDate);

    // Created date: 3-14 days before due date
    const createdOffset = rand(3, 14);
    const createdDate = new Date(dueDate);
    createdDate.setDate(createdDate.getDate() - createdOffset);

    // Price
    const promoPrice = [49, 69, 79, 99, 119, 129, 149, 179, 199, 249][rand(0, 9)];
    const valuePrice = promoPrice * 2;

    // Start ads date (a few days before due)
    const startAdsDate = businessDay(dueDate, -rand(1, 5));

    const ticket = {
      id: ticketId,
      ticket_type_id: tt.id,
      ticket_type: tt.name,
      spa_id: spa.id,
      treatment_name: treatment,
      promo_price: promoPrice,
      value_price: valuePrice,
      priority,
      target_audience: audience,
      due_date: dueDateStr,
      start_ads_date: startAdsDate,
      status,
      created_by: creator.id,
      created_at: createdDate.toISOString(),
      additional_info: '',
      custom_field_values: {},
    };

    if (status === 'Done') {
      // Completed a few days before due
      const completedDate = new Date(dueDate);
      completedDate.setDate(completedDate.getDate() - rand(0, 3));
      ticket.completed_at = completedDate.toISOString();
    }

    allTickets.push(ticket);

    // ── Create tasks from subtask templates ────────────────────────────

    const templates = templatesByType[tt.id] || [];
    const isDone = status === 'Done';
    const isInProgress = status === 'In Progress';

    for (let j = 0; j < templates.length; j++) {
      const tmpl = templates[j];
      const taskId = `${ticketId}-t${j}`;

      // Determine task status based on ticket status
      let taskStatus;
      if (isDone) {
        taskStatus = 'Done';
      } else if (isInProgress) {
        // First ~60% of tasks done, rest in progress or not started
        if (j < templates.length * 0.4) taskStatus = 'Done';
        else if (j < templates.length * 0.6) taskStatus = 'In Progress';
        else taskStatus = 'Not Started';
      } else if (status === 'Open') {
        // First ~20% done, rest not started
        if (j < templates.length * 0.2) taskStatus = 'Done';
        else taskStatus = 'Not Started';
      } else {
        taskStatus = 'Not Started';
      }

      // Find assigner from matching department
      const deptUsers = usersByDept[tmpl.department] || [];
      const assignee = deptUsers.length > 0 ? pick(deptUsers) : pick(users);

      const task = {
        id: taskId,
        ticket_id: ticketId,
        department: tmpl.department,
        task_name: tmpl.name,
        estimated_minutes: tmpl.estimated_minutes,
        status: taskStatus,
        completed_by: taskStatus === 'Done' ? assignee.id : null,
        completed_at: taskStatus === 'Done'
          ? new Date(createdDate.getTime() + rand(1, 5) * 86400000).toISOString()
          : null,
      };

      allTasks.push(task);

      // Schedule on a business day near the due date
      const schedBase = new Date(createdDate);
      const schedDay = getLeastLoadedDay(assignee.id, schedBase, 10);
      addLoad(assignee.id, schedDay, tmpl.estimated_minutes);

      allAssignments.push({
        task_id: taskId,
        user_id: assignee.id,
        role: 'primary',
        scheduled_date: schedDay,
      });
    }

    // Activity log entry
    allActivity.push({
      ticket_id: ticketId,
      user_id: creator.id,
      action: `created ticket: ${tt.name} for ${spa.name}`,
      created_at: createdDate.toISOString(),
    });

    if ((i + 1) % 25 === 0) console.log(`  Generated ${i + 1}/${NUM_TICKETS}...`);
  }

  console.log(`\n📦 Total records to insert:`);
  console.log(`  Tickets: ${allTickets.length}`);
  console.log(`  Tasks: ${allTasks.length}`);
  console.log(`  Assignments: ${allAssignments.length}`);
  console.log(`  Activity: ${allActivity.length}`);

  // ── Insert in batches ──────────────────────────────────────────────────

  console.log('\n💾 Inserting tickets...');
  // Supabase has a ~1000 row limit per insert, batch at 50 for safety
  for (let i = 0; i < allTickets.length; i += 50) {
    const batch = allTickets.slice(i, i + 50);
    const { error } = await supabase.from('tickets').insert(batch);
    if (error) { console.error(`  ❌ Tickets batch ${i}: ${error.message}`); return; }
    console.log(`  ✅ Tickets ${i + 1}-${Math.min(i + 50, allTickets.length)}`);
  }

  console.log('💾 Inserting tasks...');
  for (let i = 0; i < allTasks.length; i += 100) {
    const batch = allTasks.slice(i, i + 100);
    const { error } = await supabase.from('tasks').insert(batch);
    if (error) { console.error(`  ❌ Tasks batch ${i}: ${error.message}`); return; }
    console.log(`  ✅ Tasks ${i + 1}-${Math.min(i + 100, allTasks.length)}`);
  }

  console.log('💾 Inserting task assignments...');
  for (let i = 0; i < allAssignments.length; i += 100) {
    const batch = allAssignments.slice(i, i + 100);
    const { error } = await supabase.from('task_assignments').insert(batch);
    if (error) { console.error(`  ❌ Assignments batch ${i}: ${error.message}`); return; }
    console.log(`  ✅ Assignments ${i + 1}-${Math.min(i + 100, allAssignments.length)}`);
  }

  console.log('💾 Inserting activity log...');
  for (let i = 0; i < allActivity.length; i += 100) {
    const batch = allActivity.slice(i, i + 100);
    const { error } = await supabase.from('activity_log').insert(batch);
    if (error) { console.error(`  ❌ Activity batch ${i}: ${error.message}`); return; }
    console.log(`  ✅ Activity ${i + 1}-${Math.min(i + 100, allActivity.length)}`);
  }

  console.log('\n🎉 Done! 100 tickets with ~700+ tasks seeded successfully.');
  console.log('   Refresh your app to see the data.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
