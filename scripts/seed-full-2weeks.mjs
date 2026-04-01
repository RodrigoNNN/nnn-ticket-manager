/**
 * Fill every user's schedule to near-full capacity (~420 min/day = 7h)
 * for 2 weeks: Mar 9–13 and Mar 16–20, 2026.
 *
 * Usage:  node scripts/seed-full-2weeks.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwvkncrrisnhdxshhutd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_pNHE7IFIHwCrFMDX4YkX9A_gqLWl3y3';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// 2 weeks Mon–Fri
const DAYS = [
  '2026-03-09','2026-03-10','2026-03-11','2026-03-12','2026-03-13',
  '2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-20',
];

const TARGET_MINS = 420; // 7h effective day

const TREATMENTS = [
  'LED Facial','Hydrafacial','Microneedling','Chemical Peel','Botox Package',
  'Lip Filler Special','CoolSculpting','Laser Hair Removal','PRP Therapy',
  'Skin Tightening','Anti-Aging Package','Acne Treatment','Deep Cleanse Facial',
  'Collagen Boost','Vitamin C Infusion','Dermaplaning','Oxygen Facial',
  "Men's Facial",'Express Glow','Body Contouring','Scar Revision','Rosacea Treatment',
  'Detox Wrap','Pigmentation Correction','Teen Acne Facial',
];
const AUDIENCES = ['Women','Men','Both','Women 25-45','Men 30-55','Women 40+'];

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

  const byDept = {};
  for (const u of users) {
    if (!byDept[u.department]) byDept[u.department] = [];
    byDept[u.department].push(u);
  }

  const tmplByType = {};
  for (const st of subtaskTemplates) {
    if (!tmplByType[st.ticket_type_id]) tmplByType[st.ticket_type_id] = [];
    tmplByType[st.ticket_type_id].push(st);
  }
  const usableTypes = ticketTypes.filter(tt => tmplByType[tt.id]?.length > 0);

  console.log(`  ${users.length} users, ${spas.length} spas, ${usableTypes.length} ticket types`);

  // ── Get current workload for every user across 2 weeks ────────────────
  console.log('\n📊 Checking current workload...');

  const userLoad = {}; // userId → { date → minutes }
  for (const u of users) {
    const { data } = await supabase
      .from('task_assignments')
      .select('scheduled_date, tasks!inner(estimated_minutes, status)')
      .eq('user_id', u.id)
      .neq('tasks.status', 'Done')
      .gte('scheduled_date', DAYS[0])
      .lte('scheduled_date', DAYS[DAYS.length - 1]);

    userLoad[u.id] = {};
    for (const d of DAYS) userLoad[u.id][d] = 0;
    for (const r of (data || [])) {
      userLoad[u.id][r.scheduled_date] = (userLoad[u.id][r.scheduled_date] || 0)
        + (r.tasks?.estimated_minutes || 0);
    }
  }

  // Calculate gaps
  const gaps = {}; // userId → { date → minutes needed }
  let totalGap = 0;
  for (const u of users) {
    gaps[u.id] = {};
    for (const d of DAYS) {
      const gap = Math.max(0, TARGET_MINS - userLoad[u.id][d]);
      gaps[u.id][d] = gap;
      totalGap += gap;
    }
  }

  console.log('\n  Current load vs target (420min/day):');
  for (const u of users) {
    const dayStrs = DAYS.map(d => {
      const cur = userLoad[u.id][d];
      const gap = gaps[u.id][d];
      const pct = Math.round((cur / TARGET_MINS) * 100);
      return `${pct}%`;
    });
    const totalCur = DAYS.reduce((s, d) => s + userLoad[u.id][d], 0);
    const totalGapU = DAYS.reduce((s, d) => s + gaps[u.id][d], 0);
    console.log(`  ${u.name.padEnd(20)} ${dayStrs.join(' | ')}  gap: ${Math.round(totalGapU/60)}h`);
  }
  console.log(`\n  Total gap to fill: ${Math.round(totalGap/60)}h (${totalGap}min)`);

  // ── Generate tickets to fill the gaps ─────────────────────────────────
  // Strategy: create tickets and for each task, assign it to the user+day
  // with the largest remaining gap in the matching department.

  const allTickets = [];
  const allTasks = [];
  const allAssignments = [];
  const allActivity = [];
  let ticketIdx = 0;
  let filledMins = 0;

  // Keep generating until we've filled 95%+ of the gap
  const targetFill = totalGap * 0.95;

  console.log(`\n🚀 Generating tickets to fill ${Math.round(targetFill/60)}h...`);

  while (filledMins < targetFill && ticketIdx < 500) {
    const ts = Date.now() + ticketIdx;
    const ticketId = `tk-fill-${ts}`;
    const spa = pick(spas);
    const tt = pick(usableTypes);
    const treatment = pick(TREATMENTS);
    const creator = pick(users);
    const priority = pick(['High', 'Medium', 'Medium', 'Immediate', 'Medium']);

    // Due dates spread across both weeks
    const dueDay = pick(DAYS.slice(3)); // due mid-week or later
    const createdDate = new Date('2026-03-08T10:00:00Z');
    createdDate.setDate(createdDate.getDate() - rand(1, 7));

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

      // Find the user+day with the largest gap in this department
      const deptUsers = byDept[tmpl.department] || [];
      if (deptUsers.length === 0) continue;

      let bestUser = null, bestDay = null, bestGap = -1;
      for (const u of deptUsers) {
        for (const d of DAYS) {
          if (gaps[u.id][d] > bestGap) {
            bestGap = gaps[u.id][d];
            bestUser = u;
            bestDay = d;
          }
        }
      }

      if (!bestUser || bestGap <= 0) {
        // Department is full, just pick random
        bestUser = pick(deptUsers);
        bestDay = pick(DAYS);
      }

      // ~15% done for variety
      const taskStatus = Math.random() < 0.15 ? 'Done'
        : Math.random() < 0.3 ? 'In Progress' : 'Not Started';

      const task = {
        id: taskId,
        ticket_id: ticketId,
        department: tmpl.department,
        task_name: tmpl.name,
        estimated_minutes: tmpl.estimated_minutes,
        status: taskStatus,
        completed_by: taskStatus === 'Done' ? bestUser.id : null,
        completed_at: taskStatus === 'Done' ? new Date('2026-03-10T14:00:00Z').toISOString() : null,
      };
      allTasks.push(task);

      allAssignments.push({
        task_id: taskId,
        user_id: bestUser.id,
        role: 'primary',
        scheduled_date: bestDay,
      });

      // Update gap tracking
      if (taskStatus !== 'Done') {
        const mins = tmpl.estimated_minutes;
        gaps[bestUser.id][bestDay] = Math.max(0, gaps[bestUser.id][bestDay] - mins);
        filledMins += Math.min(mins, bestGap > 0 ? bestGap : 0);
      }
    }

    allActivity.push({
      ticket_id: ticketId,
      user_id: creator.id,
      action: `created ticket: ${tt.name} for ${spa.name}`,
      created_at: createdDate.toISOString(),
    });

    ticketIdx++;
    if (ticketIdx % 50 === 0) console.log(`  Generated ${ticketIdx} tickets (${Math.round(filledMins/60)}h filled)...`);
  }

  console.log(`\n📦 Generated ${ticketIdx} tickets, ${allTasks.length} tasks, ${allAssignments.length} assignments`);

  // ── Insert in batches ──────────────────────────────────────────────────
  console.log('\n💾 Inserting...');

  for (let i = 0; i < allTickets.length; i += 50) {
    const { error } = await supabase.from('tickets').insert(allTickets.slice(i, i + 50));
    if (error) { console.error(`❌ Tickets batch ${i}: ${error.message}`); return; }
  }
  console.log(`  ✅ ${allTickets.length} Tickets`);

  for (let i = 0; i < allTasks.length; i += 100) {
    const { error } = await supabase.from('tasks').insert(allTasks.slice(i, i + 100));
    if (error) { console.error(`❌ Tasks batch ${i}: ${error.message}`); return; }
  }
  console.log(`  ✅ ${allTasks.length} Tasks`);

  for (let i = 0; i < allAssignments.length; i += 100) {
    const { error } = await supabase.from('task_assignments').insert(allAssignments.slice(i, i + 100));
    if (error) { console.error(`❌ Assignments batch ${i}: ${error.message}`); return; }
  }
  console.log(`  ✅ ${allAssignments.length} Assignments`);

  for (let i = 0; i < allActivity.length; i += 100) {
    const { error } = await supabase.from('activity_log').insert(allActivity.slice(i, i + 100));
    if (error) { console.error(`❌ Activity batch ${i}: ${error.message}`); return; }
  }
  console.log(`  ✅ ${allActivity.length} Activity entries`);

  // ── Final summary ──────────────────────────────────────────────────────
  console.log('\n📊 Final workload per user (2 weeks):');
  for (const u of users) {
    const { data } = await supabase
      .from('task_assignments')
      .select('scheduled_date, tasks!inner(estimated_minutes, status)')
      .eq('user_id', u.id)
      .neq('tasks.status', 'Done')
      .gte('scheduled_date', DAYS[0])
      .lte('scheduled_date', DAYS[DAYS.length - 1]);

    const dayMins = {};
    for (const d of DAYS) dayMins[d] = 0;
    for (const r of (data || [])) {
      dayMins[r.scheduled_date] = (dayMins[r.scheduled_date] || 0)
        + (r.tasks?.estimated_minutes || 0);
    }

    const w1 = DAYS.slice(0, 5).map(d => {
      const h = Math.floor(dayMins[d]/60);
      const m = dayMins[d]%60;
      return `${h}h${m > 0 ? m+'m' : ''}`.padStart(5);
    });
    const w2 = DAYS.slice(5).map(d => {
      const h = Math.floor(dayMins[d]/60);
      const m = dayMins[d]%60;
      return `${h}h${m > 0 ? m+'m' : ''}`.padStart(5);
    });
    const total = Object.values(dayMins).reduce((s, v) => s + v, 0);
    console.log(`  ${u.name.padEnd(20)} W1: ${w1.join(' ')}  |  W2: ${w2.join(' ')}  → ${Math.round(total/60)}h`);
  }

  console.log('\n🎉 Done! All members should have full 2-week schedules. Refresh the app!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
