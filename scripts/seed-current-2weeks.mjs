/**
 * Fill every user's schedule for the CURRENT 2 weeks:
 * Mar 30 – Apr 3 and Apr 6 – Apr 10, 2026.
 *
 * Usage:  node scripts/seed-current-2weeks.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwvkncrrisnhdxshhutd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_pNHE7IFIHwCrFMDX4YkX9A_gqLWl3y3';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const DAYS = [
  '2026-03-30','2026-03-31','2026-04-01','2026-04-02','2026-04-03',
  '2026-04-06','2026-04-07','2026-04-08','2026-04-09','2026-04-10',
];

const TARGET_MINS = 420;

const TREATMENTS = [
  'LED Facial','Hydrafacial','Microneedling','Chemical Peel','Botox Package',
  'Lip Filler Special','CoolSculpting','Laser Hair Removal','PRP Therapy',
  'Skin Tightening','Anti-Aging Package','Acne Treatment','Deep Cleanse Facial',
  'Collagen Boost','Vitamin C Infusion','Dermaplaning','Oxygen Facial',
  "Men's Facial",'Express Glow','Body Contouring','Scar Revision','Rosacea Treatment',
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

  // Track gaps
  const gaps = {};
  for (const u of users) {
    gaps[u.id] = {};
    for (const d of DAYS) gaps[u.id][d] = TARGET_MINS;
  }

  const allTickets = [];
  const allTasks = [];
  const allAssignments = [];
  const allActivity = [];
  let ticketIdx = 0;
  let totalFilled = 0;
  const totalGap = users.length * DAYS.length * TARGET_MINS;
  const targetFill = totalGap * 0.92;

  console.log(`\n🚀 Filling ${Math.round(totalGap/60)}h across ${users.length} users x ${DAYS.length} days...`);

  while (totalFilled < targetFill && ticketIdx < 600) {
    const ts = Date.now() + ticketIdx;
    const ticketId = `tk-now-${ts}`;
    const spa = pick(spas);
    const tt = pick(usableTypes);
    const treatment = pick(TREATMENTS);
    const creator = pick(users);
    const priority = pick(['High','Medium','Medium','Immediate','Medium']);

    const dueDay = pick(DAYS.slice(2));
    const createdDate = new Date('2026-03-28T10:00:00Z');
    createdDate.setDate(createdDate.getDate() - rand(0, 5));

    allTickets.push({
      id: ticketId,
      ticket_type_id: tt.id,
      ticket_type: tt.name,
      spa_id: spa.id,
      treatment_name: treatment,
      promo_price: [79,99,129,149,179,199][rand(0,5)],
      value_price: [159,199,259,299,359,399][rand(0,5)],
      priority,
      target_audience: pick(AUDIENCES),
      due_date: dueDay,
      start_ads_date: dueDay,
      status: pick(['Open','In Progress','In Progress']),
      created_by: creator.id,
      created_at: createdDate.toISOString(),
      additional_info: '',
      custom_field_values: {},
    });

    const templates = tmplByType[tt.id] || [];
    for (let j = 0; j < templates.length; j++) {
      const tmpl = templates[j];
      const taskId = `${ticketId}-t${j}`;
      const deptUsers = byDept[tmpl.department] || [];
      if (deptUsers.length === 0) continue;

      // Find user+day with largest gap in this dept
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
        bestUser = pick(deptUsers);
        bestDay = pick(DAYS);
      }

      const taskStatus = Math.random() < 0.12 ? 'Done'
        : Math.random() < 0.25 ? 'In Progress' : 'Not Started';

      allTasks.push({
        id: taskId,
        ticket_id: ticketId,
        department: tmpl.department,
        task_name: tmpl.name,
        estimated_minutes: tmpl.estimated_minutes,
        status: taskStatus,
        completed_by: taskStatus === 'Done' ? bestUser.id : null,
        completed_at: taskStatus === 'Done' ? '2026-03-30T14:00:00Z' : null,
      });

      allAssignments.push({
        task_id: taskId,
        user_id: bestUser.id,
        role: 'primary',
        scheduled_date: bestDay,
      });

      if (taskStatus !== 'Done') {
        const mins = tmpl.estimated_minutes;
        const filled = Math.min(mins, Math.max(0, bestGap));
        gaps[bestUser.id][bestDay] = Math.max(0, gaps[bestUser.id][bestDay] - mins);
        totalFilled += filled;
      }
    }

    allActivity.push({
      ticket_id: ticketId,
      user_id: creator.id,
      action: `created ticket: ${tt.name} for ${spa.name}`,
      created_at: createdDate.toISOString(),
    });

    ticketIdx++;
    if (ticketIdx % 100 === 0) console.log(`  ${ticketIdx} tickets (${Math.round(totalFilled/60)}h / ${Math.round(targetFill/60)}h)...`);
  }

  console.log(`\n📦 ${ticketIdx} tickets, ${allTasks.length} tasks, ${allAssignments.length} assignments`);

  // Insert
  console.log('\n💾 Inserting...');
  for (let i = 0; i < allTickets.length; i += 50) {
    const { error } = await supabase.from('tickets').insert(allTickets.slice(i, i + 50));
    if (error) { console.error(`❌ Tickets ${i}: ${error.message}`); return; }
  }
  console.log(`  ✅ ${allTickets.length} Tickets`);

  for (let i = 0; i < allTasks.length; i += 100) {
    const { error } = await supabase.from('tasks').insert(allTasks.slice(i, i + 100));
    if (error) { console.error(`❌ Tasks ${i}: ${error.message}`); return; }
  }
  console.log(`  ✅ ${allTasks.length} Tasks`);

  for (let i = 0; i < allAssignments.length; i += 100) {
    const { error } = await supabase.from('task_assignments').insert(allAssignments.slice(i, i + 100));
    if (error) { console.error(`❌ Assign ${i}: ${error.message}`); return; }
  }
  console.log(`  ✅ ${allAssignments.length} Assignments`);

  for (let i = 0; i < allActivity.length; i += 100) {
    const { error } = await supabase.from('activity_log').insert(allActivity.slice(i, i + 100));
    if (error) { console.error(`❌ Activity ${i}: ${error.message}`); return; }
  }
  console.log(`  ✅ ${allActivity.length} Activity`);

  // Final report
  console.log('\n📊 Final workload (current 2 weeks):');
  for (const u of users) {
    const { data } = await supabase
      .from('task_assignments')
      .select('scheduled_date, tasks!inner(estimated_minutes, status)')
      .eq('user_id', u.id)
      .neq('tasks.status', 'Done')
      .gte('scheduled_date', DAYS[0])
      .lte('scheduled_date', DAYS[9]);

    const dm = {};
    for (const d of DAYS) dm[d] = 0;
    for (const r of (data || [])) dm[r.scheduled_date] = (dm[r.scheduled_date] || 0) + (r.tasks?.estimated_minutes || 0);

    const fmt = d => { const h = Math.floor(dm[d]/60); const m = dm[d]%60; return `${h}h${m>0?m+'m':''}`.padStart(5); };
    const total = Object.values(dm).reduce((s,v) => s+v, 0);
    console.log(`  ${u.name.padEnd(20)} W1: ${DAYS.slice(0,5).map(fmt).join(' ')}  |  W2: ${DAYS.slice(5).map(fmt).join(' ')}  → ${Math.round(total/60)}h`);
  }

  console.log('\n🎉 Done! Refresh the app — everyone is packed for Mar 30 – Apr 10!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
