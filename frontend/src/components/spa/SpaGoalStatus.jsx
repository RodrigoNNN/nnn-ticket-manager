import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Compact goal progress bar for spa cards
 * Shows: current arrivals / target with color-coded bar
 */
export default function SpaGoalStatus({ arrivals = 0, goalMin, goalTarget }) {
  if (!goalMin && !goalTarget) return null;

  const target = goalTarget || goalMin || 1;
  const min = goalMin || target;
  const pct = Math.min(Math.round((arrivals / target) * 100), 100);
  const pctOfMin = min > 0 ? (arrivals / min) * 100 : 0;

  // Status: red (below min), amber (between min and target), green (at or above target)
  let status = 'red';
  let barColor = 'bg-red-500';
  let textColor = 'text-red-600 dark:text-red-400';
  let StatusIcon = TrendingDown;

  if (arrivals >= target) {
    status = 'green';
    barColor = 'bg-green-500';
    textColor = 'text-green-600 dark:text-green-400';
    StatusIcon = TrendingUp;
  } else if (arrivals >= min) {
    status = 'amber';
    barColor = 'bg-amber-500';
    textColor = 'text-amber-600 dark:text-amber-400';
    StatusIcon = Minus;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Arrivals</span>
        <div className="flex items-center gap-1">
          <StatusIcon className={`w-3 h-3 ${textColor}`} />
          <span className={`text-xs font-bold ${textColor}`}>{arrivals}</span>
          <span className="text-[10px] text-gray-400">/ {target}</span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="relative h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        {/* Min marker */}
        {goalMin && goalTarget && goalMin < goalTarget && (
          <div
            className="absolute top-0 bottom-0 w-px bg-gray-400 dark:bg-gray-500 z-10"
            style={{ left: `${Math.round((goalMin / goalTarget) * 100)}%` }}
          />
        )}
        {/* Fill */}
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Legend */}
      {goalMin && goalTarget && goalMin < goalTarget && (
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-gray-400">0</span>
          <span className="text-[9px] text-gray-400">min {goalMin}</span>
          <span className="text-[9px] text-gray-400">target {goalTarget}</span>
        </div>
      )}
    </div>
  );
}
