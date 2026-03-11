// AI Context Builder — gathers user tasks + workload, builds system prompt

import { fetchMyTasks, fetchWeeklyWorkload } from './api-service';
import { format, startOfWeek, addDays, isWeekend } from 'date-fns';

/**
 * Fetch current tasks and workload for the AI system prompt.
 */
export async function gatherAiContext(user) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Compute current work week Mon-Fri
  const weekStart = startOfWeek(
    isWeekend(today) ? addDays(today, 7) : today,
    { weekStartsOn: 1 }
  );
  const weekDays = Array.from({ length: 5 }, (_, i) =>
    format(addDays(weekStart, i), 'yyyy-MM-dd')
  );

  const [tickets, weekData] = await Promise.all([
    fetchMyTasks(user.id),
    fetchWeeklyWorkload(user.id, weekDays[0], weekDays[4]),
  ]);

  return { tickets, weekData, weekDays, todayStr };
}

/**
 * Build the system prompt with full task context.
 */
export function buildSystemPrompt(user, context) {
  const { tickets, weekData, weekDays, todayStr } = context;

  // Extract all tasks assigned to this user
  const allTasks = tickets.flatMap(ticket =>
    (ticket.tasks || [])
      .filter(task => (task.assigned_to || []).includes(user.id))
      .map(task => ({
        taskName: task.task_name,
        status: task.status,
        department: task.department,
        estimatedMinutes: task.estimated_minutes || 0,
        scheduledDate: task.scheduled_dates?.[user.id] || 'unscheduled',
        ticketType: ticket.ticket_type || 'General',
        spaName: ticket.spa?.name || 'N/A',
        priority: ticket.priority || 'Medium',
        dueDate: ticket.due_date || 'none',
      }))
  );

  // Today's tasks
  const todayTasks = allTasks.filter(t => t.scheduledDate === todayStr);
  const pendingToday = todayTasks.filter(t => t.status !== 'Done');
  const completedToday = todayTasks.filter(t => t.status === 'Done');

  // All pending tasks (across the week)
  const allPending = allTasks.filter(t => t.status !== 'Done');

  // Workload summary
  const workloadLines = weekDays.map(day => {
    const dayLabel = format(new Date(day + 'T12:00:00'), 'EEE MMM d');
    const minutes = weekData[day] || 0;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeStr = hours > 0 ? `${hours}h${mins > 0 ? mins + 'm' : ''}` : `${mins}m`;
    return `  ${dayLabel}: ${timeStr} used of 7h capacity`;
  });

  const formatTask = (t) =>
    `- [${t.status}] ${t.taskName} (${t.estimatedMinutes}min, ${t.priority} priority) — ${t.spaName}, scheduled: ${t.scheduledDate}, due: ${t.dueDate}`;

  return `You are a productivity assistant for ${user.name}, who works in the ${user.department} department at NNN (a spa/beauty business management company).

Today is ${format(new Date(), 'EEEE, MMMM d, yyyy')}.

== TODAY'S TASKS (${pendingToday.length} pending, ${completedToday.length} completed) ==
${pendingToday.length > 0
    ? pendingToday.map(formatTask).join('\n')
    : '  No pending tasks for today!'}
${completedToday.length > 0
    ? '\nCompleted today:\n' + completedToday.map(t => `- [Done] ${t.taskName}`).join('\n')
    : ''}

== WEEKLY WORKLOAD ==
${workloadLines.join('\n')}

== ALL PENDING TASKS (${allPending.length} total) ==
${allPending.slice(0, 30).map(formatTask).join('\n')}
${allPending.length > 30 ? `\n... and ${allPending.length - 30} more tasks` : ''}

== GUIDELINES ==
- Keep responses concise and actionable (max 2-3 paragraphs unless asked for detail).
- When planning the day, consider task priority (Immediate > High > Medium), estimated time, and due dates.
- The work day is 7 effective hours (420 minutes). Factor in breaks and context switching.
- Use bullet points and short lists. Avoid long paragraphs.
- When giving productivity tips, make them specific to the user's current workload.
- You can reference specific tasks and spas by name.
- Be encouraging but practical.`;
}
