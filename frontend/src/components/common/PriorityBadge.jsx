import { PRIORITY_COLORS } from '../../utils/constants';

export default function PriorityBadge({ priority }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium}`}>
      {priority === 'Immediate' && '⚡ '}{priority}
    </span>
  );
}
