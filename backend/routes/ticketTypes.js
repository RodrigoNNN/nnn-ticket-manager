const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/** Build full ticket type with subtasks */
function buildTicketTypeResponse(db, tt) {
  const subtaskRows = db.prepare(
    'SELECT * FROM ticket_type_subtasks WHERE ticket_type_id = ? ORDER BY department, id'
  ).all(tt.id);

  const subtasks = {};
  for (const row of subtaskRows) {
    if (!subtasks[row.department]) subtasks[row.department] = [];
    subtasks[row.department].push({
      name: row.name,
      estimated_minutes: row.estimated_minutes,
    });
  }

  return {
    ...tt,
    is_active: !!tt.is_active,
    custom_fields: JSON.parse(tt.custom_fields || '[]'),
    subtasks,
  };
}

/**
 * GET /api/ticket-types
 */
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const types = db.prepare('SELECT * FROM ticket_types ORDER BY name').all();
    res.json(types.map(tt => buildTicketTypeResponse(db, tt)));
  } catch (err) {
    console.error('Get ticket types error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ticket-types/:id
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const tt = db.prepare('SELECT * FROM ticket_types WHERE id = ?').get(req.params.id);
    if (!tt) return res.status(404).json({ error: 'Ticket type not found' });
    res.json(buildTicketTypeResponse(db, tt));
  } catch (err) {
    console.error('Get ticket type error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/ticket-types
 */
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { name, color, instructions, custom_fields, subtasks } = req.body;
    const id = `tt-${Date.now()}`;

    db.prepare(`
      INSERT INTO ticket_types (id, name, color, is_active, instructions, custom_fields)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(id, name, color || '#6B7280', instructions || '', JSON.stringify(custom_fields || []));

    // Insert subtasks
    if (subtasks) {
      const insert = db.prepare(
        'INSERT INTO ticket_type_subtasks (ticket_type_id, department, name, estimated_minutes) VALUES (?, ?, ?, ?)'
      );
      for (const [dept, tasks] of Object.entries(subtasks)) {
        for (const task of tasks) {
          const t = typeof task === 'string' ? { name: task, estimated_minutes: 10 } : task;
          insert.run(id, dept, t.name, t.estimated_minutes || 10);
        }
      }
    }

    const tt = db.prepare('SELECT * FROM ticket_types WHERE id = ?').get(id);
    res.status(201).json(buildTicketTypeResponse(db, tt));
  } catch (err) {
    console.error('Create ticket type error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/ticket-types/:id
 */
router.patch('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const tt = db.prepare('SELECT * FROM ticket_types WHERE id = ?').get(req.params.id);
    if (!tt) return res.status(404).json({ error: 'Ticket type not found' });

    const updates = [];
    const params = [];

    for (const field of ['name', 'color', 'instructions']) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }
    if (req.body.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(req.body.is_active ? 1 : 0);
    }
    if (req.body.custom_fields !== undefined) {
      updates.push('custom_fields = ?');
      params.push(JSON.stringify(req.body.custom_fields));
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE ticket_types SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    // Replace subtasks if provided
    if (req.body.subtasks !== undefined) {
      db.prepare('DELETE FROM ticket_type_subtasks WHERE ticket_type_id = ?').run(req.params.id);
      const insert = db.prepare(
        'INSERT INTO ticket_type_subtasks (ticket_type_id, department, name, estimated_minutes) VALUES (?, ?, ?, ?)'
      );
      for (const [dept, tasks] of Object.entries(req.body.subtasks)) {
        for (const task of tasks) {
          const t = typeof task === 'string' ? { name: task, estimated_minutes: 10 } : task;
          insert.run(req.params.id, dept, t.name, t.estimated_minutes || 10);
        }
      }
    }

    const updated = db.prepare('SELECT * FROM ticket_types WHERE id = ?').get(req.params.id);
    res.json(buildTicketTypeResponse(db, updated));
  } catch (err) {
    console.error('Update ticket type error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/ticket-types/:id (soft delete)
 */
router.delete('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('UPDATE ticket_types SET is_active = 0 WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Ticket type not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete ticket type error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
