const EFFECTIVE_MINUTES_PER_DAY = 420; // 8h - 1h break = 7h = 420min

/**
 * Get total minutes of open (non-Done) tasks assigned to a user
 */
function getEmployeeWorkload(db, userId) {
  const result = db.prepare(`
    SELECT COALESCE(SUM(t.estimated_minutes), 0) as total
    FROM task_assignments ta
    JOIN tasks t ON t.id = ta.task_id
    WHERE ta.user_id = ? AND t.status != 'Done'
  `).get(userId);
  return result.total;
}

/**
 * Get workload info for all employees in a department
 */
function getEmployeesWorkload(db, department) {
  const users = db.prepare(
    'SELECT * FROM users WHERE department = ? AND is_active = 1'
  ).all(department);

  const result = {};
  for (const user of users) {
    const totalMinutes = getEmployeeWorkload(db, user.id);
    const tasks = db.prepare(`
      SELECT t.*, tk.ticket_type, s.name as spa_name
      FROM task_assignments ta
      JOIN tasks t ON t.id = ta.task_id
      JOIN tickets tk ON tk.id = t.ticket_id
      LEFT JOIN spas s ON s.id = tk.spa_id
      WHERE ta.user_id = ? AND t.status != 'Done'
    `).all(user.id);

    result[user.id] = { user, totalMinutes, tasks };
  }
  return result;
}

/**
 * Find the employee in a department with the least workload
 */
function getLeastLoadedEmployee(db, department) {
  const users = db.prepare(
    'SELECT * FROM users WHERE department = ? AND is_active = 1'
  ).all(department);

  if (users.length === 0) return null;

  let best = null;
  let bestLoad = Infinity;
  for (const user of users) {
    const load = getEmployeeWorkload(db, user.id);
    if (load < bestLoad) {
      bestLoad = load;
      best = user;
    }
  }
  return best;
}

/**
 * Find least loaded employee, preferring spa's assigned team members
 */
function getSpaAwareAssignee(db, department, spaId) {
  if (spaId) {
    const teamMembers = db.prepare(`
      SELECT u.* FROM spa_team_members stm
      JOIN users u ON u.id = stm.user_id
      WHERE stm.spa_id = ? AND stm.department = ? AND u.is_active = 1
    `).all(spaId, department);

    if (teamMembers.length > 0) {
      let best = null;
      let bestLoad = Infinity;
      for (const user of teamMembers) {
        const load = getEmployeeWorkload(db, user.id);
        if (load < bestLoad) {
          bestLoad = load;
          best = user;
        }
      }
      return best;
    }
  }
  // Fall back to whole department
  return getLeastLoadedEmployee(db, department);
}

module.exports = {
  EFFECTIVE_MINUTES_PER_DAY,
  getEmployeeWorkload,
  getEmployeesWorkload,
  getLeastLoadedEmployee,
  getSpaAwareAssignee,
};
