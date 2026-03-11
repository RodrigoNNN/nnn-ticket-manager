const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/tickets/:ticketId/comments
 */
router.get('/:ticketId/comments', authenticate, (req, res) => {
  try {
    const db = getDb();
    const comments = db.prepare(`
      SELECT c.*, u.name as user_name, u.department as user_department
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.ticket_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.ticketId);

    res.json(comments.map(c => ({
      id: c.id,
      ticket_id: c.ticket_id,
      user_id: c.user_id,
      message: c.text,
      created_at: c.created_at,
      user: { id: c.user_id, name: c.user_name, department: c.user_department },
    })));
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tickets/:ticketId/comments
 */
router.post('/:ticketId/comments', authenticate, (req, res) => {
  try {
    const db = getDb();
    const ticket = db.prepare('SELECT id FROM tickets WHERE id = ?').get(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = db.prepare(
      'INSERT INTO comments (ticket_id, user_id, text) VALUES (?, ?, ?)'
    ).run(req.params.ticketId, req.user.id, message.trim());

    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
    const user = db.prepare('SELECT id, name, department FROM users WHERE id = ?').get(req.user.id);

    // Log activity
    db.prepare('INSERT INTO activity_log (ticket_id, user_id, action) VALUES (?, ?, ?)')
      .run(req.params.ticketId, req.user.id, 'Added a comment');

    res.status(201).json({
      id: comment.id,
      ticket_id: comment.ticket_id,
      user_id: comment.user_id,
      message: comment.text,
      created_at: comment.created_at,
      user,
    });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
