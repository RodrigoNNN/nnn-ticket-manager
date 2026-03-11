import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchEmployeeWorkload } from '../../utils/api-service';
import { EFFECTIVE_MINUTES_PER_DAY, DEPT_COLORS } from '../../utils/constants';
import { AlertTriangle, ChevronDown, UserCircle2, UserPlus, Check } from 'lucide-react';

/**
 * Dropdown to assign a task to employee(s) within a department.
 * Uses a portal so it is never clipped by overflow-hidden parents.
 *
 * Props:
 *   department — filter employees by department
 *   currentAssignees — array of currently assigned user IDs (preferred)
 *   currentAssignee — single current assigned user ID (legacy fallback)
 *   onChange(userId) — called when an employee is selected (single-select mode)
 *   onMultiChange({ action, userId }) — called in multi-select mode ('add' or 'remove')
 *   taskMinutes — estimated minutes for the task being assigned (to preview impact)
 *   multiSelect — if true, allows multiple selections with checkboxes
 *   compact — if true, shows a smaller "+" button instead of full dropdown trigger
 */
export default function EmployeeAssignDropdown({
  department,
  currentAssignees,
  currentAssignee,
  onChange,
  onMultiChange,
  taskMinutes = 0,
  multiSelect = false,
  compact = false,
}) {
  const { allUsers } = useAuth();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [workloads, setWorkloads] = useState({});

  // Normalize to array
  const assignedIds = currentAssignees || (currentAssignee ? [currentAssignee] : []);

  const deptUsers = (allUsers || []).filter(u => u.department === department && u.is_active);
  const primaryUser = deptUsers.find(u => u.id === assignedIds[0]);

  // Load workloads when dropdown opens
  useEffect(() => {
    if (!open || deptUsers.length === 0) return;
    let cancelled = false;
    Promise.all(deptUsers.map(u => fetchEmployeeWorkload(u.id).then(wl => [u.id, wl])))
      .then(results => { if (!cancelled) setWorkloads(Object.fromEntries(results)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, department, allUsers]);

  // Recalculate position when opened
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 272; // w-68 ≈ 272px
    let left = rect.right - dropdownWidth;
    if (left < 8) left = 8;
    // If dropdown would go off-screen right, adjust
    if (left + dropdownWidth > window.innerWidth - 8) {
      left = window.innerWidth - dropdownWidth - 8;
    }
    let top = rect.bottom + 4;
    // If dropdown would go below viewport, open upward
    const dropdownMaxHeight = 280;
    if (top + dropdownMaxHeight > window.innerHeight) {
      top = rect.top - dropdownMaxHeight - 4;
      if (top < 8) top = 8;
    }
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const formatTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const handleSelect = (userId) => {
    if (multiSelect) {
      const isSelected = assignedIds.includes(userId);
      if (onMultiChange) {
        onMultiChange({ action: isSelected ? 'remove' : 'add', userId });
      }
    } else {
      if (onChange) onChange(userId);
      setOpen(false);
    }
  };

  const handleUnassign = () => {
    if (onChange) onChange(null);
    setOpen(false);
  };

  // ─── Dropdown panel (rendered via portal) ───
  const dropdownPanel = open ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed w-68 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-2xl"
      style={{ top: pos.top, left: pos.left, zIndex: 9999, width: 272 }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 rounded-t-lg">
        <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
          {multiSelect ? `${department} — Add Helpers` : `${department} Team`}
        </p>
      </div>

      <div className="max-h-52 overflow-y-auto">
        {/* Unassign option — only in single-select mode */}
        {!multiSelect && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleUnassign(); }}
            className={`w-full text-left px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-700 transition-colors ${assignedIds.length === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
          >
            <UserCircle2 className="w-5 h-5 text-gray-300 dark:text-gray-500" />
            <span className="text-gray-400 dark:text-gray-500 italic">Unassigned</span>
          </button>
        )}

        {deptUsers.map(user => {
          const workload = workloads[user.id] || 0;
          const isSelected = assignedIds.includes(user.id);
          const previewLoad = isSelected ? workload : workload + taskMinutes;
          const pct = Math.round((previewLoad / EFFECTIVE_MINUTES_PER_DAY) * 100);
          const isOver = pct > 100;
          const isWarning = pct >= 80;

          return (
            <button
              key={user.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSelect(user.id); }}
              className={`w-full text-left px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-700 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              {multiSelect ? (
                <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700'}`} style={{ width: 18, height: 18 }}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              ) : (
                <div className={`w-6 h-6 rounded-full ${DEPT_COLORS[department]?.dot || 'bg-gray-400'} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate text-[13px]">{user.name}</span>
                  {isSelected && !multiSelect && <span className="text-[9px] text-blue-500 font-medium bg-blue-50 dark:bg-blue-900/30 px-1 rounded">current</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all ${isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold min-w-[32px] text-right ${isOver ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {formatTime(previewLoad)}
                  </span>
                </div>
              </div>
              {isOver && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {multiSelect && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex justify-end rounded-b-lg bg-gray-50 dark:bg-gray-750">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  // ─── Compact trigger (small "Help" button) ───
  if (compact) {
    return (
      <>
        <div ref={triggerRef} className="inline-block">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 text-gray-400 hover:text-blue-500 transition-colors"
          >
            <UserPlus className="w-3 h-3" />
            <span>Help</span>
          </button>
        </div>
        {dropdownPanel}
      </>
    );
  }

  // ─── Standard trigger ───
  const triggerContent = primaryUser ? (
    <>
      <div className={`w-4 h-4 rounded-full ${DEPT_COLORS[department]?.dot || 'bg-gray-400'} flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0`}>
        {primaryUser.name.charAt(0)}
      </div>
      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[80px]">{primaryUser.name}</span>
      {assignedIds.length > 1 && (
        <span className="text-[9px] text-blue-500 font-medium">+{assignedIds.length - 1}</span>
      )}
    </>
  ) : (
    <>
      <UserCircle2 className="w-3.5 h-3.5 text-gray-400" />
      <span className="text-gray-400">Assign</span>
    </>
  );

  return (
    <>
      <div ref={triggerRef}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors min-w-0"
        >
          {triggerContent}
          <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
        </button>
      </div>
      {dropdownPanel}
    </>
  );
}
