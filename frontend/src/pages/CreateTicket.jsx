import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchSpas, fetchTicketTypes, createTicket as apiCreateTicket, fetchEmployeeWorkload, fetchSpaPromos } from '../utils/api-service';
import { DEPARTMENTS, DEPT_COLORS, EFFECTIVE_MINUTES_PER_DAY } from '../utils/constants';
import WorkloadBar from '../components/common/WorkloadBar';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, AlertTriangle, ChevronDown, ChevronUp, Loader2, Link2 } from 'lucide-react';

export default function CreateTicket() {
  const { user, allUsers } = useAuth();
  const [spas, setSpas] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [spaSearch, setSpaSearch] = useState('');
  const [showSpaDropdown, setShowSpaDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([fetchSpas(), fetchTicketTypes()])
      .then(([s, t]) => { setSpas(s); setTicketTypes(t.filter(tt => tt.is_active)); setPageLoading(false); })
      .catch(() => setPageLoading(false));
  }, []);

  const [form, setForm] = useState({
    ticket_type: '', spa_id: '', spa_name: '', treatment_name: '',
    promo_price: '', value_price: '', priority: 'Medium', target_audience: 'Both',
    due_date: '', start_ads_date: '', first_booking_date: '', domain: '', additional_info: '',
  });
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [spaPromos, setSpaPromos] = useState([]);
  const [promoAction, setPromoAction] = useState('');
  const [linkedPromoId, setLinkedPromoId] = useState('');

  // Load spa promos when spa is selected
  useEffect(() => {
    if (form.spa_id) {
      fetchSpaPromos(form.spa_id).then(setSpaPromos).catch(() => setSpaPromos([]));
    } else {
      setSpaPromos([]);
    }
    setPromoAction('');
    setLinkedPromoId('');
  }, [form.spa_id]);

  const isNewSpa = form.ticket_type === 'New Spa';
  const selectedType = ticketTypes.find(t => t.name === form.ticket_type);
  const customFields = selectedType?.custom_fields || [];
  const filteredSpas = spas.filter(s => s.name.toLowerCase().includes(spaSearch.toLowerCase()));
  const [showImpact, setShowImpact] = useState(false);

  // Calculate workload impact per department (async)
  const selectedSpa = spas.find(s => s.id === form.spa_id);
  const [workloadImpact, setWorkloadImpact] = useState(null);

  useEffect(() => {
    if (!selectedType) { setWorkloadImpact(null); return; }
    let cancelled = false;
    (async () => {
      const impact = {};
      for (const [dept, tasks] of Object.entries(selectedType.subtasks || {})) {
        const normalizedTasks = (tasks || []).map(t => typeof t === 'string' ? { name: t, estimated_minutes: 10 } : t);
        const deptTotal = normalizedTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
        const spaTeamIds = selectedSpa?.assigned_team?.[dept] || [];
        const hasSpaTeam = spaTeamIds.length > 0;
        const deptUsers = hasSpaTeam
          ? spaTeamIds.map(uid => allUsers.find(u => u.id === uid)).filter(u => u && u.is_active)
          : allUsers.filter(u => u.department === dept && u.is_active);
        const usersWithLoad = await Promise.all(deptUsers.map(async u => ({
          user: u,
          currentLoad: await fetchEmployeeWorkload(u.id),
        })));
        usersWithLoad.sort((a, b) => a.currentLoad - b.currentLoad);
        impact[dept] = { tasks: normalizedTasks, totalMinutes: deptTotal, employees: usersWithLoad, hasSpaTeam };
      }
      if (!cancelled) setWorkloadImpact(impact);
    })();
    return () => { cancelled = true; };
  }, [selectedType, selectedSpa, allUsers]);

  const updateCustomField = (fieldId, value) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleTypeChange = (e) => {
    const typeName = e.target.value;
    const type = ticketTypes.find(t => t.name === typeName);
    setForm(f => ({ ...f, ticket_type: typeName, ticket_type_id: type?.id || '' }));
    setCustomFieldValues({});
  };

  const selectSpa = (spa) => {
    setForm(f => ({ ...f, spa_id: spa.id, spa_name: spa.name }));
    setSpaSearch(spa.name);
    setShowSpaDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ticket_type) return toast.error('Please select a ticket type');
    if (!form.spa_id) return toast.error('Please select a client (spa)');
    for (const field of customFields) {
      if (field.required && !customFieldValues[field.id]) {
        return toast.error(`Please fill in "${field.label}"`);
      }
    }
    if ((promoAction === 'update_promo' || promoAction === 'deactivate_promo') && !linkedPromoId) {
      return toast.error('Please select a promo for the automation');
    }
    setLoading(true);
    try {
      const ticket = await apiCreateTicket({ ...form, custom_field_values: customFieldValues, promo_action: promoAction || null, linked_promo_id: linkedPromoId || null }, user.id);
      toast.success('Ticket created successfully!');
      setTimeout(() => navigate(`/tickets/${ticket.id}`), 300);
    } catch (err) {
      console.error('Create ticket error:', err);
      toast.error(err.message || 'Failed to create ticket');
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  if (pageLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Ticket</h1>
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ticket Type *</label>
          <select value={form.ticket_type} onChange={handleTypeChange} className="input-field" required>
            <option value="">Select ticket type...</option>
            {ticketTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>

        {/* Workload Impact Preview */}
        {workloadImpact && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowImpact(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Workload Impact</span>
                {(() => {
                  const hasOver = Object.values(workloadImpact).some(dept =>
                    dept.employees.length > 0 && ((dept.employees[0].currentLoad + dept.totalMinutes) / EFFECTIVE_MINUTES_PER_DAY) > 1
                  );
                  return hasOver ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Over capacity</span>
                  ) : null;
                })()}
              </div>
              {showImpact ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showImpact && (
              <div className="p-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                {Object.entries(workloadImpact).map(([dept, info]) => {
                  const target = info.employees[0]; // Least loaded
                  if (!target) return null;
                  const afterLoad = target.currentLoad + info.totalMinutes;
                  const isOver = afterLoad > EFFECTIVE_MINUTES_PER_DAY;
                  return (
                    <div key={dept} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <span className={`w-2 h-2 rounded-full inline-block ${DEPT_COLORS[dept]?.dot}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{dept}</span>
                          <span className="text-[10px] text-gray-400">{info.totalMinutes}min · {info.tasks.length} tasks</span>
                          {info.hasSpaTeam && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">spa team</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full ${DEPT_COLORS[dept]?.dot || 'bg-gray-400'} flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0`}>
                            {target.user.name.charAt(0)}
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{target.user.name}</span>
                          <div className="flex-1"><WorkloadBar usedMinutes={afterLoad} size="sm" showLabel={false} /></div>
                          <WorkloadBar usedMinutes={afterLoad} compact />
                          {isOver && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700/50">
                  {selectedSpa && Object.values(workloadImpact).some(d => d.hasSpaTeam)
                    ? `Auto-assigns to ${selectedSpa.name}'s team members. You can reassign in the ticket detail.`
                    : 'Tasks will be auto-assigned to the least loaded employee in each department. You can reassign in the ticket detail.'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client (Spa) *</label>
          <input type="text" value={spaSearch} onChange={e => { setSpaSearch(e.target.value); setShowSpaDropdown(true); setForm(f => ({ ...f, spa_id: '' })); }} onFocus={() => setShowSpaDropdown(true)} className="input-field" placeholder="Search spa..." />
          {showSpaDropdown && filteredSpas.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredSpas.map(spa => (
                <button key={spa.id} type="button" onClick={() => selectSpa(spa)} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">
                  <span className="font-medium">{spa.name}</span>
                  {spa.location && <span className="text-gray-500 dark:text-gray-400 ml-2">{spa.location}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Treatment Name</label>
          <input type="text" value={form.treatment_name} onChange={update('treatment_name')} className="input-field" placeholder="e.g., Botox, Laser Hair Removal" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Promo Price ($)</label>
            <input type="number" value={form.promo_price} onChange={update('promo_price')} className="input-field" placeholder="0.00" step="0.01" min="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value Price ($)</label>
            <input type="number" value={form.value_price} onChange={update('value_price')} className="input-field" placeholder="0.00" step="0.01" min="0" />
          </div>
        </div>
        {/* Promo Automation Section */}
        {form.spa_id && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Promo Automation</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">Optional</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Automatically create, update, or deactivate a promo on the spa's profile when this ticket is completed.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action when ticket is completed</label>
              <select value={promoAction} onChange={e => { setPromoAction(e.target.value); setLinkedPromoId(''); }} className="input-field">
                <option value="">No automation</option>
                <option value="create_promo">Create new promo</option>
                {spaPromos.length > 0 && <option value="update_promo">Update existing promo</option>}
                {spaPromos.length > 0 && <option value="deactivate_promo">Deactivate existing promo</option>}
              </select>
            </div>
            {(promoAction === 'update_promo' || promoAction === 'deactivate_promo') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select promo</label>
                <select value={linkedPromoId} onChange={e => setLinkedPromoId(e.target.value)} className="input-field" required>
                  <option value="">Choose a promo...</option>
                  {spaPromos.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — ${p.price} {p.active ? '(Active)' : '(Inactive)'}</option>
                  ))}
                </select>
              </div>
            )}
            {promoAction === 'create_promo' && (
              <div className="bg-green-50 dark:bg-green-900/10 rounded p-2.5 text-xs text-green-700 dark:text-green-400">
                When completed: A new promo "{form.treatment_name || '(treatment name)'}" at ${form.promo_price || '0'} (value ${form.value_price || '0'}) will be added to the spa's profile.
              </div>
            )}
            {promoAction === 'update_promo' && linkedPromoId && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded p-2.5 text-xs text-yellow-700 dark:text-yellow-400">
                When completed: The selected promo will be updated with the ticket's treatment name and prices.
              </div>
            )}
            {promoAction === 'deactivate_promo' && linkedPromoId && (
              <div className="bg-red-50 dark:bg-red-900/10 rounded p-2.5 text-xs text-red-700 dark:text-red-400">
                When completed: The selected promo will be deactivated. It will be reactivated if the ticket is reopened.
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority *</label>
            <select value={form.priority} onChange={update('priority')} className="input-field">
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Immediate">Immediate</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
            <select value={form.target_audience} onChange={update('target_audience')} className="input-field">
              <option value="Both">Both</option>
              <option value="Women">Women</option>
              <option value="Men">Men</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
          <input type="date" value={form.due_date} onChange={update('due_date')} className="input-field" />
        </div>
        {customFields.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              {selectedType?.name} Custom Fields
            </h3>
            {customFields.map(field => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {field.label}{field.required ? ' *' : ''}
                </label>
                {field.type === 'text' && (
                  <input
                    type="text"
                    value={customFieldValues[field.id] || ''}
                    onChange={e => updateCustomField(field.id, e.target.value)}
                    className="input-field"
                    required={field.required}
                  />
                )}
                {field.type === 'textarea' && (
                  <textarea
                    value={customFieldValues[field.id] || ''}
                    onChange={e => updateCustomField(field.id, e.target.value)}
                    className="input-field min-h-[80px] resize-y"
                    required={field.required}
                  />
                )}
                {field.type === 'number' && (
                  <input
                    type="number"
                    value={customFieldValues[field.id] || ''}
                    onChange={e => updateCustomField(field.id, e.target.value)}
                    className="input-field"
                    required={field.required}
                  />
                )}
                {field.type === 'date' && (
                  <input
                    type="date"
                    value={customFieldValues[field.id] || ''}
                    onChange={e => updateCustomField(field.id, e.target.value)}
                    className="input-field"
                    required={field.required}
                  />
                )}
                {field.type === 'select' && (
                  <select
                    value={customFieldValues[field.id] || ''}
                    onChange={e => updateCustomField(field.id, e.target.value)}
                    className="input-field"
                    required={field.required}
                  >
                    <option value="">Select...</option>
                    {(field.options || []).map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {field.type === 'checkbox' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!customFieldValues[field.id]}
                      onChange={e => updateCustomField(field.id, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        )}
        {isNewSpa && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">New Spa Fields</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Ads Date</label>
                <input type="date" value={form.start_ads_date} onChange={update('start_ads_date')} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Date of Booking</label>
                <input type="date" value={form.first_booking_date} onChange={update('first_booking_date')} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domain</label>
              <input type="text" value={form.domain} onChange={update('domain')} className="input-field" placeholder="e.g., example.com" />
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Information</label>
          <textarea value={form.additional_info} onChange={update('additional_info')} className="input-field min-h-[100px] resize-y" placeholder="Any extra details..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            <Send className="w-4 h-4" /> {loading ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
