import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMyTasks, toggleTaskStatus as apiToggleTask, assignTask as apiAssignTask, fetchWeeklyWorkload, rescheduleTask } from '../utils/api-service';
import DepartmentDots from '../components/common/DepartmentDots';
import PriorityBadge from '../components/common/PriorityBadge';
import WeekStrip from '../components/common/WeekStrip';
import EmployeeAssignDropdown from '../components/common/EmployeeAssignDropdown';
import { TICKET_TYPE_COLORS, DEPT_COLORS } from '../utils/constants';
import { CheckCircle2, Circle, Clock, AlertTriangle, UserPlus, X, Loader2 } from 'lucide-react';
import { format, isPast, isToday, startOfWeek, addDays, subDays, getDay, isWeekend } from 'date-fns';
import toast from 'react-hot-toast';

// On weekends (Sat/Sun), default to showing next week since the current work week is over
function getInitialWeekOffset() {
  const today = new Date();
  return isWeekend(today) ? 1 : 0;
}

// Default selected day: on weekdays → today, on weekends → Monday of next week
function getInitialSelectedDate() {
  const today = new Date();
  if (isWeekend(today)) {
    const nextMon = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
    return format(nextMon, 'yyyy-MM-dd');
  }
  return format(today, 'yyyy-MM-dd');
}

