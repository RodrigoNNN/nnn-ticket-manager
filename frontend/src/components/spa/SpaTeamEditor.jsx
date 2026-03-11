import { useAuth } from '../../context/AuthContext';
import { DEPARTMENTS, DEPT_COLORS } from '../../utils/constants';
import { Check } from 'lucide-react';

export default function SpaTeamEditor({ value = {}, onChange }) {
  const { allUsers } = useAuth();
  const toggle = (dept, userId) => {
    const current = value[dept] || [];
    const updated = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId];
    onChange({ ...value, [dept]: updated });
  };

  const selectAll = (dept, deptUsers) => {
    const allIds = deptUsers.map(u => u.id);
    onChange({ ...value, [dept]: allIds });
  };

  const clearAll = (dept) => {
    onChange({ ...value, [dept]: [] });
  };

  return (
    <div className="space-y-3">
      {DEPARTMENTS.map(dept => {
        const deptUsers = (allUsers || []).filter(u => u.department === dept && u.is_active);
        const assigned = value[dept] || [];
        const allSelected = assigned.length === deptUsers.length;

        return (
          <div
            key={dept}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
            style={{ borderLeftWidth: '4px', borderLeftColor: DEPT_COLORS[dept]?.hex }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold" style={{ color: DEPT_COLORS[dept]?.hex }}>
                {dept}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => allSelected ? clearAll(dept) : selectAll(dept, deptUsers)}
                  className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
                <span className="text-xs text-gray-400">
                  {assigned.length}/{deptUsers.length}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {deptUsers.map(user => {
                const selected = assigned.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggle(dept, user.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? 'border-transparent text-white shadow-sm'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    style={selected ? { backgroundColor: DEPT_COLORS[dept]?.hex } : {}}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${
                        selected ? 'bg-white/20 text-white' : `${DEPT_COLORS[dept]?.dot} text-white`
                      }`}
                    >
                      {user.name.charAt(0)}
                    </div>
                    {user.name}
                    {selected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
