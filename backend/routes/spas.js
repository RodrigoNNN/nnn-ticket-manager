const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/** Helper: build full spa object with promos + team */
function buildSpaResponse(db, spa) {
  // Get promos
  const promos = db.prepare('SELECT * FROM spa_promos WHERE spa_id = ?').all(spa.id);

  // Get team members grouped by department
  const teamRows = db.prepare(`
    SELECT stm.department, stm.user_id, u.name, u.email, u.role
    FROM spa_team_members stm
    JOIN users u ON u.id = stm.user_id
    WHERE stm.spa_id = ?
    ORDER BY stm.department, u.name
  `).all(spa.id);

  const assigned_team = { Management: [], Marketing: [], IT: [], Accounting: [] };
  for (const row of teamRows) {
    if (assigned_team[row.department]) {
      assigned_team[row.department].push(row.user_id);
    }
  }

  return {
    ...spa,
    onboarding_data: JSON.parse(spa.onboarding_data || '{}'),
    extra_fields: JSON.parse(spa.extra_fields || '[]'),
    promos: promos.map(p => ({ ...p, active: !!p.active })),
    assigned_team,
  };
}

/**
 * GET /api/spas
 */
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const spas = db.prepare('SELECT * FROM spas ORDER BY name').all();
    const result = spas.map(spa => buildSpaResponse(db, spa));
    res.json(result);
  } catch (err) {
    console.error('Get spas error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/spas/:id
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const spa = db.prepare('SELECT * FROM spas WHERE id = ?').get(req.params.id);
    if (!spa) return res.status(404).json({ error: 'Spa not found' });
    res.json(buildSpaResponse(db, spa));
  } catch (err) {
    console.error('Get spa error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/spas
 */
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { name, location, country, tier, monthly_budget, arrival_goal, assigned_team, promos, onboarding_data, extra_fields, onboarded_via } = req.body;

    const id = `s-${Date.now()}`;
    db.prepare(`
      INSERT INTO spas (id, name, location, country, status, tier, monthly_budget, arrival_goal, onboarding_data, extra_fields, onboarded_at, onboarded_via)
      VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, datetime('now'), ?)
    `).run(id, name || 'New Spa', location || '', country || 'USA', tier || null, monthly_budget || null, arrival_goal || null,
      JSON.stringify(onboarding_data || {}), JSON.stringify(extra_fields || []), onboarded_via || 'manual');

    // Insert promos
    if (promos && promos.length > 0) {
      const insertPromo = db.prepare('INSERT INTO spa_promos (id, spa_id, name, price, value_price, active) VALUES (?, ?, ?, ?, ?, ?)');
      for (const promo of promos) {
        insertPromo.run(promo.id || `p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, id, promo.name, promo.price, promo.value_price, promo.active ? 1 : 0);
      }
    }

    // Insert team members
    if (assigned_team) {
      const insertTeam = db.prepare('INSERT INTO spa_team_members (spa_id, department, user_id) VALUES (?, ?, ?)');
      for (const [dept, userIds] of Object.entries(assigned_team)) {
        for (const userId of userIds) {
          insertTeam.run(id, dept, userId);
        }
      }
    }

    const spa = db.prepare('SELECT * FROM spas WHERE id = ?').get(id);
    res.status(201).json(buildSpaResponse(db, spa));
  } catch (err) {
    console.error('Create spa error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/spas/:id
 */
router.patch('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const spa = db.prepare('SELECT * FROM spas WHERE id = ?').get(req.params.id);
    if (!spa) return res.status(404).json({ error: 'Spa not found' });

    const fields = ['name', 'location', 'country', 'status', 'tier', 'monthly_budget', 'arrival_goal', 'onboarded_via'];
    const updates = [];
    const params = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    // Handle JSON fields
    if (req.body.onboarding_data !== undefined) {
      updates.push('onboarding_data = ?');
      params.push(JSON.stringify(req.body.onboarding_data));
    }
    if (req.body.extra_fields !== undefined) {
      updates.push('extra_fields = ?');
      params.push(JSON.stringify(req.body.extra_fields));
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE spas SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM spas WHERE id = ?').get(req.params.id);
    res.json(buildSpaResponse(db, updated));
  } catch (err) {
    console.error('Update spa error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/spas/:id/team
 * Set team members for a spa { department, userIds[] }
 * Or full team: { team: { Management: [...], Marketing: [...], ... } }
 */
router.put('/:id/team', authenticate, (req, res) => {
  try {
    const db = getDb();
    const spa = db.prepare('SELECT * FROM spas WHERE id = ?').get(req.params.id);
    if (!spa) return res.status(404).json({ error: 'Spa not found' });

    if (req.body.team) {
      // Full team replace
      db.prepare('DELETE FROM spa_team_members WHERE spa_id = ?').run(req.params.id);
      const insert = db.prepare('INSERT INTO spa_team_members (spa_id, department, user_id) VALUES (?, ?, ?)');
      for (const [dept, userIds] of Object.entries(req.body.team)) {
        for (const userId of userIds) {
          insert.run(req.params.id, dept, userId);
        }
      }
    } else if (req.body.department && req.body.userIds) {
      // Single department replace
      db.prepare('DELETE FROM spa_team_members WHERE spa_id = ? AND department = ?').run(req.params.id, req.body.department);
      const insert = db.prepare('INSERT INTO spa_team_members (spa_id, department, user_id) VALUES (?, ?, ?)');
      for (const userId of req.body.userIds) {
        insert.run(req.params.id, req.body.department, userId);
      }
    }

    res.json(buildSpaResponse(db, spa));
  } catch (err) {
    console.error('Update spa team error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/spas/:id/promos
 */
router.post('/:id/promos', authenticate, (req, res) => {
  try {
    const db = getDb();
    const spa = db.prepare('SELECT * FROM spas WHERE id = ?').get(req.params.id);
    if (!spa) return res.status(404).json({ error: 'Spa not found' });

    const id = `p-${Date.now()}`;
    const { name, price, value_price, active } = req.body;
    db.prepare('INSERT INTO spa_promos (id, spa_id, name, price, value_price, active) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, req.params.id, name, price || null, value_price || null, active !== false ? 1 : 0);

    const promo = db.prepare('SELECT * FROM spa_promos WHERE id = ?').get(id);
    res.status(201).json({ ...promo, active: !!promo.active });
  } catch (err) {
    console.error('Create promo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/spas/:id/promos/:promoId
 */
router.patch('/:id/promos/:promoId', authenticate, (req, res) => {
  try {
    const db = getDb();
    const promo = db.prepare('SELECT * FROM spa_promos WHERE id = ? AND spa_id = ?').get(req.params.promoId, req.params.id);
    if (!promo) return res.status(404).json({ error: 'Promo not found' });

    const updates = [];
    const params = [];
    for (const field of ['name', 'price', 'value_price']) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }
    if (req.body.active !== undefined) {
      updates.push('active = ?');
      params.push(req.body.active ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(req.params.promoId);
      db.prepare(`UPDATE spa_promos SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM spa_promos WHERE id = ?').get(req.params.promoId);
    res.json({ ...updated, active: !!updated.active });
  } catch (err) {
    console.error('Update promo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/spas/:id/promos/:promoId
 */
router.delete('/:id/promos/:promoId', authenticate, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM spa_promos WHERE id = ? AND spa_id = ?').run(req.params.promoId, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Promo not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete promo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
