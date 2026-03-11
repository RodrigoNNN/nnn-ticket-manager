import { useAuth } from '../../context/AuthContext';
import { DEPARTMENTS, DEPT_COLORS } from '../../utils/constants';
import { Users } from 'lucide-react';

export default function SpaTeamBadges({ assignedTeam = {}, compact = false, maxShow = 6 }) {
  const { allUsers } = useAuth();
  // Flatten all assigned user IDs with their department info
  const allAssigned = [];
  for (const dept of DEPARTMENTS) {
    for (const uid of (assignedTeam[dept] || [])) {
      const user = (allUsers || []).find(u => u.id === uid);
      if (user) allAssigned.push({ ...user, dept });
    }
  }

  if (allAssigned.length === 0) {
    return compact ? null : (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic flex items-center gap-1.5">
        <Users className="w-4 h-4" /> No team assigned
      </p>
    );
  }

  // Compact mode: overlapping avatar circles
  if (compact) {
    const shown = allAssigned.slice(0, maxShow);
    const extra = allAssigned.length - maxShow;
    return (
      <div className="flex items-center">
        <div className="flex -space-x-1.5">
          {shown.map(u => (
            <div
              key={u.id}
              title={`${u.name} (${u.dept})`}
              className={`w-5 h-5 rounded-full ${DEPT_COLORS[u.dept]?.dot} flex items-center justify-center text-white text-[8px] font-bold border-2 border-white dark:border-gray-800`}
            >
              {u.name.charAt(0)}
            </div>
          ))}
        </div>
        {extra > 0 && (
          <span className="text-[10px] text-gray-400 ml-1.5">+{extra}</span>
        )}
      </div>
    );
  }

  // Full mode: grouped by department with names
  return (
    <div className="space-y-3">
      {DEPARTMENTS.map(dept => {
        const members = (assignedTeam[dept] || [])
          .map(uid => (allUsers || []).find(u => u.id === uid))
          .filter(Boolean);
        if (members.length === 0) return null;
        return (
          <div key={dept}>
            <p className="text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: DEPT_COLORS[dept]?.hex }}>
              {dept}
            </p>
            <div className="flex flex-wrap gap-2">
              {members.map(u => (
                <div key={u.id} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-full px-2.5 py-1">
                  <div className={`w-5 h-5 rounded-full ${DEPT_COLORS[dept]?.dot} flex items-center justify-center text-white text-[8px] font-bold`}>
                    {u.name.charAt(0)}
                  </div>
                  {u.name}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
