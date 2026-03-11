const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/** Recompute ticket status/progress from its tasks */
function recomputeTicketStatus(db, ticketId) {
  const tasks = db.prepare('SELECT * FROM tasks WHERE ticket_id = ?').all(ticketId);
  const departments = ['Management', 'Marketing', 'IT', 'Accounting'];

  let allDone = true;
  let anyStarted = false;

  for (const dept of departments) {
    const dt = tasks.filter(t => t.department === dept);
    if (dt.length === 0) { allDone = false; }
    else if (dt.every(t => t.status === 'Done')) { anyStarted = true; }
    else if (dt.some(t => t.status !== 'Not Started')) { allDone = false; anyStarted = true; }
    else { allDone = false; }
  }

  const status = allDone ? 'Done' : anyStarted ? 'In Progress' : 'Open';
  const completedAt = allDone ? new Date().toISOString() : null;

  db.prepare('UPDATE tickets SET status = ?, completed_at = ? WHERE id = ?')
    .run(status, completedAt, ticketId);
}

/**
 * PATCH /api/tasks/:id/status
 * Toggle task status (Not Started → Done, Done → Not Started)
 */
router.patch('/:id/status', authenticate, (req, res) => {
  try {
    const db = getDb();
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const newStatus = task.status === 'Done' ? 'Not Started' : 'Done';
    const completedBy = newStatus === 'Done' ? req.user.id : null;
    const completedAt = newStatus === 'Done' ? new Date().toISOString() : null;

    db.prepare('UPDATE tasks SET status = ?, completed_by = ?, completed_at = ? WHERE id = ?')
      .run(newStatus, completedBy, completedAt, req.params.id);

    // Log activity
    const actionText = newStatus === 'Done'
      ? `Completed task: ${task.task_name}`
      : `Reopened task: ${task.task_name}`;
    db.prepare('INSERT INTO activity_log (ticket_id, user_id, action) VALUES (?, ?, ?)')
      .run(task.ticket_id, req.user.id, actionText);

    // Recompute ticket status
    recomputeTicketStatus(db, task.ticket_id);

    // Return updated task with completer info
    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (updated.completed_by) {
      const completer = db.prepare('SELECT id, name FROM users WHERE id = ?').get(updated.completed_by);
      updated.completer = completer;
    } else {
      updated.completer = null;
    }

    // Get assignments
    const assignments = db.prepare(`
      SELECT ta.user_id, u.name, u.department
      FROM task_assignments ta
      JOIN users u ON u.id = ta.user_id
      WHERE ta.task_id = ?
    `).all(req.params.id);

    updated.assigned_to = assignments.map(a => a.user_id);
    updated.assignee = assignments.map(a => ({ id: a.user_id, name: a.name, department: a.department }));

    res.json({ task: updated, ticketId: task.ticket_id });
  } catch (err) {
    console.error('Toggle task status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tasks/:id/assign
 * Assign a user to a task { userId, role: 'primary'|'helper' }
 */
router.post('/:id/assign', authenticate, (req, res) => {
  try {
    const db = getDb();
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { userId, role } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Check if already assigned
    const existing = db.prepare(
      'SELECT * FROM task_assignments WHERE task_id = ? AND user_id = ?'
    ).get(req.params.id, userId);

    if (existing) {
      return res.status(400).json({ error: 'User already assigned to this task' });
    }

    db.prepare('INSERT INTO task_assignments (task_id, user_id, role) VALUES (?, ?, ?)')
      .run(req.params.id, userId, role || 'helper');

    // Log activity
    const assignedUser = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
    db.prepare('INSERT INTO activity_log (ticket_id, user_id, action) VALUES (?, ?, ?)')
      .run(task.ticket_id, req.user.id, `Assigned ${assignedUser?.name || userId} to ${task.task_name}`);

    res.json({ success: true });
  } catch (err) {
    console.error('Assign task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/tasks/:id/assign
 * Set primary assignee (replaces current primary) { userId }
 */
router.put('/:id/assign', authenticate, (req, res) => {
  try {
    const db = getDb();
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { userId } = req.body;

    // Remove current primary
    db.prepare("DELETE FROM task_assignments WHERE task_id = ? AND role = 'primary'")
      .run(req.params.id);

    if (userId) {
      // Check if user is already a helper, if so upgrade
      const existing = db.prepare(
        'SELECT * FROM task_assignments WHERE task_id = ? AND user_id = ?'
      ).get(req.params.id, userId);

      if (existing) {
        db.prepare("UPDATE task_assignments SET role = 'primary' WHERE task_id = ? AND user_id = ?")
          .run(req.params.id, userId);
      } else {
        db.prepare("INSERT INTO task_assignments (task_id, user_id, role) VALUES (?, ?, 'primary')")
          .run(req.params.id, userId);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Set primary assignee error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/tasks/:id/assign/:userId
 * Remove a user from a task
 */
router.delete('/:id/assign/:userId', authenticate, (req, res) => {
  try {
    const db = getDb();
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const result = db.prepare('DELETE FROM task_assignments WHERE task_id = ? AND user_id = ?')
      .run(req.params.id, req.params.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Log activity
    const removedUser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.params.userId);
    db.prepare('INSERT INTO activity_log (ticket_id, user_id, action) VALUES (?, ?, ?)')
      .run(task.ticket_id, req.user.id, `Removed ${removedUser?.name || req.params.userId} from ${task.task_name}`);

    res.json({ success: true });
  } catch (err) {
    console.error('Remove assignment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
