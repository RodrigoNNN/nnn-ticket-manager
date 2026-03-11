const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/onboarding-forms
 */
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const forms = db.prepare('SELECT * FROM onboarding_forms ORDER BY created_at DESC').all();
    res.json(forms.map(f => ({
      ...f,
      fields: JSON.parse(f.fields || '[]'),
    })));
  } catch (err) {
    console.error('Get onboarding forms error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/onboarding-forms/:id
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const form = db.prepare('SELECT * FROM onboarding_forms WHERE id = ?').get(req.params.id);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    res.json({ ...form, fields: JSON.parse(form.fields || '[]') });
  } catch (err) {
    console.error('Get onboarding form error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/onboarding-forms
 */
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { name, slug, ticket_type, fields } = req.body;
    const id = `form-${Date.now()}`;

    db.prepare(`
      INSERT INTO onboarding_forms (id, name, slug, ticket_type, fields)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name || 'Untitled Form', slug || `form-${Date.now()}`, ticket_type || 'New Spa', JSON.stringify(fields || []));

    const form = db.prepare('SELECT * FROM onboarding_forms WHERE id = ?').get(id);
    res.status(201).json({ ...form, fields: JSON.parse(form.fields || '[]') });
  } catch (err) {
    console.error('Create onboarding form error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/onboarding-forms/:id
 */
router.patch('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const form = db.prepare('SELECT * FROM onboarding_forms WHERE id = ?').get(req.params.id);
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const updates = [];
    const params = [];

    for (const field of ['name', 'slug', 'ticket_type']) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }
    if (req.body.fields !== undefined) {
      updates.push('fields = ?');
      params.push(JSON.stringify(req.body.fields));
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE onboarding_forms SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM onboarding_forms WHERE id = ?').get(req.params.id);
    res.json({ ...updated, fields: JSON.parse(updated.fields || '[]') });
  } catch (err) {
    console.error('Update onboarding form error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/onboarding-forms/:id
 */
router.delete('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM onboarding_forms WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Form not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete onboarding form error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
