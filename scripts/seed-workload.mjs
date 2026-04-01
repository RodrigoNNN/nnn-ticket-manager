/**
 * Seed tickets focused on THIS WEEK's workload so every user shows
 * meaningful hours on the WeekStrip.
 *
 * Usage:  node scripts/seed-workload.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwvkncrrisnhdxshhutd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_pNHE7IFIHwCrFMDX4YkX9A_gqLWl3y3';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Current week dates (Mon Mar 9 – Fri Mar 13, 2026)
const WEEK = ['2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13'];

const TREATMENTS = [
  'LED Facial', 'Hydrafacial', 'Microneedling', 'Chemical Peel', 'Botox Package',
  'Lip Filler Special', 'CoolSculpting', 'Laser Hair Removal', 'PRP Therapy',
  'Skin Tightening', 'Anti-Aging Package', 'Acne Treatment', 'Deep Cleanse Facial',
  'Collagen Boost', 'Vitamin C Infusion', 'Dermaplaning', 'Oxygen Facial',
  "Men's Facial", 'Teen Acne Facial', 'Express Glow', 'Body Contouring',
];

const AUDIENCES = ['Women', 'Men', 'Both', 'Women 25-45', 'Men 30-55'];
const PRIORITIES = ['Immediate', 'High', 'Medium'];
const PRI_W = [0.15, 0.35, 0.5];

function wPick(items, weights) {
  const r = Math.random();
  let c = 0;
  for (let i = 0; i < items.length; i++) { c += weights[i]; if (r <= c) return items[i]; }
  return items[items.length - 1];
}

async function main() {
  console.log('🔄 Fetching reference data...');

  const [usersRes, spasRes, typesRes, subtasksRes] = await Promise.all([
    supabase.from('users').select('id, name, department').eq('is_active', true),
    supabase.from('spas').select('id, name').eq('status', 'active'),
    supabase.from('ticket_types').select('id, name').eq('is_active', true),
    supabase.from('ticket_type_subtasks').select('*'),
  ]);

  const users = usersRes.data || [];
  const spas = spasRes.data || [];
  const ticketTypes = typesRes.data || [];
  const subtaskTemplates = subtasksRes.data || [];

  // Group users by department
  const byDept = {};
  for (const u of users) {
    if (!byDept[u.department]) byDept[u.department] = [];
    byDept[u.department].push(u);
  }

  // Group subtask templates by type
  const tmplByType = {};
  for (const st of subtaskTemplates) {
    if (!tmplByType[st.ticket_type_id]) tmplByType[st.ticket_type_id] = [];
    tmplByType[st.ticket_type_id].push(st);
  }

  const usableTypes = ticketTypes.filter(tt => tmplByType[tt.id]?.length > 0);

  console.log(`  ${users.length} users, ${spas.length} spas, ${usableTypes.length} ticket types`);

  // ── Track per-user per-day workload to spread evenly ───────────────────
  const load = {}; // `userId:date` → minutes
  const addLoad = (uid, day, mins) => { const k = `${uid}:${day}`; load[k] = (load[k] || 0) + mins; };
  const getLoad = (uid, day) => load[`${uid}:${day}`] || 0;

  // Find the least-loaded day THIS WEEK for a user
  function bestDay(uid) {
    let best = WEEK[0], min = Infinity;
    for (const d of WEEK) {
      const l = getLoad(uid, d);
      if (l < min) { min = l; best = d; }
    }
    return best;
  }

  // ── Generate 50 tickets all due this/next week, tasks scheduled this week ─
  const NUM = 50;
  const allTickets = [];
  const allTasks = [];
  const allAssignments = [];
  const allActivity = [];

  console.log(`\n🚀 Generating ${NUM} workload-heavy tickets for this week...`);

  for (let i = 0; i < NUM; i++) {
    const ts = Date.now() + i;
    const ticketId = `tk-wl-${ts}`;
    const spa = pick(spas);
    const tt = pick(usableTypes);
    const priority = wPick(PRIORITIES, PRI_W);
    const treatment = pick(TREATMENTS);
    const creator = pick(users);

    // Due dates: this week or next week
    const dueDay = pick([...WEEK, '2026-03-16', '2026-03-17', '2026-03-18', '2026-03-19', '2026-03-20']);
    // Created 2-5 days ago
    const createdDate = new Date('2026-03-11T10:00:00Z');
    createdDate.setDate(createdDate.getDate() - rand(2, 7));

    const ticket = {
      id: ticketId,
      ticket_type_id: tt.id,
      ticket_type: tt.name,
      spa_id: spa.id,
      treatment_name: treatment,
      promo_price: [79, 99, 129, 149, 179, 199][rand(0, 5)],
      value_price: [159, 199, 259, 299, 359, 399][rand(0, 5)],
      priority,
      target_audience: pick(AUDIENCES),
      due_date: dueDay,
      start_ads_date: dueDay,
      status: pick(['Open', 'In Progress', 'In Progress', 'In Progress']), // mostly active
      created_by: creator.id,
      created_at: createdDate.toISOString(),
      additional_info: '',
      custom_field_values: {},
    };
    allTickets.push(ticket);

    // Create tasks from templates — assign to THIS WEEK
    const templates = tmplByType[tt.id] || [];
    for (let j = 0; j < templates.length; j++) {
      const tmpl = templates[j];
      const taskId = `${ticketId}-t${j}`;

      // ~30% of early tasks Done, rest Not Started / In Progress
      let taskStatus;
      if (j < templates.length * 0.3 && Math.random() < 0.5) taskStatus = 'Done';
      else if (j < templates.length * 0.5) taskStatus = 'In Progress';
      else taskStatus = 'Not Started';

      // Pick assignee from the right department
      const deptUsers = byDept[tmpl.department] || [];
      const assignee = deptUsers.length > 0 ? pick(deptUsers) : pick(users);

      const task = {
        id: taskId,
        ticket_id: ticketId,
        department: tmpl.department,
        task_name: tmpl.name,
        estimated_minutes: tmpl.estimated_minutes,
        status: taskStatus,
        completed_by: taskStatus === 'Done' ? assignee.id : null,
        completed_at: taskStatus === 'Done' ? new Date('2026-03-10T14:00:00Z').toISOString() : null,
      };
      allTasks.push(task);

      // Schedule on the least-loaded day this week for this user
      const day = bestDay(assignee.id);
      addLoad(assignee.id, day, tmpl.estimated_minutes);

      allAssignments.push({
        task_id: taskId,
        user_id: assignee.id,
        role: 'primary',
        scheduled_date: day,
      });
    }

    allActivity.push({
      ticket_id: ticketId,
      user_id: creator.id,
      action: `created ticket: ${tt.name} for ${spa.name}`,
      created_at: createdDate.toISOString(),
    });
  }

  // Print workload summary
  console.log('\n📊 Workload distribution (this week):');
  for (const u of users) {
    const days = WEEK.map(d => {
      const mins = getLoad(u.id, d);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h${m}m` : `${h}h`;
    });
    const total = WEEK.reduce((s, d) => s + getLoad(u.id, d), 0);
    if (total > 0) {
      console.log(`  ${u.name.padEnd(20)} ${days.join('  |  ')}  → ${Math.round(total / 60)}h total`);
    }
  }

  console.log(`\n📦 Inserting: ${allTickets.length} tickets, ${allTasks.length} tasks, ${allAssignments.length} assignments`);

  // Insert tickets
  for (let i = 0; i < allTickets.length; i += 50) {
    const batch = allTickets.slice(i, i + 50);
    const { error } = await supabase.from('tickets').insert(batch);
    if (error) { console.error(`❌ Tickets: ${error.message}`); return; }
  }
  console.log('  ✅ Tickets');

  // Insert tasks
  for (let i = 0; i < allTasks.length; i += 100) {
    const batch = allTasks.slice(i, i + 100);
    const { error } = await supabase.from('tasks').insert(batch);
    if (error) { console.error(`❌ Tasks: ${error.message}`); return; }
  }
  console.log('  ✅ Tasks');

  // Insert assignments
  for (let i = 0; i < allAssignments.length; i += 100) {
    const batch = allAssignments.slice(i, i + 100);
    const { error } = await supabase.from('task_assignments').insert(batch);
    if (error) { console.error(`❌ Assignments: ${error.message}`); return; }
  }
  console.log('  ✅ Assignments');

  // Insert activity
  for (let i = 0; i < allActivity.length; i += 100) {
    const batch = allActivity.slice(i, i + 100);
    const { error } = await supabase.from('activity_log').insert(batch);
    if (error) { console.error(`❌ Activity: ${error.message}`); return; }
  }
  console.log('  ✅ Activity');

  console.log('\n🎉 Done! Refresh the app — every user should now have a packed week.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