export default function MyTasks() {
  const { user, allUsers } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState({});
  const [selectedDate, setSelectedDate] = useState(getInitialSelectedDate);
  const [weekOffset, setWeekOffset] = useState(getInitialWeekOffset);

  // Compute the Mon–Fri dates for the current week offset
  const weekDays = useMemo(() => {
    const today = new Date();
    const base = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 5 }, (_, i) => format(addDays(base, i), 'yyyy-MM-dd'));
  }, [weekOffset]);

  const refresh = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchMyTasks(user.id),
      fetchWeeklyWorkload(user.id, weekDays[0], weekDays[4]),
    ]).then(([data, wl]) => {
      setTickets(data);
      setWeekData(wl);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, weekDays]);

  useEffect(() => { refresh(); }, [refresh]);

  // Filter tasks where the current user is in the assigned_to array
  const taskGroups = tickets
    .filter(t => t.tasks.some(task => (task.assigned_to || []).includes(user.id)))
    .map(ticket => ({
      ticket,
      departmentStatus: ticket.departmentStatus,
      tasks: ticket.tasks.filter(task => {
        if (!(task.assigned_to || []).includes(user.id)) return false;
        // Day filter: if a day is selected, show tasks for that day + unscheduled tasks
        if (selectedDate) {
          const userDate = task.scheduled_dates?.[user.id];
          return userDate === selectedDate || !userDate;
        }
        return true;
      }),
    }))
    .filter(g => g.tasks.length > 0);

  // Optimistic task toggle — instantly updates UI, API runs in background
  const toggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'Done' ? 'Not Started' : 'Done';

    // 1. Optimistic update: patch local state immediately
    setTickets(prev => prev.map(ticket => ({
      ...ticket,
      tasks: ticket.tasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ),
    })));

    // Also optimistically update weekData (adjust minutes for the scheduled day or unscheduled)
    const targetTask = tickets.flatMap(t => t.tasks).find(t => t.id === taskId);
    if (targetTask?.estimated_minutes) {
      const schedDay = targetTask.scheduled_dates?.[user.id];
      const key = schedDay || '_unscheduled';
      const delta = newStatus === 'Done' ? -targetTask.estimated_minutes : targetTask.estimated_minutes;
      setWeekData(prev => ({
        ...prev,
        [key]: Math.max(0, (prev[key] || 0) + delta),
      }));
    }

    toast.success(newStatus === 'Done' ? 'Task completed!' : 'Task reopened');

    // 2. Fire API in background — on failure, revert and re-fetch
    try {
      await apiToggleTask(taskId, user.id);
      // Silent background refresh to sync server-computed values (ticket status, etc.)
      Promise.all([
        fetchMyTasks(user.id),
        fetchWeeklyWorkload(user.id, weekDays[0], weekDays[4]),
      ]).then(([data, wl]) => {
        setTickets(data);
        setWeekData(wl);
      });
    } catch {
      toast.error('Failed to update task — reverting');
      refresh();
    }
  };

  const handleAddHelper = async (ticketId, taskId, { action, userId }) => {
    await apiAssignTask(taskId, userId, action);
    const helperName = allUsers.find(u => u.id === userId)?.name || 'User';
    toast.success(action === 'add' ? `${helperName} added as helper` : `${helperName} removed`);
    refresh();
  };

  const handleRemoveHelper = async (ticketId, taskId, userId) => {
    await apiAssignTask(taskId, userId, 'remove');
    toast.success('Helper removed');
    refresh();
  };

  const handleReschedule = async (taskId, newDate) => {
    await rescheduleTask(taskId, user.id, newDate);
    const dayLabel = format(new Date(newDate + 'T12:00:00'), 'EEE');
    toast.success(`Moved to ${dayLabel}`);
    refresh();
  };

  if (loading && tickets.length === 0) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  // Sort by priority
  const priorityOrder = { Immediate: 0, High: 1, Medium: 2 };
  const sorted = [...taskGroups].sort((a, b) => {
    const pa = priorityOrder[a.ticket?.priority] ?? 3;
    const pb = priorityOrder[b.ticket?.priority] ?? 3;
    if (pa !== pb) return pa - pb;
    const da = a.ticket?.due_date || '9999-12-31';
    const db = b.ticket?.due_date || '9999-12-31';
    return da.localeCompare(db);
  });

  const pendingGroups = sorted.filter(g => g.tasks.some(t => t.status !== 'Done'));
  const completedGroups = sorted.filter(g => g.tasks.every(t => t.status === 'Done'));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user?.name} &middot; {user?.department} Department</p>
      </div>

      {/* Weekly workload strip */}
      <WeekStrip
        weekDays={weekDays}
        weekData={weekData}
        selectedDate={selectedDate}
        onDaySelect={setSelectedDate}
        onPrevWeek={() => setWeekOffset(o => o - 1)}
        onNextWeek={() => setWeekOffset(o => o + 1)}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 mt-4">
        <StatCard label="Total Tasks" value={taskGroups.reduce((sum, g) => sum + g.tasks.length, 0)} />
        <StatCard label="Pending" value={taskGroups.reduce((sum, g) => sum + g.tasks.filter(t => t.status !== 'Done').length, 0)} color="text-yellow-600" />
        <StatCard label="Completed" value={taskGroups.reduce((sum, g) => sum + g.tasks.filter(t => t.status === 'Done').length, 0)} color="text-green-600" />
        <StatCard label="Overdue Tickets" value={pendingGroups.filter(g => g.ticket?.due_date && isPast(new Date(g.ticket.due_date + 'T23:59:59'))).length} color="text-red-600" />
      </div>

      {pendingGroups.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active ({pendingGroups.length})</h2>
          <div className="space-y-4">
            {pendingGroups.map(group => (
              <TaskGroup
                key={group.ticket?.id}
                group={group}
                currentUserId={user.id}
                allUsers={allUsers}
                onToggle={toggleTask}
                onNavigate={() => navigate(`/tickets/${group.ticket?.id}`)}
                onAddHelper={handleAddHelper}
                onRemoveHelper={handleRemoveHelper}
                weekDays={weekDays}
                onReschedule={handleReschedule}
                showDayLabel={!selectedDate}
              />
            ))}
          </div>
        </div>
      )}

      {completedGroups.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-4">Completed ({completedGroups.length})</h2>
          <div className="space-y-4 opacity-60">
            {completedGroups.map(group => (
              <TaskGroup
                key={group.ticket?.id}
                group={group}
                currentUserId={user.id}
                allUsers={allUsers}
                onToggle={toggleTask}
                onNavigate={() => navigate(`/tickets/${group.ticket?.id}`)}
                onAddHelper={handleAddHelper}
                onRemoveHelper={handleRemoveHelper}
                weekDays={weekDays}
                onReschedule={handleReschedule}
                showDayLabel={!selectedDate}
              />
            ))}
          </div>
        </div>
      )}

      {taskGroups.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No tasks assigned to you right now.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'text-gray-900 dark:text-white' }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function TaskGroup({ group, currentUserId, allUsers, onToggle, onNavigate, onAddHelper, onRemoveHelper, weekDays = [], onReschedule, showDayLabel }) {
  const { ticket, tasks, departmentStatus } = group;
  const overdue = ticket?.due_date && isPast(new Date(ticket.due_date + 'T23:59:59')) && ticket.status !== 'Done';
  const dueToday = ticket?.due_date && isToday(new Date(ticket.due_date + 'T12:00:00'));
  const typeColor = TICKET_TYPE_COLORS[ticket?.ticket_type] || '#6B7280';

  return (
    <div className="card overflow-hidden">
      <div className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors border-b border-gray-100 dark:border-gray-700" onClick={onNavigate}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: typeColor }}>{ticket?.ticket_type}</span>
            <PriorityBadge priority={ticket?.priority} />
          </div>
          <DepartmentDots departmentStatus={departmentStatus} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {ticket?.spa ? <Link to={`/spas/${ticket.spa_id}`} onClick={e => e.stopPropagation()} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{ticket.spa.name}</Link> : 'No Spa'}
            {ticket?.treatment_name && ` - ${ticket.treatment_name}`}
          </h3>
          {ticket?.due_date && (
            <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-500' : dueToday ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {overdue && <AlertTriangle className="w-3 h-3" />}
              {dueToday && <Clock className="w-3 h-3" />}
              {format(new Date(ticket.due_date + 'T12:00:00'), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>
      <div className="p-4 space-y-2">
        {tasks.map(task => {
          const assignedUsers = (task.assigned_to || [])
            .map(uid => allUsers.find(u => u.id === uid))
            .filter(Boolean);
          const otherAssigned = assignedUsers.filter(u => u.id !== currentUserId);
          const deptColor = DEPT_COLORS[task.department];

          return (
            <div key={task.id} className="rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center gap-3 p-2">
                <button type="button" onClick={() => onToggle(task.id, task.status)} className="flex-shrink-0 transition-transform active:scale-90">
                  {task.status === 'Done'
                    ? <CheckCircle2 className="w-5 h-5 text-green-500 transition-colors duration-150" />
                    : <Circle className="w-5 h-5 text-gray-400 hover:text-green-400 transition-colors duration-150" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Department badge */}
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded text-white flex-shrink-0"
                      style={{ backgroundColor: deptColor?.hex || '#6B7280' }}
                    >
                      {task.department}
                    </span>
                    <span className={`text-sm ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {task.task_name}
                    </span>
                    {task.estimated_minutes > 0 && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex-shrink-0">{task.estimated_minutes}min</span>
                    )}
                    {/* Show scheduled day label when viewing all, or unscheduled badge */}
                    {showDayLabel && task.scheduled_dates?.[currentUserId] && (
                      <span className="text-[9px] font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded flex-shrink-0">
                        {format(new Date(task.scheduled_dates[currentUserId] + 'T12:00:00'), 'EEE')}
                      </span>
                    )}
                    {!task.scheduled_dates?.[currentUserId] && task.status !== 'Done' && (
                      <span className="text-[9px] font-medium text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded flex-shrink-0">
                        Unscheduled
                      </span>
                    )}
                  </div>
                  {/* Day reschedule pills for pending tasks */}
                  {task.status !== 'Done' && weekDays.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {weekDays.map(day => {
                        const d = new Date(day + 'T12:00:00');
                        const isCurrentDay = task.scheduled_dates?.[currentUserId] === day;
                        return (
                          <button
                            key={day}
                            onClick={(e) => { e.stopPropagation(); if (!isCurrentDay) onReschedule(task.id, day); }}
                            className={`text-[8px] w-5 h-4 rounded flex items-center justify-center transition-colors ${
                              isCurrentDay
                                ? 'bg-blue-500 text-white font-bold'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-500'
                            }`}
                            title={format(d, 'EEEE, MMM d')}
                          >
                            {format(d, 'EEEEE')}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Add helper button for pending tasks */}
                {task.status !== 'Done' && (
                  <EmployeeAssignDropdown
                    department={task.department}
                    currentAssignees={task.assigned_to || []}
                    taskMinutes={task.estimated_minutes || 0}
                    multiSelect
                    compact
                    onMultiChange={(change) => onAddHelper(ticket.id, task.id, change)}
                  />
                )}
              </div>
              {/* Show other assigned helpers */}
              {otherAssigned.length > 0 && (
                <div className="flex items-center gap-1.5 pl-10 pb-2 flex-wrap">
                  <span className="text-[10px] text-gray-400">Also assigned:</span>
                  {otherAssigned.map(u => (
                    <span key={u.id} className="inline-flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                      {u.name}
                      {task.status !== 'Done' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onRemoveHelper(ticket.id, task.id, u.id); }}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
