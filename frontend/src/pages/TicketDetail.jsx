import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchTicketById, toggleTaskStatus as apiToggleTask, addComment as apiAddComment, fetchTicketTypes, assignTask as apiAssignTask, updateTicket as apiUpdateTicket, deleteTicket as apiDeleteTicket, fetchSpaPromos } from '../utils/api-service';
import { DEPARTMENTS, DEPT_COLORS, TICKET_TYPE_COLORS } from '../utils/constants';
import PriorityBadge from '../components/common/PriorityBadge';
import ProgressBar from '../components/common/ProgressBar';
import EmployeeAssignDropdown from '../components/common/EmployeeAssignDropdown';
import { ArrowLeft, CheckCircle2, Circle, Clock, MessageSquare, Bell, Activity, Send, X, Loader2, Pencil, Trash2, Save, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, allUsers } = useAuth();
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  const [ticket, setTicket] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPromos, setEditPromos] = useState([]);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchTicketById(id),
      fetchTicketTypes(),
    ]).then(([t, types]) => {
      setTicket(t);
      setTicketTypes(types);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading && !ticket) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  if (!ticket) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Ticket not found.</p>
        <button onClick={() => navigate('/tickets')} className="btn-primary mt-4">Back to Tickets</button>
      </div>
    );
  }

  const toggleTask = async (taskId, currentStatus) => {
    await apiToggleTask(taskId, user.id);
    toast.success(currentStatus === 'Done' ? 'Task reopened' : 'Task completed!');
    refresh();
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await apiAddComment(ticket.id, comment, user.id);
    setComment('');
    toast.success('Comment added');
    refresh();
  };

  const handlePrimaryAssign = async (dept, taskId, userId) => {
    await apiAssignTask(taskId, userId, 'set');
    toast.success(userId ? 'Task reassigned' : 'Task unassigned');
    refresh();
  };

  const handleHelperChange = async (taskId, { action, userId }) => {
    await apiAssignTask(taskId, userId, action);
    const name = allUsers.find(u => u.id === userId)?.name || 'User';
    toast.success(action === 'add' ? `${name} added as helper` : `${name} removed`);
    refresh();
  };

  const handleRemoveAssignee = async (taskId, userId) => {
    await apiAssignTask(taskId, userId, 'remove');
    toast.success('Member removed');
    refresh();
  };

  const startEditing = async () => {
    setEditForm({
      treatment_name: ticket.treatment_name || '',
      priority: ticket.priority || 'Medium',
      target_audience: ticket.target_audience || '',
      due_date: ticket.due_date || '',
      start_ads_date: ticket.start_ads_date || '',
      first_booking_date: ticket.first_booking_date || '',
      domain: ticket.domain || '',
      additional_info: ticket.additional_info || '',
      promo_price: ticket.promo_price ?? '',
      value_price: ticket.value_price ?? '',
      promo_action: ticket.promo_action || '',
      linked_promo_id: ticket.linked_promo_id || '',
    });
    if (ticket.spa_id) {
      try { setEditPromos(await fetchSpaPromos(ticket.spa_id)); } catch { setEditPromos([]); }
    }
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await apiUpdateTicket(ticket.id, {
        treatment_name: editForm.treatment_name,
        priority: editForm.priority,
        target_audience: editForm.target_audience,
        due_date: editForm.due_date || null,
        start_ads_date: editForm.start_ads_date || null,
        first_booking_date: editForm.first_booking_date || null,
        domain: editForm.domain,
        additional_info: editForm.additional_info,
        promo_price: editForm.promo_price ? Number(editForm.promo_price) : null,
        value_price: editForm.value_price ? Number(editForm.value_price) : null,
        promo_action: editForm.promo_action || null,
        linked_promo_id: editForm.linked_promo_id || null,
      });
      toast.success('Ticket updated');
      setEditing(false);
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiDeleteTicket(ticket.id);
      toast.success('Ticket deleted');
      navigate('/tickets');
    } catch (err) {
      toast.error(err.message || 'Failed to delete ticket');
    }
  };

  const typeColor = TICKET_TYPE_COLORS[ticket.ticket_type] || '#6B7280';
  const tasksByDept = {};
  for (const dept of DEPARTMENTS) {
    tasksByDept[dept] = (ticket.tasks || []).filter(t => t.department === dept);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="card p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: typeColor }}>{ticket.ticket_type}</span>
              <PriorityBadge priority={ticket.priority} />
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                ticket.status === 'Done' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>{ticket.status}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {ticket.spa ? <Link to={`/spas/${ticket.spa_id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{ticket.spa.name}</Link> : 'No Spa'}
              {ticket.treatment_name && ` - ${ticket.treatment_name}`}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button onClick={startEditing} className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className="text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
              <p>Created by {ticket.creator?.name} on {format(new Date(ticket.created_at), 'MMM d, yyyy')}</p>
              {ticket.completed_at && <p className="text-green-600">Completed {format(new Date(ticket.completed_at), 'MMM d, yyyy')}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <ProgressBar progress={ticket.progress} />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{ticket.progress}%</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {ticket.promo_price && <Field label="Promo Price" value={`$${ticket.promo_price}`} />}
          {ticket.value_price && <Field label="Value Price" value={`$${ticket.value_price}`} />}
          <Field label="Target Audience" value={ticket.target_audience} />
          {ticket.due_date && <Field label="Due Date" value={format(new Date(ticket.due_date + 'T12:00:00'), 'MMM d, yyyy')} />}
          {ticket.start_ads_date && <Field label="Start Ads Date" value={format(new Date(ticket.start_ads_date + 'T12:00:00'), 'MMM d, yyyy')} />}
          {ticket.first_booking_date && <Field label="First Booking" value={format(new Date(ticket.first_booking_date + 'T12:00:00'), 'MMM d, yyyy')} />}
          {ticket.domain && <Field label="Domain" value={ticket.domain} />}
        </div>

        {ticket.additional_info && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Additional Information</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticket.additional_info}</p>
          </div>
        )}

        {(() => {
          const ticketType = ticketTypes.find(t => t.name === ticket.ticket_type);
          const cfValues = ticket.custom_field_values || {};
          const cfDefs = ticketType?.custom_fields || [];
          const filledFields = cfDefs.filter(f => cfValues[f.id] !== undefined && cfValues[f.id] !== '');
          if (filledFields.length === 0) return null;
          return (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Custom Fields</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {filledFields.map(f => (
                  <Field key={f.id} label={f.label} value={f.type === 'checkbox' ? (cfValues[f.id] ? 'Yes' : 'No') : String(cfValues[f.id])} />
                ))}
              </div>
            </div>
          );
        })()}

        {/* Promo Automation Status */}
        {ticket.promo_action && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Promo Automation</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                ticket.promo_action === 'create_promo' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                ticket.promo_action === 'update_promo' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {ticket.promo_action === 'create_promo' ? 'Create Promo' :
                 ticket.promo_action === 'update_promo' ? 'Update Promo' :
                 'Deactivate Promo'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {ticket.status === 'Done'
                  ? (ticket.linked_promo_id ? '✓ Executed' : 'Pending execution')
                  : 'Will execute when ticket is completed'}
              </span>
            </div>
            {ticket.linked_promo_id && ticket.spa?.promos && (() => {
              const linkedPromo = ticket.spa.promos.find(p => p.id === ticket.linked_promo_id);
              if (!linkedPromo) return null;
              return (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Linked promo:</span>
                  <span className={`font-medium ${linkedPromo.active ? 'text-gray-900 dark:text-white' : 'text-gray-400 line-through'}`}>
                    {linkedPromo.name}
                  </span>
                  <span className="text-xs text-gray-400">${linkedPromo.price} / ${linkedPromo.value_price}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${linkedPromo.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {linkedPromo.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'tasks', label: 'Department Tasks', icon: CheckCircle2 },
          { key: 'comments', label: 'Comments', icon: MessageSquare, count: ticket.comments?.length },
          { key: 'activity', label: 'Activity Log', icon: Activity },
          { key: 'notifications', label: 'Notifications', icon: Bell },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
            {tab.count > 0 && <span className="bg-gray-200 dark:bg-gray-700 text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEPARTMENTS.map(dept => {
            const tasks = tasksByDept[dept];
            const deptDone = tasks.length > 0 && tasks.every(t => t.status === 'Done');
            const deptColor = DEPT_COLORS[dept];
            const completedCount = tasks.filter(t => t.status === 'Done').length;
            const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
            const remainingMinutes = tasks.filter(t => t.status !== 'Done').reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
            return (
              <div key={dept} className="card overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderLeft: `4px solid ${deptColor.hex}` }}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${deptDone ? deptColor.dot : tasks.some(t => t.status !== 'Not Started') ? 'bg-yellow-400' : 'bg-gray-300'}`} />
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{dept}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {totalMinutes > 0 && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {remainingMinutes > 0 ? `${remainingMinutes}min left` : 'done'}
                        <span className="text-gray-300 dark:text-gray-600">/ {totalMinutes}min</span>
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">{completedCount}/{tasks.length}</span>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  {tasks.map(task => {
                    const assignedUsers = (task.assigned_to || [])
                      .map(uid => allUsers.find(u => u.id === uid))
                      .filter(Boolean);

                    return (
                      <div key={task.id} className="rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center gap-2 p-2">
                          <button type="button" onClick={() => toggleTask(task.id, task.status)} className="flex-shrink-0">
                            {task.status === 'Done' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-400" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{task.task_name}</span>
                              {task.estimated_minutes > 0 && (
                                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex-shrink-0">{task.estimated_minutes}min</span>
                              )}
                            </div>
                            {task.completer && <p className="text-xs text-gray-400 mt-0.5">Completed by {task.completer.name}</p>}
                          </div>
                          {task.status !== 'Done' && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {/* Primary assignee dropdown */}
                              <EmployeeAssignDropdown
                                department={dept}
                                currentAssignees={task.assigned_to || []}
                                taskMinutes={task.estimated_minutes || 0}
                                onChange={(userId) => handlePrimaryAssign(dept, task.id, userId)}
                              />
                              {/* Add helper button */}
                              <EmployeeAssignDropdown
                                department={dept}
                                currentAssignees={task.assigned_to || []}
                                taskMinutes={task.estimated_minutes || 0}
                                multiSelect
                                compact
                                onMultiChange={(change) => handleHelperChange(task.id, change)}
                              />
                            </div>
                          )}
                        </div>
                        {/* Show all assigned members when more than 1 */}
                        {assignedUsers.length > 1 && (
                          <div className="flex items-center gap-1.5 pl-9 pb-2 flex-wrap">
                            <span className="text-[10px] text-gray-400">Team:</span>
                            {assignedUsers.map(u => (
                              <span key={u.id} className="inline-flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                                <span className={`w-3 h-3 rounded-full ${DEPT_COLORS[u.department]?.dot || 'bg-gray-400'} flex items-center justify-center text-white text-[7px] font-bold`}>
                                  {u.name.charAt(0)}
                                </span>
                                {u.name}
                                {task.status !== 'Done' && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveAssignee(task.id, u.id); }}
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
                  {tasks.length === 0 && <p className="text-xs text-gray-400 p-2">No tasks</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="card p-6">
          <div className="space-y-4 mb-6">
            {(ticket.comments || []).map(c => (
              <div key={c.id} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full ${DEPT_COLORS[c.user?.department]?.dot || 'bg-gray-400'} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>{c.user?.name?.charAt(0)}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{c.user?.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{c.message}</p>
                </div>
              </div>
            ))}
            {(!ticket.comments || ticket.comments.length === 0) && <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>}
          </div>
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input type="text" value={comment} onChange={e => setComment(e.target.value)} className="input-field flex-1" placeholder="Add a comment..." />
            <button type="submit" disabled={!comment.trim()} className="btn-primary px-3"><Send className="w-4 h-4" /></button>
          </form>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="card p-6">
          <div className="space-y-3">
            {(ticket.activity || []).map(a => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{a.user?.name}</span>{' '}
                  <span className="text-gray-600 dark:text-gray-400">{a.action}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{format(new Date(a.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
            ))}
            {(!ticket.activity || ticket.activity.length === 0) && <p className="text-sm text-gray-400 text-center py-4">No activity recorded</p>}
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="card p-6">
          <p className="text-sm text-gray-400 text-center py-4">No notifications sent (demo mode)</p>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="card p-6 w-full max-w-lg my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Ticket</h3>
              <button onClick={() => setEditing(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Treatment Name</label>
                <input value={editForm.treatment_name} onChange={e => setEditForm(f => ({ ...f, treatment_name: e.target.value }))} className="input-field" placeholder="Treatment name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))} className="input-field">
                  <option value="Immediate">Immediate</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
                <input value={editForm.target_audience} onChange={e => setEditForm(f => ({ ...f, target_audience: e.target.value }))} className="input-field" placeholder="e.g., Women 25-45" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Promo Price ($)</label>
                  <input type="number" value={editForm.promo_price} onChange={e => setEditForm(f => ({ ...f, promo_price: e.target.value }))} className="input-field" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value Price ($)</label>
                  <input type="number" value={editForm.value_price} onChange={e => setEditForm(f => ({ ...f, value_price: e.target.value }))} className="input-field" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                  <input type="date" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Ads Date</label>
                  <input type="date" value={editForm.start_ads_date} onChange={e => setEditForm(f => ({ ...f, start_ads_date: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Booking Date</label>
                  <input type="date" value={editForm.first_booking_date} onChange={e => setEditForm(f => ({ ...f, first_booking_date: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domain</label>
                  <input value={editForm.domain} onChange={e => setEditForm(f => ({ ...f, domain: e.target.value }))} className="input-field" placeholder="example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Info</label>
                <textarea value={editForm.additional_info} onChange={e => setEditForm(f => ({ ...f, additional_info: e.target.value }))} className="input-field min-h-[80px] resize-y" placeholder="Notes..." />
              </div>
              {/* Promo Automation in Edit Modal */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" /> Promo Automation
                </label>
                <select
                  value={editForm.promo_action}
                  onChange={e => setEditForm(f => ({ ...f, promo_action: e.target.value, linked_promo_id: e.target.value === 'create_promo' ? '' : f.linked_promo_id }))}
                  className="input-field mb-2"
                >
                  <option value="">No automation</option>
                  <option value="create_promo">Create new promo</option>
                  {editPromos.length > 0 && <option value="update_promo">Update existing promo</option>}
                  {editPromos.length > 0 && <option value="deactivate_promo">Deactivate existing promo</option>}
                </select>
                {(editForm.promo_action === 'update_promo' || editForm.promo_action === 'deactivate_promo') && (
                  <select
                    value={editForm.linked_promo_id}
                    onChange={e => setEditForm(f => ({ ...f, linked_promo_id: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Choose a promo...</option>
                    {editPromos.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — ${p.price} {p.active ? '(Active)' : '(Inactive)'}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Ticket?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will permanently delete this ticket and all its tasks, comments, and activity. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-gray-900 dark:text-white font-medium">{value}</p>
    </div>
  );
}
