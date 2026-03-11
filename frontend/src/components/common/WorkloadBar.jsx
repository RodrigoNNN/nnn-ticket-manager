import { EFFECTIVE_MINUTES_PER_DAY } from '../../utils/constants';

/**
 * Reusable capacity bar showing workload as a percentage of daily capacity.
 * Props:
 *   usedMinutes — total minutes of open tasks
 *   totalMinutes — daily capacity (default: 420 = 7 hours)
 *   size — 'sm' | 'md' | 'lg' (default: 'md')
 *   showLabel — whether to show the text label (default: true)
 *   compact — if true, show minimal inline version
 */
export default function WorkloadBar({
  usedMinutes = 0,
  totalMinutes = EFFECTIVE_MINUTES_PER_DAY,
  size = 'md',
  showLabel = true,
  compact = false,
}) {
  const pct = totalMinutes > 0 ? Math.round((usedMinutes / totalMinutes) * 100) : 0;
  const clampedPct = Math.min(pct, 100);

  // Color coding: green < 80%, yellow 80-100%, red > 100%
  const barColor =
    pct > 100 ? 'bg-red-500' :
    pct >= 80 ? 'bg-yellow-500' :
    'bg-green-500';

  const textColor =
    pct > 100 ? 'text-red-600 dark:text-red-400' :
    pct >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
    'text-green-600 dark:text-green-400';

  const formatTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };
  const barHeight = heights[size] || heights.md;

  if (compact) {
    return (
      <span className={`text-xs font-medium ${textColor}`}>
        {formatTime(usedMinutes)}/{formatTime(totalMinutes)} ({pct}%)
      </span>
    );
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(usedMinutes)} / {formatTime(totalMinutes)}
          </span>
          <span className={`text-xs font-semibold ${textColor}`}>{pct}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${barHeight} overflow-hidden`}>
        <div
          className={`${barHeight} ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
    </div>
  );
}

/** Small inline capacity indicator (pill badge) */
export function CapacityBadge({ usedMinutes = 0, totalMinutes = EFFECTIVE_MINUTES_PER_DAY }) {
  const pct = totalMinutes > 0 ? Math.round((usedMinutes / totalMinutes) * 100) : 0;
  const bg =
    pct > 100 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
    pct >= 80 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${bg}`}>
      {pct}%
    </span>
  );
}
