const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { getEmployeeWorkload, getEmployeesWorkload, EFFECTIVE_MINUTES_PER_DAY } = require('../helpers/workload');

const router = express.Router();

/**
 * GET /api/users
 * List all users, optional ?department=X&active=true
 */
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    let query = 'SELECT id, name, email, department, role, is_active, whatsapp_number FROM users WHERE 1=1';
    const params = [];

    if (req.query.department) {
      query += ' AND department = ?';
      params.push(req.query.department);
    }
    if (req.query.active === 'true') {
      query += ' AND is_active = 1';
    }

    query += ' ORDER BY department, name';
    const users = db.prepare(query).all(...params);
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id
 * Get single user
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare(
      'SELECT id, name, email, department, role, is_active, whatsapp_number FROM users WHERE id = ?'
    ).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id/workload
 * Get user's current workload in minutes
 */
router.get('/:id/workload', authenticate, (req, res) => {
  try {
    const db = getDb();
    const totalMinutes = getEmployeeWorkload(db, req.params.id);
    const pct = Math.round((totalMinutes / EFFECTIVE_MINUTES_PER_DAY) * 100);

    // Get task details
    const tasks = db.prepare(`
      SELECT t.*, tk.ticket_type, s.name as spa_name
      FROM task_assignments ta
      JOIN tasks t ON t.id = ta.task_id
      JOIN tickets tk ON tk.id = t.ticket_id
      LEFT JOIN spas s ON s.id = tk.spa_id
      WHERE ta.user_id = ? AND t.status != 'Done'
    `).all(req.params.id);

    res.json({
      userId: req.params.id,
      totalMinutes,
      effectiveMinutesPerDay: EFFECTIVE_MINUTES_PER_DAY,
      percentage: pct,
      tasks,
    });
  } catch (err) {
    console.error('Get workload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/workload/department/:dept
 * Get all users' workloads in a department
 */
router.get('/workload/department/:dept', authenticate, (req, res) => {
  try {
    const db = getDb();
    const workloads = getEmployeesWorkload(db, req.params.dept);
    res.json(workloads);
  } catch (err) {
    console.error('Get dept workload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
