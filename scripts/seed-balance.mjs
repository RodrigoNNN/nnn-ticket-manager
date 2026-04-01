/**
 * 1. Pack Rodrigo's (Marketing) week to near-full capacity (~6-7h/day)
 * 2. Redistribute Hossam's overload to other IT members
 *
 * Usage:  node scripts/seed-balance.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwvkncrrisnhdxshhutd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_pNHE7IFIHwCrFMDX4YkX9A_gqLWl3y3';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const WEEK = ['2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13'];

const TREATMENTS = [
  'LED Facial', 'Hydrafacial', 'Microneedling', 'Chemical Peel', 'Botox Package',
  'Lip Filler Special', 'CoolSculpting', 'Laser Hair Removal', 'PRP Therapy',
  'Skin Tightening', 'Anti-Aging Package', 'Acne Treatment', 'Deep Cleanse Facial',
  'Collagen Boost', 'Vitamin C Infusion', 'Dermaplaning', 'Oxygen Facial',
  "Men's Facial", 'Express Glow', 'Body Contouring', 'Scar Revision',
];

const AUDIENCES = ['Women', 'Men', 'Both', 'Women 25-45', 'Men 30-55'];

async function main() {
  console.log('🔄 Fetching data...');

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

  // Find key users
  const rodrigo = users.find(u => u.name.toLowerCase().includes('rodrigo'));
  const marketingUsers = users.filter(u => u.department === 'Marketing');
  const itUsers = users.filter(u => u.department === 'IT');
  const hossam = users.find(u => u.name.toLowerCase().includes('hossam') || u.name.toLowerCase().includes('hosam'));

  console.log(`  Rodrigo: ${rodrigo?.id} (${rodrigo?.name})`);
  console.log(`  Marketing users: ${marketingUsers.map(u => u.name).join(', ')}`);
  console.log(`  IT users: ${itUsers.map(u => u.name).join(', ')}`);
  console.log(`  Hossam: ${hossam?.id} (${hossam?.name})`);

  // Group by dept
  const byDept = {};
  for (const u of users) {
    if (!byDept[u.department]) byDept[u.department] = [];
    byDept[u.department].push(u);
  }

  // Subtask templates by type — only Marketing-heavy types
  const tmplByType = {};
  for (const st of subtaskTemplates) {
    if (!tmplByType[st.ticket_type_id]) tmplByType[st.ticket_type_id] = [];
    tmplByType[st.ticket_type_id].push(st);
  }

  // Find ticket types that have Marketing tasks
  const marketingTypes = ticketTypes.filter(tt => {
    const tmpls = tmplByType[tt.id] || [];
    return tmpls.some(t => t.department === 'Marketing') && tmpls.length > 0;
  });
  console.log(`  Marketing-heavy ticket types: ${marketingTypes.map(t => t.name).join(', ')}`);

  // ══════════════════════════════════════════════════════════════════════
  // PART 1: Redistribute Hossam's tasks to other IT members
  // ══════════════════════════════════════════════════════════════════════

  if (hossam) {
    console.log('\n🔧 Redistributing Hossam\'s excess tasks...');

    // Get Hossam's assignments for this week
    const { data: hossamAssigns } = await supabase
      .from('task_assignments')
      .select('task_id, scheduled_date, tasks!inner(status, estimated_minutes)')
      .eq('user_id', hossam.id)
      .neq('tasks.status', 'Done')
      .gte('scheduled_date', WEEK[0])
      .lte('scheduled_date', WEEK[4]);

    const hossamTasks = hossamAssigns || [];
    console.log(`  Hossam has ${hossamTasks.length} non-done tasks this week`);

    // Get other IT users' current load
    const otherIT = itUsers.filter(u => u.id !== hossam.id);
    const itLoad = {};
    for (const u of otherIT) {
      const { data } = await supabase
        .from('task_assignments')
        .select('scheduled_date, tasks!inner(estimated_minutes, status)')
        .eq('user_id', u.id)
        .neq('tasks.status', 'Done')
        .gte('scheduled_date', WEEK[0])
        .lte('scheduled_date', WEEK[4]);
      itLoad[u.id] = {};
      for (const d of WEEK) itLoad[u.id][d] = 0;
      for (const r of (data || [])) {
        itLoad[u.id][r.scheduled_date] = (itLoad[u.id][r.scheduled_date] || 0) + (r.tasks?.estimated_minutes || 0);
      }
      const total = Object.values(itLoad[u.id]).reduce((s, v) => s + v, 0);
      console.log(`  ${u.name}: ${total}min this week`);
    }

    // Hossam's load per day
    const hossamLoad = {};
    for (const d of WEEK) hossamLoad[d] = 0;
    for (const r of hossamTasks) {
      hossamLoad[r.scheduled_date] = (hossamLoad[r.scheduled_date] || 0) + (r.tasks?.estimated_minutes || 0);
    }
    console.log(`  Hossam load: ${WEEK.map(d => `${d.slice(8)}=${hossamLoad[d]}m`).join(', ')}`);

    // Target: max ~120 min/day for Hossam. Move excess to least-loaded IT peer
    const TARGET_MAX = 120;
    let moved = 0;

    // Sort tasks by day, then move from heaviest days first
    const sortedTasks = [...hossamTasks].sort((a, b) =>
      hossamLoad[b.scheduled_date] - hossamLoad[a.scheduled_date]
    );

    for (const task of sortedTasks) {
      const day = task.scheduled_date;
      if (hossamLoad[day] <= TARGET_MAX) continue;

      // Find least-loaded IT peer for this day
      let bestUser = null, bestLoad = Infinity;
      for (const u of otherIT) {
        const l = itLoad[u.id][day] || 0;
        if (l < bestLoad) { bestLoad = l; bestUser = u; }
      }
      if (!bestUser || bestLoad >= 360) continue; // don't overload others (6h max)

      const mins = task.tasks?.estimated_minutes || 0;

      // Reassign: delete Hossam's, insert new user's
      const { error: delErr } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', task.task_id)
        .eq('user_id', hossam.id);

      if (!delErr) {
        const { error: insErr } = await supabase
          .from('task_assignments')
          .insert({ task_id: task.task_id, user_id: bestUser.id, role: 'primary', scheduled_date: day });

        if (!insErr) {
          hossamLoad[day] -= mins;
          itLoad[bestUser.id][day] = (itLoad[bestUser.id][day] || 0) + mins;
          moved++;
        }
      }
    }
    console.log(`  ✅ Moved ${moved} tasks from Hossam to other IT members`);
  }

  // ══════════════════════════════════════════════════════════════════════
  // PART 2: Add Marketing-heavy tickets to fill Rodrigo's week
  // ══════════════════════════════════════════════════════════════════════

  if (!rodrigo) { console.log('❌ Rodrigo not found'); return; }

  // Get Rodrigo's current load this week
  const { data: rodLoad } = await supabase
    .from('task_assignments')
    .select('scheduled_date, tasks!inner(estimated_minutes, status)')
    .eq('user_id', rodrigo.id)
    .neq('tasks.status', 'Done')
    .gte('scheduled_date', WEEK[0])
    .lte('scheduled_date', WEEK[4]);

  const rodDayLoad = {};
  for (const d of WEEK) rodDayLoad[d] = 0;
  for (const r of (rodLoad || [])) {
    rodDayLoad[r.scheduled_date] = (rodDayLoad[r.scheduled_date] || 0) + (r.tasks?.estimated_minutes || 0);
  }
  console.log(`\n📊 Rodrigo current load: ${WEEK.map(d => `${d.slice(8)}=${rodDayLoad[d]}m`).join(', ')}`);

  // Target ~350 min/day (≈5.8h — near full on 7h effective day)
  const TARGET = 350;
  const needed = {};
  let totalNeeded = 0;
  for (const d of WEEK) {
    needed[d] = Math.max(0, TARGET - rodDayLoad[d]);
    totalNeeded += needed[d];
  }
  console.log(`  Need to add: ${WEEK.map(d => `${d.slice(8)}=+${needed[d]}m`).join(', ')} (${totalNeeded}m total)`);

  // Generate tickets until we've filled the gap
  const allTickets = [];
  const allTasks = [];
  const allAssignments = [];
  const allActivity = [];
  let addedMins = 0;
  let ticketCount = 0;

  while (addedMins < totalNeeded && ticketCount < 80) {
    const ts = Date.now() + ticketCount;
    const ticketId = `tk-mkt-${ts}`;
    const spa = pick(spas);
    const tt = pick(marketingTypes);
    const treatment = pick(TREATMENTS);
    const creator = pick(users);
    const priority = pick(['High', 'Medium', 'Medium', 'Immediate']);

    const dueDay = pick(['2026-03-13', '2026-03-16', '2026-03-17', '2026-03-18', '2026-03-19', '2026-03-20']);
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
      status: pick(['Open', 'In Progress', 'In Progress']),
      created_by: creator.id,
      created_at: createdDate.toISOString(),
      additional_info: '',
      custom_field_values: {},
    };
    allTickets.push(ticket);

    const templates = tmplByType[tt.id] || [];
    for (let j = 0; j < templates.length; j++) {
      const tmpl = templates[j];
      const taskId = `${ticketId}-t${j}`;
      const isMarketing = tmpl.department === 'Marketing';

      // ~20% done for variety
      const taskStatus = Math.random() < 0.2 ? 'Done' : (Math.random() < 0.3 ? 'In Progress' : 'Not Started');

      // Marketing tasks → Rodrigo on least-needed day
      // Other dept tasks → random user from that dept
      let assignee;
      if (isMarketing) {
        // Assign to Rodrigo, pick the day that needs most minutes
        assignee = rodrigo;
      } else {
        const deptUsers = byDept[tmpl.department] || [];
        assignee = deptUsers.length > 0 ? pick(deptUsers) : pick(users);
      }

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

      // Schedule: Marketing goes to Rodrigo on least-loaded day
      let schedDay;
      if (isMarketing && taskStatus !== 'Done') {
        // Pick the day with most remaining need
        let bestDay = WEEK[0], bestNeed = -1;
        for (const d of WEEK) {
          const remaining = needed[d] - 0; // current remaining
          if (needed[d] > bestNeed) { bestNeed = needed[d]; bestDay = d; }
        }
        schedDay = bestDay;
        needed[bestDay] -= tmpl.estimated_minutes;
        addedMins += tmpl.estimated_minutes;
      } else {
        schedDay = pick(WEEK);
      }

      allAssignments.push({
        task_id: taskId,
        user_id: assignee.id,
        role: 'primary',
        scheduled_date: schedDay,
      });
    }

    allActivity.push({
      ticket_id: ticketId,
      user_id: creator.id,
      action: `created ticket: ${tt.name} for ${spa.name}`,
      created_at: createdDate.toISOString(),
    });

    ticketCount++;
  }

  console.log(`\n📦 Generated ${ticketCount} tickets, ${allTasks.length} tasks (${addedMins}m added for Rodrigo)`);

  // Insert
  console.log('\n💾 Inserting...');
  for (let i = 0; i < allTickets.length; i += 50) {
    const { error } = await supabase.from('tickets').insert(allTickets.slice(i, i + 50));
    if (error) { console.error(`❌ Tickets: ${error.message}`); return; }
  }
  console.log('  ✅ Tickets');

  for (let i = 0; i < allTasks.length; i += 100) {
    const { error } = await supabase.from('tasks').insert(allTasks.slice(i, i + 100));
    if (error) { console.error(`❌ Tasks: ${error.message}`); return; }
  }
  console.log('  ✅ Tasks');

  for (let i = 0; i < allAssignments.length; i += 100) {
    const { error } = await supabase.from('task_assignments').insert(allAssignments.slice(i, i + 100));
    if (error) { console.error(`❌ Assignments: ${error.message}`); return; }
  }
  console.log('  ✅ Assignments');

  for (let i = 0; i < allActivity.length; i += 100) {
    const { error } = await supabase.from('activity_log').insert(allActivity.slice(i, i + 100));
    if (error) { console.error(`❌ Activity: ${error.message}`); return; }
  }
  console.log('  ✅ Activity');

  // Final summary
  const { data: finalLoad } = await supabase
    .from('task_assignments')
    .select('scheduled_date, tasks!inner(estimated_minutes, status)')
    .eq('user_id', rodrigo.id)
    .neq('tasks.status', 'Done')
    .gte('scheduled_date', WEEK[0])
    .lte('scheduled_date', WEEK[4]);

  const finalDayLoad = {};
  for (const d of WEEK) finalDayLoad[d] = 0;
  for (const r of (finalLoad || [])) {
    finalDayLoad[r.scheduled_date] = (finalDayLoad[r.scheduled_date] || 0) + (r.tasks?.estimated_minutes || 0);
  }
  const totalFinal = Object.values(finalDayLoad).reduce((s, v) => s + v, 0);
  console.log(`\n📊 Rodrigo FINAL load: ${WEEK.map(d => {
    const m = finalDayLoad[d];
    const h = Math.floor(m/60);
    const mm = m%60;
    return `${d.slice(8)}=${h}h${mm>0?mm+'m':''}`;
  }).join(', ')} → ${Math.floor(totalFinal/60)}h${totalFinal%60}m total`);

  console.log('\n🎉 Done! Rodrigo packed, Hossam balanced. Refresh the app!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
