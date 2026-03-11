import { EFFECTIVE_MINUTES_PER_DAY } from '../../utils/constants';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday } from 'date-fns';

/**
 * Compact week capacity strip (Mon–Fri).
 * Shows 5 mini columns with date, day abbreviation, hours, and a capacity bar.
 *
 * Props:
 *   weekDays — array of date strings ['2026-03-09', '2026-03-10', ...]
 *   weekData — { 'YYYY-MM-DD': totalMinutes, ... }
 *   selectedDate — currently selected date string or null (null = all)
 *   onDaySelect — (dateString | null) => void
 *   onPrevWeek / onNextWeek — navigation callbacks
 */
export default function WeekStrip({
  weekDays = [],
  weekData = {},
  selectedDate,
  onDaySelect,
  onPrevWeek,
  onNextWeek,
}) {
  const totalMinutes = EFFECTIVE_MINUTES_PER_DAY;

  const formatHours = (mins) => {
    if (mins === 0) return '0h';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h${m}m`;
  };

  // Compute week label e.g. "Mar 9 – 13, 2026"
  const weekLabel = weekDays.length >= 5
    ? (() => {
        const start = new Date(weekDays[0] + 'T12:00:00');
        const end = new Date(weekDays[4] + 'T12:00:00');
        const sameMonth = start.getMonth() === end.getMonth();
        return sameMonth
          ? `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`
          : `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
      })()
    : '';

  // Total week minutes
  const totalWeekMins = Object.values(weekData).reduce((s, v) => s + v, 0);

  return (
    <div className="card p-3">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Your Week</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{weekLabel}</span>
          {totalWeekMins > 0 && (
            <span className="text-[10px] font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
              {formatHours(totalWeekMins)} total
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedDate && (
            <button
              onClick={() => onDaySelect(null)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 mr-1"
            >
              All
            </button>
          )}
          <button onClick={onPrevWeek} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={onNextWeek} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Day columns */}
      <div className="flex gap-1.5">
        {weekDays.map(day => {
          const d = new Date(day + 'T12:00:00');
          const used = weekData[day] || 0;
          const pct = totalMinutes > 0 ? Math.round((used / totalMinutes) * 100) : 0;
          const clampedPct = Math.min(pct, 100);
          const today = isToday(d);
          const selected = selectedDate === day;

          const barColor =
            pct > 100 ? 'bg-red-500' :
            pct >= 80 ? 'bg-yellow-500' :
            pct > 0 ? 'bg-green-500' :
            'bg-gray-200 dark:bg-gray-600';

          const textColor =
            pct > 100 ? 'text-red-600 dark:text-red-400' :
            pct >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
            pct > 0 ? 'text-green-600 dark:text-green-400' :
            'text-gray-400 dark:text-gray-500';

          return (
            <button
              key={day}
              onClick={() => onDaySelect(selected ? null : day)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all ${
                selected
                  ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400'
                  : today
                    ? 'bg-gray-50 dark:bg-gray-700/50 ring-1 ring-blue-300 dark:ring-blue-600'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              {/* Date number on top */}
              <span className={`text-sm font-bold leading-none ${
                today ? 'text-blue-600 dark:text-blue-400' :
                selected ? 'text-blue-600 dark:text-blue-400' :
                'text-gray-700 dark:text-gray-200'
              }`}>
                {format(d, 'd')}
              </span>

              {/* Day abbreviation */}
              <span className={`text-[10px] font-medium uppercase tracking-wider ${
                today ? 'text-blue-500 dark:text-blue-400' :
                'text-gray-400 dark:text-gray-500'
              }`}>
                {format(d, 'EEE')}
              </span>

              {/* Capacity bar */}
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-0.5">
                <div
                  className={`h-1.5 ${barColor} rounded-full transition-all duration-300`}
                  style={{ width: pct > 0 ? `${clampedPct}%` : '0%' }}
                />
              </div>

              {/* Hours label */}
              <span className={`text-[10px] font-semibold leading-none ${textColor}`}>
                {formatHours(used)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
