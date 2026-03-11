const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { getSpaAwareAssignee } = require('../helpers/workload');

const router = express.Router();

/** Build full ticket response with tasks, assignees, spa, comments, activity */
function buildTicketResponse(db, ticket) {
  // Get spa
  const spa = ticket.spa_id ? db.prepare('SELECT * FROM spas WHERE id = ?').get(ticket.spa_id) : null;

  // Build spa with promos and team
  let spaObj = null;
  if (spa) {
    const promos = db.prepare('SELECT * FROM spa_promos WHERE spa_id = ?').all(spa.id);
    const teamRows = db.prepare('SELECT * FROM spa_team_members WHERE spa_id = ?').all(spa.id);
    const assigned_team = { Management: [], Marketing: [], IT: [], Accounting: [] };
    for (const row of teamRows) {
      if (assigned_team[row.department]) assigned_team[row.department].push(row.user_id);
    }
    spaObj = {
      ...spa,
      onboarding_data: JSON.parse(spa.onboarding_data || '{}'),
      extra_fields: JSON.parse(spa.extra_fields || '[]'),
      promos: promos.map(p => ({ ...p, active: !!p.active })),
      assigned_team,
    };
  }

  // Get tasks with assignments
  const tasks = db.prepare('SELECT * FROM tasks WHERE ticket_id = ? ORDER BY id').all(ticket.id);
  for (const task of tasks) {
    const assignments = db.prepare(`
      SELECT ta.*, u.name, u.department as user_department, u.email
      FROM task_assignments ta
      JOIN users u ON u.id = ta.user_id
      WHERE ta.task_id = ?
      ORDER BY ta.role, ta.assigned_at
    `).all(task.id);

    task.assigned_to = assignments.map(a => a.user_id);
    task.assignee = assignments.map(a => ({
      id: a.user_id,
      name: a.name,
      department: a.user_department,
    }));

    // Completer info
    if (task.completed_by) {
      const completer = db.prepare('SELECT id, name FROM users WHERE id = ?').get(task.completed_by);
      task.completer = completer || null;
    } else {
      task.completer = null;
    }
  }

  // Get creator
  const creator = ticket.created_by ? db.prepare('SELECT id, name, department FROM users WHERE id = ?').get(ticket.created_by) : null;

  // Get comments
  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.department as user_department
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.ticket_id = ?
    ORDER BY c.created_at ASC
  `).all(ticket.id);

  // Get activity
  const activity = db.prepare(`
    SELECT a.*, u.name as user_name
    FROM activity_log a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.ticket_id = ?
    ORDER BY a.created_at ASC
  `).all(ticket.id);

  // Compute departmentStatus
  const departments = ['Management', 'Marketing', 'IT', 'Accounting'];
  const departmentStatus = {};
  for (const dept of departments) {
    const dt = tasks.filter(t => t.department === dept);
    if (dt.length === 0) departmentStatus[dept] = 'Not Started';
    else if (dt.every(t => t.status === 'Done')) departmentStatus[dept] = 'Done';
    else if (dt.some(t => t.status !== 'Not Started')) departmentStatus[dept] = 'In Progress';
    else departmentStatus[dept] = 'Not Started';
  }

  // Compute progress
  const progress = tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.status === 'Done').length / tasks.length) * 100);

  return {
    ...ticket,
    custom_field_values: JSON.parse(ticket.custom_field_values || '{}'),
    spa: spaObj,
    creator,
    tasks,
    departmentStatus,
    progress,
    comments: comments.map(c => ({
      id: c.id,
      ticket_id: c.ticket_id,
      user_id: c.user_id,
      message: c.text,
      created_at: c.created_at,
      user: { id: c.user_id, name: c.user_name, department: c.user_department },
    })),
    activity: activity.map(a => ({
      id: a.id,
      ticket_id: a.ticket_id,
      user_id: a.user_id,
      action: a.action,
      created_at: a.created_at,
      user: { id: a.user_id, name: a.user_name },
    })),
    notifications: [],
  };
}

/**
 * GET /api/tickets
 */
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    let query = 'SELECT * FROM tickets';
    const params = [];
    const conditions = [];

    if (req.query.status) {
      conditions.push('status = ?');
      params.push(req.query.status);
    }
    if (req.query.spa_id) {
      conditions.push('spa_id = ?');
      params.push(req.query.spa_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const tickets = db.prepare(query).all(...params);
    res.json(tickets.map(t => buildTicketResponse(db, t)));
  } catch (err) {
    console.error('Get tickets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tickets/my-tasks
 * Get tasks assigned to current user (grouped by ticket)
 */
router.get('/my-tasks', authenticate, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    // Find tickets that have tasks assigned to this user
    const ticketIds = db.prepare(`
      SELECT DISTINCT t.ticket_id
      FROM task_assignments ta
      JOIN tasks t ON t.id = ta.task_id
      WHERE ta.user_id = ?
    `).all(userId).map(r => r.ticket_id);

    if (ticketIds.length === 0) {
      return res.json([]);
    }

    const placeholders = ticketIds.map(() => '?').join(',');
    const tickets = db.prepare(`SELECT * FROM tickets WHERE id IN (${placeholders}) ORDER BY created_at DESC`).all(...ticketIds);

    const result = tickets.map(ticket => {
      const fullTicket = buildTicketResponse(db, ticket);
      // Filter to only tasks assigned to this user
      const myTasks = fullTicket.tasks.filter(task => task.assigned_to.includes(userId));
      return {
        ticket: fullTicket,
        tasks: myTasks,
        departmentStatus: fullTicket.departmentStatus,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Get my tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tickets/:id
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(buildTicketResponse(db, ticket));
  } catch (err) {
    console.error('Get ticket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tickets
 * Create ticket + auto-generate tasks + auto-assign
 */
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { ticket_type, spa_id, treatment_name, promo_price, value_price, priority,
      target_audience, due_date, start_ads_date, first_booking_date, domain,
      additional_info, custom_field_values } = req.body;

    // Find ticket type
    const typeDef = db.prepare('SELECT * FROM ticket_types WHERE name = ?').get(ticket_type);
    if (!typeDef) {
      return res.status(400).json({ error: `Ticket type '${ticket_type}' not found` });
    }

    const id = `tk-${Date.now()}`;

    // Insert ticket
    db.prepare(`
      INSERT INTO tickets (id, ticket_type_id, ticket_type, spa_id, treatment_name, promo_price, value_price,
        priority, target_audience, due_date, start_ads_date, first_booking_date, domain,
        status, created_by, additional_info, custom_field_values)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?)
    `).run(id, typeDef.id, ticket_type, spa_id || null, treatment_name || '',
      promo_price || null, value_price || null, priority || 'Medium',
      target_audience || '', due_date || null, start_ads_date || null,
      first_booking_date || null, domain || '',
      req.user.id, additional_info || '', JSON.stringify(custom_field_values || {}));

    // Generate tasks from subtask templates
    const subtasks = db.prepare(
      'SELECT * FROM ticket_type_subtasks WHERE ticket_type_id = ? ORDER BY department, id'
    ).all(typeDef.id);

    const insertTask = db.prepare(
      'INSERT INTO tasks (id, ticket_id, department, task_name, estimated_minutes, status) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertAssignment = db.prepare(
      'INSERT INTO task_assignments (task_id, user_id, role) VALUES (?, ?, ?)'
    );

    let taskIdx = 0;
    for (const sub of subtasks) {
      const taskId = `${id}-t${taskIdx}`;
      insertTask.run(taskId, id, sub.department, sub.name, sub.estimated_minutes, 'Not Started');

      // Auto-assign using spa-aware logic
      const assignee = getSpaAwareAssignee(db, sub.department, spa_id);
      if (assignee) {
        insertAssignment.run(taskId, assignee.id, 'primary');
      }
      taskIdx++;
    }

    // Add activity log
    db.prepare(
      'INSERT INTO activity_log (ticket_id, user_id, action) VALUES (?, ?, ?)'
    ).run(id, req.user.id, `Created ${ticket_type} ticket`);

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
    res.status(201).json(buildTicketResponse(db, ticket));
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/tickets/:id
 */
router.patch('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const fields = ['treatment_name', 'promo_price', 'value_price', 'priority',
      'target_audience', 'due_date', 'start_ads_date', 'first_booking_date',
      'domain', 'status', 'additional_info', 'completed_at'];
    const updates = [];
    const params = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }
    if (req.body.custom_field_values !== undefined) {
      updates.push('custom_field_values = ?');
      params.push(JSON.stringify(req.body.custom_field_values));
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    res.json(buildTicketResponse(db, updated));
  } catch (err) {
    console.error('Update ticket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/tickets/:id
 */
router.delete('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM tickets WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete ticket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
