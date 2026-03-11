import { DEPARTMENTS, DEPT_COLORS } from '../../utils/constants';

export default function DepartmentDots({ departmentStatus = {} }) {
  return (
    <div className="flex items-center gap-1.5">
      {DEPARTMENTS.map(dept => {
        const status = departmentStatus[dept] || 'Not Started';
        let colorClass = 'bg-gray-300 dark:bg-gray-600'; // Not Started
        if (status === 'In Progress') colorClass = 'bg-yellow-400';
        else if (status === 'Done') colorClass = DEPT_COLORS[dept].dot;

        return (
          <div key={dept} className="group relative">
            <div className={`w-3 h-3 rounded-full ${colorClass} transition-colors`} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              {dept}: {status}
            </div>
          </div>
        );
      })}
    </div>
  );
}
