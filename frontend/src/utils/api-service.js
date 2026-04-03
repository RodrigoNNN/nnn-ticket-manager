/**
 * API Service — All Supabase operations for the NNN Ticket Manager.
 * Each function is async and returns data or throws on error.
 */
import { supabase } from './supabase';

const EFFECTIVE_MINUTES_PER_DAY = 420;
const DEPARTMENTS = ['Management', 'Marketing', 'IT', 'Accounting'];

/** Batched .in() — chunks large ID arrays to avoid Supabase URL length limits */
async function batchIn(table, column, ids, selectStr = '*', extraFn) {
  if (ids.length === 0) return [];
  const CHUNK = 80;
  const promises = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    let q = supabase.from(table).select(selectStr).in(column, chunk);
    if (extraFn) q = extraFn(q);
    promises.push(q);
  }
  const results = await Promise.all(promises);
  return results.flatMap(r => r.data || []);
}

// ─── Auth ───

export async function loginUser(email, password) {
  const { data, error } = await supabase.rpc('authenticate', {
    p_email: email,
    p_password: password,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

// ─── Users ───

export async function fetchUsers(filters = {}) {
  let query = supabase.from('users').select('id, name, email, department, role, is_active, whatsapp_number');
  if (filters.department) query = query.eq('department', filters.department);
  if (filters.active) query = query.eq('is_active', true);
  query = query.order('department').order('name');
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, department, role, is_active, whatsapp_number')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateUser(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select('id, name, email, department, role, is_active, whatsapp_number')
    .single();
  if (error) throw error;
  return data;
}

export async function createUser(userData) {
  const id = `u-${Date.now()}`;
  const { data, error } = await supabase.rpc('create_user', {
    p_id: id,
    p_name: userData.name,
    p_email: userData.email,
    p_password: userData.password || 'Welcome1!',
    p_department: userData.department,
    p_role: userData.role || 'member',
    p_whatsapp_number: userData.whatsapp_number || '',
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function changePassword(userId, currentPassword, newPassword) {
  const { data, error } = await supabase.rpc('change_password', {
    p_user_id: userId,
    p_current_password: currentPassword,
    p_new_password: newPassword,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function adminResetPassword(adminId, targetUserId, newPassword) {
  const { data, error } = await supabase.rpc('admin_reset_password', {
    p_admin_id: adminId,
    p_target_user_id: targetUserId,
    p_new_password: newPassword,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ─── Workload (computed client-side from tasks + assignments) ───

export async function fetchEmployeeWorkload(userId, date) {
  let query = supabase
    .from('task_assignments')
    .select('task_id, scheduled_date, tasks!inner(estimated_minutes, status)')
    .eq('user_id', userId)
    .neq('tasks.status', 'Done');
  if (date) query = query.eq('scheduled_date', date);
  const { data, error } = await query;
  if (error) throw error;
  const total = (data || []).reduce((sum, r) => sum + (r.tasks?.estimated_minutes || 0), 0);
  return total;
}

/** Fetch workload for each day in a date range (Mon-Fri week view) */
export async function fetchWeeklyWorkload(userId, startDate, endDate) {
  // Fetch scheduled tasks in date range + unscheduled tasks in one query
  const [scheduledRes, unscheduledRes] = await Promise.all([
    supabase
      .from('task_assignments')
      .select('task_id, scheduled_date, tasks!inner(estimated_minutes, status)')
      .eq('user_id', userId)
      .neq('tasks.status', 'Done')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate),
    supabase
      .from('task_assignments')
      .select('task_id, tasks!inner(estimated_minutes, status)')
      .eq('user_id', userId)
      .neq('tasks.status', 'Done')
      .is('scheduled_date', null),
  ]);
  if (scheduledRes.error) throw scheduledRes.error;

  const result = {};
  for (const row of (scheduledRes.data || [])) {
    const d = row.scheduled_date;
    if (!result[d]) result[d] = 0;
    result[d] += row.tasks?.estimated_minutes || 0;
  }

  // Sum unscheduled task minutes
  let unscheduled = 0;
  for (const row of (unscheduledRes.data || [])) {
    unscheduled += row.tasks?.estimated_minutes || 0;
  }
  if (unscheduled > 0) result._unscheduled = unscheduled;

  return result;
}

/** Reschedule a task assignment to a different day */
export async function rescheduleTask(taskId, userId, newDate) {
  const { error } = await supabase
    .from('task_assignments')
    .update({ scheduled_date: newDate })
    .eq('task_id', taskId)
    .eq('user_id', userId);
  if (error) throw error;
}

/** Get the next N business days from a given date */
function getNextBusinessDays(fromDate, count) {
  const days = [];
  const d = new Date(fromDate);
  while (days.length < count) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(d.toISOString().slice(0, 10));
    }
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/** Pick the least-loaded business day for a user from the next 5 business days */
async function pickLeastLoadedDay(userId, taskMinutes) {
  const today = new Date().toISOString().slice(0, 10);
  const days = getNextBusinessDays(today, 5);
  const weekData = await fetchWeeklyWorkload(userId, days[0], days[days.length - 1]);

  let bestDay = days[0];
  let bestRemaining = -Infinity;
  for (const day of days) {
    const used = weekData[day] || 0;
    const remaining = EFFECTIVE_MINUTES_PER_DAY - used;
    if (remaining > bestRemaining) {
      bestRemaining = remaining;
      bestDay = day;
    }
  }
  return bestDay;
}

export async function fetchEmployeesWorkload(department) {
  // Get users in department
  const { data: users, error: ue } = await supabase
    .from('users')
    .select('*')
    .eq('department', department)
    .eq('is_active', true);
  if (ue) throw ue;

  // Get all non-done task assignments for users in this dept
  const userIds = users.map(u => u.id);
  const { data: assignments, error: ae } = await supabase
    .from('task_assignments')
    .select('user_id, task_id, tasks!inner(id, estimated_minutes, status, task_name, ticket_id, department, tickets!inner(ticket_type, spa_id, spas(name)))')
    .in('user_id', userIds)
    .neq('tasks.status', 'Done');
  if (ae) throw ae;

  const result = {};
  for (const user of users) {
    const userAssigns = (assignments || []).filter(a => a.user_id === user.id);
    const totalMinutes = userAssigns.reduce((sum, a) => sum + (a.tasks?.estimated_minutes || 0), 0);
    const tasks = userAssigns.map(a => ({
      ...a.tasks,
      ticket_type: a.tasks?.tickets?.ticket_type,
      spa_name: a.tasks?.tickets?.spas?.name,
    }));
    result[user.id] = { user, totalMinutes, tasks };
  }
  return result;
}

// ─── Spas ───

export async function fetchSpas() {
  const { data: spas, error } = await supabase.from('spas').select('*').order('name');
  if (error) throw error;

  // Get all promos and team members in batch
  const spaIds = spas.map(s => s.id);
  const [promosRes, teamRes] = await Promise.all([
    supabase.from('spa_promos').select('*').in('spa_id', spaIds),
    supabase.from('spa_team_members').select('*').in('spa_id', spaIds),
  ]);

  return spas.map(spa => {
    const promos = (promosRes.data || []).filter(p => p.spa_id === spa.id);
    const teamRows = (teamRes.data || []).filter(t => t.spa_id === spa.id);
    const assigned_team = { Management: [], Marketing: [], IT: [], Accounting: [] };
    for (const row of teamRows) {
      if (assigned_team[row.department]) assigned_team[row.department].push(row.user_id);
    }
    return { ...spa, promos, assigned_team };
  });
}

export async function fetchSpaById(id) {
  const { data: spa, error } = await supabase.from('spas').select('*').eq('id', id).single();
  if (error) throw error;

  const [promosRes, teamRes] = await Promise.all([
    supabase.from('spa_promos').select('*').eq('spa_id', id),
    supabase.from('spa_team_members').select('*').eq('spa_id', id),
  ]);

  const assigned_team = { Management: [], Marketing: [], IT: [], Accounting: [] };
  for (const row of (teamRes.data || [])) {
    if (assigned_team[row.department]) assigned_team[row.department].push(row.user_id);
  }

  return { ...spa, promos: promosRes.data || [], assigned_team };
}

export async function createSpa(data) {
  const id = `s-${Date.now()}`;
  const { error } = await supabase.from('spas').insert({
    id, name: data.name || 'New Spa', location: data.location || '',
    country: data.country || 'USA', status: 'active', tier: data.tier || null,
    monthly_budget: data.monthly_budget || null, arrival_goal: data.arrival_goal || null,
    onboarding_data: data.onboarding_data || {}, extra_fields: data.extra_fields || [],
    onboarded_at: new Date().toISOString(), onboarded_via: data.onboarded_via || 'manual',
  });
  if (error) throw error;

  // Insert promos
  if (data.promos?.length) {
    await supabase.from('spa_promos').insert(data.promos.map(p => ({
      id: p.id || `p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      spa_id: id, name: p.name, price: p.price, value_price: p.value_price, active: p.active !== false,
    })));
  }

  // Insert team
  if (data.assigned_team) {
    const rows = [];
    for (const [dept, userIds] of Object.entries(data.assigned_team)) {
      for (const userId of userIds) rows.push({ spa_id: id, department: dept, user_id: userId });
    }
    if (rows.length) await supabase.from('spa_team_members').insert(rows);
  }

  return fetchSpaById(id);
}

export async function updateSpa(id, data) {
  const fields = {};
  for (const key of ['name', 'location', 'country', 'status', 'tier', 'monthly_budget', 'arrival_goal', 'arrival_goal_min', 'arrival_goal_target', 'payment_type', 'payment_schedule', 'ads_manager_url', 'onboarding_data', 'extra_fields', 'onboarded_via']) {
    if (data[key] !== undefined) fields[key] = data[key];
  }
  if (Object.keys(fields).length) {
    const { error } = await supabase.from('spas').update(fields).eq('id', id);
    if (error) throw error;
  }
  return fetchSpaById(id);
}

export async function updateSpaTeam(spaId, team) {
  // Replace entire team
  await supabase.from('spa_team_members').delete().eq('spa_id', spaId);
  const rows = [];
  for (const [dept, userIds] of Object.entries(team)) {
    for (const userId of userIds) rows.push({ spa_id: spaId, department: dept, user_id: userId });
  }
  if (rows.length) {
    const { error } = await supabase.from('spa_team_members').insert(rows);
    if (error) throw error;
  }
}

export async function addSpaPromo(spaId, promo) {
  const id = promo.id || `p-${Date.now()}`;
  const { data, error } = await supabase.from('spa_promos').insert({
    id, spa_id: spaId, name: promo.name, price: promo.price,
    value_price: promo.value_price, active: promo.active !== false,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateSpaPromo(promoId, data) {
  const { error } = await supabase.from('spa_promos').update(data).eq('id', promoId);
  if (error) throw error;
}

export async function deleteSpaPromo(promoId) {
  const { error } = await supabase.from('spa_promos').delete().eq('id', promoId);
  if (error) throw error;
}

export async function fetchSpaPromos(spaId) {
  const { data, error } = await supabase
    .from('spa_promos')
    .select('*')
    .eq('spa_id', spaId)
    .order('name');
  if (error) throw error;
  return data || [];
}

// ─── Spa Daily Arrivals ───

export async function fetchSpaArrivals(spaId, startDate, endDate) {
  let query = supabase
    .from('spa_daily_arrivals')
    .select('*')
    .eq('spa_id', spaId)
    .order('date', { ascending: true });
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchAllSpasMonthlyArrivals(month) {
  // month format: 'YYYY-MM' — fetches all arrivals for the month
  const startDate = `${month}-01`;
  const endDate = `${month}-31`; // safe — Supabase handles overflow
  const { data, error } = await supabase
    .from('spa_daily_arrivals')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertSpaArrival(spaId, date, arrivals, notes = '', recordedBy = null) {
  const id = `arr-${spaId}-${date}`;
  const { data, error } = await supabase
    .from('spa_daily_arrivals')
    .upsert({
      id,
      spa_id: spaId,
      date,
      arrivals,
      notes,
      recorded_by: recordedBy,
    }, { onConflict: 'spa_id,date' });
  if (error) throw error;
  return data;
}

// ─── Budget Allocations ───

export async function fetchBudgetAllocations(spaId, month) {
  const { data, error } = await supabase
    .from('spa_budget_allocations')
    .select('*')
    .eq('spa_id', spaId)
    .eq('month', month)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function saveBudgetAllocations(spaId, month, rows, userId) {
  // Delete existing rows for this spa+month, then insert fresh
  const { error: delError } = await supabase
    .from('spa_budget_allocations')
    .delete()
    .eq('spa_id', spaId)
    .eq('month', month);
  if (delError) throw delError;

  if (rows.length === 0) return [];

  const inserts = rows.map((row, i) => ({
    id: `ba-${Date.now()}-${i}`,
    spa_id: spaId,
    month,
    label: row.label || '',
    amount: parseFloat(String(row.amount).replace(/[^0-9.\-]/g, '')) || 0,
    sort_order: i,
    created_by: userId,
  }));

  const { data, error } = await supabase
    .from('spa_budget_allocations')
    .insert(inserts)
    .select();
  if (error) throw error;
  return data || [];
}

// ─── Budget Reports (3-stage) ───

export async function fetchBudgetReports(spaId, month) {
  const { data, error } = await supabase
    .from('spa_budget_reports')
    .select('*')
    .eq('spa_id', spaId)
    .eq('month', month)
    .order('stage');
  if (error) throw error;
  return data || [];
}

export async function fetchAllBudgetReports(month) {
  const { data, error } = await supabase
    .from('spa_budget_reports')
    .select('*')
    .eq('month', month)
    .order('spa_id')
    .order('stage');
  if (error) throw error;
  return data || [];
}

export async function fetchBudgetReportsUpToMonth(month) {
  const { data, error } = await supabase
    .from('spa_budget_reports')
    .select('*')
    .lte('month', month)
    .order('spa_id')
    .order('month')
    .order('stage');
  if (error) throw error;
  return data || [];
}

export async function upsertBudgetReport(spaId, month, stage, actualSpend, notes, userId) {
  const amount = parseFloat(String(actualSpend).replace(/[^0-9.\-]/g, '')) || 0;
  if (amount <= 0) throw new Error('Amount must be greater than 0');
  const { data, error } = await supabase
    .from('spa_budget_reports')
    .upsert({
      id: `br-${spaId}-${month}-${stage}`,
      spa_id: spaId,
      month,
      stage,
      actual_spend: amount,
      notes: notes || '',
      reported_by: userId,
      reported_at: new Date().toISOString(),
    }, { onConflict: 'spa_id,month,stage' })
    .select();
  if (error) throw error;
  return data?.[0];
}

// ─── Budget Notes ───

export async function fetchBudgetNotes(spaId, month) {
  const { data, error } = await supabase
    .from('spa_budget_notes')
    .select('instructions')
    .eq('spa_id', spaId)
    .eq('month', month)
    .maybeSingle();
  if (error) throw error;
  return data?.instructions || '';
}

export async function saveBudgetNotes(spaId, month, instructions, userId) {
  const { error } = await supabase
    .from('spa_budget_notes')
    .upsert({
      spa_id: spaId,
      month,
      instructions,
      updated_by: userId,
    }, { onConflict: 'spa_id,month' });
  if (error) throw error;
}

// ─── Payment Tracking ───

export async function fetchAllPaymentTracking(month) {
  const { data, error } = await supabase
    .from('spa_payment_tracking')
    .select('*')
    .eq('month', month)
    .order('spa_id');
  if (error) throw error;
  return data || [];
}

export async function upsertPaymentTracking(spaId, month, fields, userId, period = 1) {
  const { data, error } = await supabase
    .from('spa_payment_tracking')
    .upsert({
      id: `pt-${spaId}-${month}-${period}`,
      spa_id: spaId,
      month,
      period,
      ...fields,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'spa_id,month,period' })
    .select();
  if (error) throw error;
  return data?.[0];
}

export async function fetchPaymentNotes(spaId, month) {
  const { data, error } = await supabase
    .from('spa_payment_notes')
    .select('*')
    .eq('spa_id', spaId)
    .eq('month', month)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addPaymentNote(spaId, month, note, userId) {
  const { data, error } = await supabase
    .from('spa_payment_notes')
    .insert({
      spa_id: spaId,
      month,
      note,
      created_by: userId,
    })
    .select();
  if (error) throw error;
  return data?.[0];
}

// ─── Month Adjustments (budget +/-, credit holds) ───

export async function fetchMonthAdjustments(spaId, month) {
  const { data, error } = await supabase
    .from('spa_month_adjustments')
    .select('*')
    .eq('spa_id', spaId)
    .eq('month', month)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAllMonthAdjustments(month) {
  const { data, error } = await supabase
    .from('spa_month_adjustments')
    .select('*')
    .eq('month', month)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAppliedCreditsForMonth(month) {
  // Credits from OTHER months that were applied TO this month
  const { data, error } = await supabase
    .from('spa_month_adjustments')
    .select('*')
    .eq('type', 'credit_hold')
    .eq('status', 'applied')
    .eq('applied_to_month', month);
  if (error) throw error;
  return data || [];
}

export async function createMonthAdjustment(spaId, month, type, amount, note, userId) {
  const { data, error } = await supabase
    .from('spa_month_adjustments')
    .insert({
      spa_id: spaId,
      month,
      type,
      amount: Math.abs(amount),
      note: note || null,
      status: 'active',
      created_by: userId,
    })
    .select();
  if (error) throw error;
  return data?.[0];
}

export async function updateAdjustmentStatus(adjustmentId, status, appliedToMonth) {
  const fields = { status };
  if (appliedToMonth) fields.applied_to_month = appliedToMonth;
  const { data, error } = await supabase
    .from('spa_month_adjustments')
    .update(fields)
    .eq('id', adjustmentId)
    .select();
  if (error) throw error;
  return data?.[0];
}

export async function deleteMonthAdjustment(adjustmentId) {
  const { error } = await supabase
    .from('spa_month_adjustments')
    .delete()
    .eq('id', adjustmentId);
  if (error) throw error;
}

// ─── Promo Snapshots (for revert logic) ───

async function createPromoSnapshot(ticketId, promo) {
  const id = `ps-${Date.now()}`;
  const { error } = await supabase.from('promo_snapshots').insert({
    id, ticket_id: ticketId, promo_id: promo.id,
    snapshot_name: promo.name, snapshot_price: promo.price,
    snapshot_value_price: promo.value_price, snapshot_active: promo.active,
  });
  if (error) throw error;
  return id;
}

async function fetchPromoSnapshot(ticketId) {
  const { data, error } = await supabase
    .from('promo_snapshots')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function deletePromoSnapshot(ticketId) {
  const { error } = await supabase.from('promo_snapshots').delete().eq('ticket_id', ticketId);
  if (error) throw error;
}

// ─── Ticket Types ───

export async function fetchTicketTypes() {
  const { data: types, error } = await supabase.from('ticket_types').select('*').order('name');
  if (error) throw error;

  const { data: subtaskRows } = await supabase
    .from('ticket_type_subtasks').select('*').order('ticket_type_id').order('id');

  return types.map(tt => {
    const subtasks = {};
    for (const row of (subtaskRows || []).filter(r => r.ticket_type_id === tt.id)) {
      if (!subtasks[row.department]) subtasks[row.department] = [];
      subtasks[row.department].push({ name: row.name, estimated_minutes: row.estimated_minutes });
    }
    // custom_fields may be stored as a JSON string — parse it
    let custom_fields = tt.custom_fields;
    if (typeof custom_fields === 'string') {
      try { custom_fields = JSON.parse(custom_fields); } catch { custom_fields = []; }
    }
    return { ...tt, subtasks, custom_fields: custom_fields || [] };
  });
}

export async function createTicketType(data) {
  const id = `tt-${Date.now()}`;
  const { error } = await supabase.from('ticket_types').insert({
    id, name: data.name, color: data.color || '#6B7280',
    is_active: true, instructions: data.instructions || '',
    custom_fields: data.custom_fields || [],
  });
  if (error) throw error;

  if (data.subtasks) {
    const rows = [];
    for (const [dept, tasks] of Object.entries(data.subtasks)) {
      for (const task of tasks) {
        const t = typeof task === 'string' ? { name: task, estimated_minutes: 10 } : task;
        rows.push({ ticket_type_id: id, department: dept, name: t.name, estimated_minutes: t.estimated_minutes || 10 });
      }
    }
    if (rows.length) await supabase.from('ticket_type_subtasks').insert(rows);
  }
  return (await fetchTicketTypes()).find(t => t.id === id);
}

export async function updateTicketType(id, data) {
  const fields = {};
  for (const key of ['name', 'color', 'is_active', 'instructions', 'custom_fields']) {
    if (data[key] !== undefined) fields[key] = data[key];
  }
  if (Object.keys(fields).length) {
    await supabase.from('ticket_types').update(fields).eq('id', id);
  }
  if (data.subtasks !== undefined) {
    await supabase.from('ticket_type_subtasks').delete().eq('ticket_type_id', id);
    const rows = [];
    for (const [dept, tasks] of Object.entries(data.subtasks)) {
      for (const task of tasks) {
        const t = typeof task === 'string' ? { name: task, estimated_minutes: 10 } : task;
        rows.push({ ticket_type_id: id, department: dept, name: t.name, estimated_minutes: t.estimated_minutes || 10 });
      }
    }
    if (rows.length) await supabase.from('ticket_type_subtasks').insert(rows);
  }
  return (await fetchTicketTypes()).find(t => t.id === id);
}

// ─── Tickets ───

/** Enrich a list of tasks with assignment/completer data (shared helper) */
function enrichTasks(tasks, allAssignments, usersMap) {
  for (const task of tasks) {
    const taskAssigns = allAssignments.filter(a => a.task_id === task.id);
    task.assigned_to = taskAssigns.map(a => a.user_id);
    task.assignee = taskAssigns.map(a => ({ id: a.user_id, name: a.users.name, department: a.users.department }));
    task.scheduled_dates = {};
    for (const a of taskAssigns) {
      task.scheduled_dates[a.user_id] = a.scheduled_date;
    }
    if (task.completed_by) {
      const completer = usersMap[task.completed_by];
      task.completer = completer ? { id: completer.id, name: completer.name } : null;
    } else {
      task.completer = null;
    }
  }
}

/** Compute department status + progress for a ticket's tasks */
function computeTicketMeta(tasks) {
  const departmentStatus = {};
  for (const dept of DEPARTMENTS) {
    const dt = tasks.filter(t => t.department === dept);
    if (dt.length === 0) departmentStatus[dept] = 'Not Started';
    else if (dt.every(t => t.status === 'Done')) departmentStatus[dept] = 'Done';
    else if (dt.some(t => t.status !== 'Not Started')) departmentStatus[dept] = 'In Progress';
    else departmentStatus[dept] = 'Not Started';
  }
  const progress = tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.status === 'Done').length / tasks.length) * 100);
  return { departmentStatus, progress };
}

/** Build full tickets from a list of ticket rows — batched to minimize queries.
 *  Turns N*6+ sequential queries into ~7 total queries. */
async function buildFullTicketsBatch(tickets) {
  if (tickets.length === 0) return [];

  const ticketIds = tickets.map(t => t.id);

  // 1. Batch fetch tasks, comments, activity in parallel (chunked for large sets)
  const [allTasks, allComments, allActivity] = await Promise.all([
    batchIn('tasks', 'ticket_id', ticketIds, '*', q => q.order('id')),
    batchIn('comments', 'ticket_id', ticketIds, '*, users!inner(name, department)', q => q.order('created_at')),
    batchIn('activity_log', 'ticket_id', ticketIds, '*, users(name)', q => q.order('created_at')),
  ]);

  // 2. Fetch all task assignments (chunked)
  const allTaskIds = allTasks.map(t => t.id);
  const allAssignments = await batchIn('task_assignments', 'task_id', allTaskIds, '*, users!inner(name, department), scheduled_date');

  // 3. Fetch all unique spas in batch
  const uniqueSpaIds = [...new Set(tickets.map(t => t.spa_id).filter(Boolean))];
  const spasMap = {};
  if (uniqueSpaIds.length > 0) {
    const [spasData, promosData, teamData] = await Promise.all([
      batchIn('spas', 'id', uniqueSpaIds),
      batchIn('spa_promos', 'spa_id', uniqueSpaIds),
      batchIn('spa_team_members', 'spa_id', uniqueSpaIds),
    ]);
    for (const spa of spasData) {
      const promos = promosData.filter(p => p.spa_id === spa.id);
      const teamRows = teamData.filter(t => t.spa_id === spa.id);
      const assigned_team = { Management: [], Marketing: [], IT: [], Accounting: [] };
      for (const row of teamRows) {
        if (assigned_team[row.department]) assigned_team[row.department].push(row.user_id);
      }
      spasMap[spa.id] = { ...spa, promos, assigned_team };
    }
  }

  // 4. Batch fetch all unique users (creators + completers) not already in assignments
  const assignmentUserMap = {};
  for (const a of allAssignments) {
    assignmentUserMap[a.user_id] = { id: a.user_id, name: a.users.name, department: a.users.department };
  }
  const userIdsNeeded = new Set();
  for (const t of tickets) { if (t.created_by) userIdsNeeded.add(t.created_by); }
  for (const t of allTasks) { if (t.completed_by) userIdsNeeded.add(t.completed_by); }
  const missingUserIds = [...userIdsNeeded].filter(id => !assignmentUserMap[id]);

  const usersMap = { ...assignmentUserMap };
  if (missingUserIds.length > 0) {
    const { data } = await supabase.from('users').select('id, name, department').in('id', missingUserIds);
    for (const u of (data || [])) usersMap[u.id] = u;
  }

  // 5. Assemble full tickets
  return tickets.map(ticket => {
    const tasks = allTasks.filter(t => t.ticket_id === ticket.id);
    enrichTasks(tasks, allAssignments, usersMap);
    const { departmentStatus, progress } = computeTicketMeta(tasks);

    return {
      ...ticket,
      spa: ticket.spa_id ? (spasMap[ticket.spa_id] || null) : null,
      creator: ticket.created_by ? (usersMap[ticket.created_by] || null) : null,
      tasks, departmentStatus, progress,
      comments: allComments.filter(c => c.ticket_id === ticket.id).map(c => ({
        id: c.id, ticket_id: c.ticket_id, user_id: c.user_id,
        message: c.text, created_at: c.created_at,
        user: { id: c.user_id, name: c.users.name, department: c.users.department },
      })),
      activity: allActivity.filter(a => a.ticket_id === ticket.id).map(a => ({
        id: a.id, ticket_id: a.ticket_id, user_id: a.user_id,
        action: a.action, created_at: a.created_at,
        user: { id: a.user_id, name: a.users?.name },
      })),
      notifications: [],
    };
  });
}

/** Build a single full ticket (used by fetchTicketById, updateTicket, createTicket) */
async function buildFullTicket(ticket) {
  const result = await buildFullTicketsBatch([ticket]);
  return result[0];
}

export async function fetchTickets() {
  const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return buildFullTicketsBatch(data || []);
}

export async function fetchTicketById(id) {
  const { data, error } = await supabase.from('tickets').select('*').eq('id', id).single();
  if (error) throw error;
  return buildFullTicket(data);
}

export async function fetchTicketsBySpa(spaId) {
  const { data, error } = await supabase.from('tickets').select('*').eq('spa_id', spaId).order('created_at', { ascending: false });
  if (error) throw error;
  return buildFullTicketsBatch(data || []);
}

export async function fetchMyTasks(userId) {
  // 1. Get task assignments for non-Done tasks only
  const { data: assignments, error } = await supabase
    .from('task_assignments')
    .select('task_id, tasks!inner(ticket_id, status)')
    .eq('user_id', userId)
    .neq('tasks.status', 'Done');
  if (error) throw error;

  const ticketIds = [...new Set((assignments || []).map(a => a.tasks?.ticket_id).filter(Boolean))];
  if (ticketIds.length === 0) return [];

  // 2. Fetch tickets (batched for large sets), skip Done tickets
  const tickets = await batchIn('tickets', 'id', ticketIds, '*', q => q.neq('status', 'Done').order('created_at', { ascending: false }));
  return buildFullTicketsBatch(tickets);
}

/** Spa-aware auto-assignment logic */
async function getSpaAwareAssignee(department, spaId) {
  let candidates = [];

  if (spaId) {
    const { data: teamMembers } = await supabase
      .from('spa_team_members')
      .select('user_id')
      .eq('spa_id', spaId)
      .eq('department', department);

    if (teamMembers?.length) {
      const teamIds = teamMembers.map(t => t.user_id);
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .in('id', teamIds)
        .eq('is_active', true);
      candidates = users || [];
    }
  }

  if (candidates.length === 0) {
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('department', department)
      .eq('is_active', true);
    candidates = users || [];
  }

  if (candidates.length === 0) return null;

  // Find least loaded
  let best = null;
  let bestLoad = Infinity;
  for (const user of candidates) {
    const load = await fetchEmployeeWorkload(user.id);
    if (load < bestLoad) { bestLoad = load; best = user; }
  }
  return best;
}

export async function createTicket(data, creatorId) {
  // Find ticket type subtasks
  const { data: subtasks } = await supabase
    .from('ticket_type_subtasks')
    .select('*')
    .eq('ticket_type_id', data.ticket_type_id || (await supabase.from('ticket_types').select('id').eq('name', data.ticket_type).single()).data?.id)
    .order('department')
    .order('id');

  const id = `tk-${Date.now()}`;
  const { error } = await supabase.from('tickets').insert({
    id, ticket_type_id: data.ticket_type_id, ticket_type: data.ticket_type,
    spa_id: data.spa_id || null, treatment_name: data.treatment_name || '',
    promo_price: data.promo_price || null, value_price: data.value_price || null,
    priority: data.priority || 'Medium', target_audience: data.target_audience || '',
    due_date: data.due_date || null, start_ads_date: data.start_ads_date || null,
    first_booking_date: data.first_booking_date || null, domain: data.domain || '',
    status: 'Open', created_by: creatorId, additional_info: data.additional_info || '',
    custom_field_values: data.custom_field_values || {},
    promo_action: data.promo_action || null,
    linked_promo_id: data.linked_promo_id || null,
  });
  if (error) throw error;

  // Create tasks + auto-assign (wrapped in try/catch so ticket creation succeeds even if task setup fails)
  try {
    let taskIdx = 0;
    for (const sub of (subtasks || [])) {
      const taskId = `${id}-t${taskIdx}`;
      await supabase.from('tasks').insert({
        id: taskId, ticket_id: id, department: sub.department,
        task_name: sub.name, estimated_minutes: sub.estimated_minutes, status: 'Not Started',
      });

      try {
        const assignee = await getSpaAwareAssignee(sub.department, data.spa_id);
        if (assignee) {
          const scheduledDate = await pickLeastLoadedDay(assignee.id, sub.estimated_minutes);
          await supabase.from('task_assignments').insert({ task_id: taskId, user_id: assignee.id, role: 'primary', scheduled_date: scheduledDate });
        }
      } catch (assignErr) {
        console.warn(`Auto-assign failed for task ${taskId}:`, assignErr);
      }
      taskIdx++;
    }
  } catch (taskErr) {
    console.warn('Task creation partially failed for ticket', id, taskErr);
  }

  // Activity log (non-critical)
  try {
    await supabase.from('activity_log').insert({
      ticket_id: id, user_id: creatorId, action: `Created ${data.ticket_type} ticket`,
    });
  } catch (logErr) {
    console.warn('Activity log failed for ticket', id, logErr);
  }

  return fetchTicketById(id);
}

export async function updateTicket(id, data) {
  const fields = {};
  for (const key of ['treatment_name', 'promo_price', 'value_price', 'priority', 'target_audience', 'due_date', 'start_ads_date', 'first_booking_date', 'domain', 'status', 'additional_info', 'completed_at', 'custom_field_values', 'promo_action', 'linked_promo_id']) {
    if (data[key] !== undefined) fields[key] = data[key];
  }
  if (Object.keys(fields).length) {
    const { error } = await supabase.from('tickets').update(fields).eq('id', id);
    if (error) throw error;
  }
  return fetchTicketById(id);
}

export async function deleteTicket(id) {
  // Cleanup promo automation before deleting
  const { data: ticket } = await supabase
    .from('tickets')
    .select('promo_action, linked_promo_id')
    .eq('id', id)
    .single();

  if (ticket?.linked_promo_id) {
    if (ticket.promo_action === 'create_promo') {
      await supabase.from('spa_promos').update({ active: false, linked_ticket_id: null }).eq('id', ticket.linked_promo_id);
    } else {
      const snapshot = await fetchPromoSnapshot(id);
      if (snapshot) {
        await supabase.from('spa_promos').update({
          name: snapshot.snapshot_name, price: snapshot.snapshot_price,
          value_price: snapshot.snapshot_value_price, active: snapshot.snapshot_active,
          linked_ticket_id: null,
        }).eq('id', ticket.linked_promo_id);
      }
    }
  }

  const { error } = await supabase.from('tickets').delete().eq('id', id);
  if (error) throw error;
}

// ─── Tasks ───

export async function toggleTaskStatus(taskId, userId) {
  const { data: task, error } = await supabase.from('tasks').select('*').eq('id', taskId).single();
  if (error) throw error;

  const newStatus = task.status === 'Done' ? 'Not Started' : 'Done';
  await supabase.from('tasks').update({
    status: newStatus,
    completed_by: newStatus === 'Done' ? userId : null,
    completed_at: newStatus === 'Done' ? new Date().toISOString() : null,
  }).eq('id', taskId);

  // Activity
  const actionText = newStatus === 'Done' ? `Completed task: ${task.task_name}` : `Reopened task: ${task.task_name}`;
  await supabase.from('activity_log').insert({ ticket_id: task.ticket_id, user_id: userId, action: actionText });

  // Recompute ticket status
  await recomputeTicketStatus(task.ticket_id);

  return { taskId, ticketId: task.ticket_id, newStatus };
}

async function recomputeTicketStatus(ticketId) {
  // 1. Get current ticket state (need old status for transition detection)
  const { data: ticket } = await supabase
    .from('tickets')
    .select('status, promo_action, linked_promo_id, spa_id, treatment_name, promo_price, value_price')
    .eq('id', ticketId)
    .single();
  const oldStatus = ticket?.status;

  // 2. Compute new status from tasks
  const { data: tasks } = await supabase.from('tasks').select('*').eq('ticket_id', ticketId);
  let allDone = true, anyStarted = false;
  for (const dept of DEPARTMENTS) {
    const dt = (tasks || []).filter(t => t.department === dept);
    if (dt.length === 0) continue;
    if (dt.every(t => t.status === 'Done')) anyStarted = true;
    else if (dt.some(t => t.status !== 'Not Started')) { allDone = false; anyStarted = true; }
    else allDone = false;
  }
  if ((tasks || []).length === 0) { allDone = false; anyStarted = false; }
  const newStatus = allDone ? 'Done' : anyStarted ? 'In Progress' : 'Open';

  // 3. Update ticket status
  await supabase.from('tickets').update({
    status: newStatus, completed_at: allDone ? new Date().toISOString() : null,
  }).eq('id', ticketId);

  // 4. Handle promo automation on status transitions
  if (ticket?.promo_action) {
    const transitionedToDone = oldStatus !== 'Done' && newStatus === 'Done';
    const transitionedFromDone = oldStatus === 'Done' && newStatus !== 'Done';
    if (transitionedToDone) await executePromoAction(ticketId, ticket);
    else if (transitionedFromDone) await revertPromoAction(ticketId, ticket);
  }
}

/** Execute promo action when ticket transitions to Done */
async function executePromoAction(ticketId, ticket) {
  const { promo_action, linked_promo_id, spa_id, treatment_name, promo_price, value_price } = ticket;
  try {
    if (promo_action === 'create_promo') {
      const promoId = `p-${Date.now()}`;
      await supabase.from('spa_promos').insert({
        id: promoId, spa_id, name: treatment_name || 'New Promo',
        price: promo_price || 0, value_price: value_price || 0,
        active: true, linked_ticket_id: ticketId,
      });
      await supabase.from('tickets').update({ linked_promo_id: promoId }).eq('id', ticketId);
    } else if (promo_action === 'update_promo' && linked_promo_id) {
      const { data: currentPromo } = await supabase.from('spa_promos').select('*').eq('id', linked_promo_id).single();
      if (currentPromo) {
        await createPromoSnapshot(ticketId, currentPromo);
        await supabase.from('spa_promos').update({
          name: treatment_name || currentPromo.name,
          price: promo_price ?? currentPromo.price,
          value_price: value_price ?? currentPromo.value_price,
          linked_ticket_id: ticketId,
        }).eq('id', linked_promo_id);
      }
    } else if (promo_action === 'deactivate_promo' && linked_promo_id) {
      const { data: currentPromo } = await supabase.from('spa_promos').select('*').eq('id', linked_promo_id).single();
      if (currentPromo) {
        await createPromoSnapshot(ticketId, currentPromo);
        await supabase.from('spa_promos').update({ active: false, linked_ticket_id: ticketId }).eq('id', linked_promo_id);
      }
    }
    await supabase.from('activity_log').insert({
      ticket_id: ticketId, user_id: null,
      action: `Promo automation: ${promo_action.replace(/_/g, ' ')} executed`,
    });
  } catch (err) {
    console.error('Promo automation failed:', err);
    await supabase.from('activity_log').insert({
      ticket_id: ticketId, user_id: null,
      action: `Promo automation FAILED: ${err.message}`,
    }).catch(() => {});
  }
}

/** Revert promo action when ticket transitions from Done back */
async function revertPromoAction(ticketId, ticket) {
  const { promo_action, linked_promo_id } = ticket;
  try {
    if (promo_action === 'create_promo' && linked_promo_id) {
      await supabase.from('spa_promos').update({ active: false }).eq('id', linked_promo_id);
    } else if (promo_action === 'update_promo' && linked_promo_id) {
      const snapshot = await fetchPromoSnapshot(ticketId);
      if (snapshot) {
        await supabase.from('spa_promos').update({
          name: snapshot.snapshot_name, price: snapshot.snapshot_price,
          value_price: snapshot.snapshot_value_price, linked_ticket_id: null,
        }).eq('id', linked_promo_id);
        await deletePromoSnapshot(ticketId);
      }
    } else if (promo_action === 'deactivate_promo' && linked_promo_id) {
      const snapshot = await fetchPromoSnapshot(ticketId);
      if (snapshot) {
        await supabase.from('spa_promos').update({
          active: snapshot.snapshot_active, linked_ticket_id: null,
        }).eq('id', linked_promo_id);
        await deletePromoSnapshot(ticketId);
      }
    }
    await supabase.from('activity_log').insert({
      ticket_id: ticketId, user_id: null,
      action: `Promo automation: ${promo_action.replace(/_/g, ' ')} reverted (ticket reopened)`,
    });
  } catch (err) {
    console.error('Promo revert failed:', err);
    await supabase.from('activity_log').insert({
      ticket_id: ticketId, user_id: null,
      action: `Promo revert FAILED: ${err.message}`,
    }).catch(() => {});
  }
}

export async function assignTask(taskId, userId, action = 'set', scheduledDate) {
  if (action === 'set') {
    // Remove all current primaries, add this one
    await supabase.from('task_assignments').delete().eq('task_id', taskId).eq('role', 'primary');
    if (userId) {
      // Remove if exists as helper, then add as primary
      await supabase.from('task_assignments').delete().eq('task_id', taskId).eq('user_id', userId);
      // Get task estimated_minutes for scheduling
      const { data: taskData } = await supabase.from('tasks').select('estimated_minutes').eq('id', taskId).single();
      const sd = scheduledDate || await pickLeastLoadedDay(userId, taskData?.estimated_minutes || 0);
      await supabase.from('task_assignments').insert({ task_id: taskId, user_id: userId, role: 'primary', scheduled_date: sd });
    }
  } else if (action === 'add') {
    const { data: existing } = await supabase.from('task_assignments').select('*').eq('task_id', taskId).eq('user_id', userId);
    if (!existing?.length) {
      const { data: taskData } = await supabase.from('tasks').select('estimated_minutes').eq('id', taskId).single();
      const sd = scheduledDate || await pickLeastLoadedDay(userId, taskData?.estimated_minutes || 0);
      await supabase.from('task_assignments').insert({ task_id: taskId, user_id: userId, role: 'helper', scheduled_date: sd });
    }
  } else if (action === 'remove') {
    await supabase.from('task_assignments').delete().eq('task_id', taskId).eq('user_id', userId);
  }
}

// ─── Comments ───

export async function fetchComments(ticketId) {
  const { data, error } = await supabase
    .from('comments')
    .select('*, users!inner(name, department)')
    .eq('ticket_id', ticketId)
    .order('created_at');
  if (error) throw error;
  return (data || []).map(c => ({
    id: c.id, ticket_id: c.ticket_id, user_id: c.user_id,
    message: c.text, created_at: c.created_at,
    user: { id: c.user_id, name: c.users.name, department: c.users.department },
  }));
}

export async function addComment(ticketId, message, userId) {
  const { data, error } = await supabase.from('comments').insert({
    ticket_id: ticketId, user_id: userId, text: message,
  }).select('*, users!inner(name, department)').single();
  if (error) throw error;
  await supabase.from('activity_log').insert({ ticket_id: ticketId, user_id: userId, action: 'Added a comment' });
  return {
    id: data.id, ticket_id: data.ticket_id, user_id: data.user_id,
    message: data.text, created_at: data.created_at,
    user: { id: data.user_id, name: data.users.name, department: data.users.department },
  };
}

// ─── Onboarding Forms ───

export async function fetchOnboardingForms() {
  const { data, error } = await supabase.from('onboarding_forms').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchOnboardingFormById(id) {
  const { data, error } = await supabase.from('onboarding_forms').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function fetchOnboardingFormBySlug(slug) {
  const { data, error } = await supabase.from('onboarding_forms').select('*').eq('slug', slug).single();
  if (error) throw error;
  return data;
}

export async function createOnboardingForm(formData) {
  const id = `form-${Date.now()}`;
  const { data, error } = await supabase.from('onboarding_forms').insert({
    id, name: formData.name || 'Untitled Form', slug: formData.slug || `form-${Date.now()}`,
    ticket_type: formData.ticket_type || 'New Spa', fields: formData.fields || [],
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateOnboardingForm(id, formData) {
  const fields = {};
  for (const key of ['name', 'slug', 'ticket_type', 'fields']) {
    if (formData[key] !== undefined) fields[key] = formData[key];
  }
  const { data, error } = await supabase.from('onboarding_forms').update(fields).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteOnboardingForm(id) {
  const { error } = await supabase.from('onboarding_forms').delete().eq('id', id);
  if (error) throw error;
}

// ─── Constants (re-exported for convenience) ───
export { EFFECTIVE_MINUTES_PER_DAY, DEPARTMENTS };
