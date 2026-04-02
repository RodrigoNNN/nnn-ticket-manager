import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSpaById, fetchTicketsBySpa, updateSpa as apiUpdateSpa, updateSpaTeam, addSpaPromo, updateSpaPromo, deleteSpaPromo, fetchOnboardingForms } from '../utils/api-service';
import { TICKET_TYPE_COLORS, TIER_DEFINITIONS } from '../utils/constants';
import PriorityBadge from '../components/common/PriorityBadge';
import DepartmentDots from '../components/common/DepartmentDots';
import ProgressBar from '../components/common/ProgressBar';
import DynamicFieldRenderer from '../components/common/DynamicFieldRenderer';
import TierSelector from '../components/spa/TierSelector';
import PromoManager from '../components/spa/PromoManager';
import SpaTeamEditor from '../components/spa/SpaTeamEditor';
import SpaTeamBadges from '../components/spa/SpaTeamBadges';
import BudgetBreakdown from '../components/spa/BudgetBreakdown';
import { ArrowLeft, Building2, MapPin, Ticket, PlusCircle, Pencil, Save, X, DollarSign, Target, Calendar, Plus, Trash2, Users, Loader2, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ClientHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [spa, setSpa] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([fetchSpaById(id), fetchTicketsBySpa(id)])
      .then(([s, t]) => { setSpa(s); setTickets(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading && !spa) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  if (!spa) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Client not found.</p>
        <button onClick={() => navigate('/clients')} className="btn-primary mt-4">Back to Clients</button>
      </div>
    );
  }

  const open = tickets.filter(t => t.status === 'Open').length;
  const inProgress = tickets.filter(t => t.status === 'In Progress').length;
  const done = tickets.filter(t => t.status === 'Done').length;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </button>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{spa.name}</h1>
                {spa.tier && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_DEFINITIONS[spa.tier]?.color || ''}`}>
                    Tier {spa.tier}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {spa.location && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {spa.location}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{spa.country}</span>
                {spa.monthly_budget && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> ${spa.monthly_budget.toLocaleString()}/mo
                  </span>
                )}
                {spa.arrival_goal && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Target className="w-3 h-3" /> {spa.arrival_goal} arrivals/mo
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/create')} className="btn-primary flex items-center gap-2 text-sm">
            <PlusCircle className="w-4 h-4" /> New Ticket
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <SmallStatCard label="Total Tickets" value={tickets.length} />
        <SmallStatCard label="Open" value={open} color="text-blue-600" />
        <SmallStatCard label="In Progress" value={inProgress} color="text-yellow-600" />
        <SmallStatCard label="Completed" value={done} color="text-green-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('budget')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'budget' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          Budget
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tickets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          Ticket History ({tickets.length})
        </button>
      </div>

      {activeTab === 'profile' && (
        <SpaProfile spa={spa} editing={editing} setEditing={setEditing} onRefresh={refresh} />
      )}

      {activeTab === 'budget' && (
        <BudgetBreakdown spa={spa} />
      )}

      {activeTab === 'tickets' && (
        <TicketHistory tickets={tickets} navigate={navigate} />
      )}
    </div>
  );
}

function SpaProfile({ spa, editing, setEditing, onRefresh }) {
  const [onboardingFields, setOnboardingFields] = useState([]);

  useEffect(() => {
    fetchOnboardingForms().then(forms => {
      const fields = forms.length > 0 ? (forms[0].fields || []) : [];
      setOnboardingFields(fields);
    }).catch(() => {});
  }, []);
  const [editData, setEditData] = useState(null);

  const startEditing = () => {
    setEditData({
      name: spa.name,
      location: spa.location || '',
      country: spa.country || 'USA',
      tier: spa.tier,
      monthly_budget: spa.monthly_budget ? String(spa.monthly_budget) : '',
      arrival_goal: spa.arrival_goal ? String(spa.arrival_goal) : '',
      payment_schedule: spa.payment_schedule || 'monthly',
      assigned_team: spa.assigned_team ? JSON.parse(JSON.stringify(spa.assigned_team)) : { Management: [], Marketing: [], IT: [], Accounting: [] },
      promos: JSON.parse(JSON.stringify(spa.promos || [])),
      onboarding_data: { ...(spa.onboarding_data || {}) },
      extra_fields: JSON.parse(JSON.stringify(spa.extra_fields || [])),
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditData(null);
    setEditing(false);
  };

  const handleSave = async () => {
    try {
      // Update spa core fields
      await apiUpdateSpa(spa.id, {
        name: editData.name,
        location: editData.location,
        country: editData.country,
        tier: editData.tier,
        monthly_budget: editData.monthly_budget ? Number(editData.monthly_budget) : null,
        arrival_goal: editData.arrival_goal ? Number(editData.arrival_goal) : null,
        payment_schedule: editData.payment_schedule,
        onboarding_data: editData.onboarding_data,
        extra_fields: editData.extra_fields,
      });

      // Persist team changes separately
      await updateSpaTeam(spa.id, editData.assigned_team);

      // Reconcile promos: delete removed, update existing, add new
      const oldPromos = spa.promos || [];
      const newPromos = editData.promos || [];
      const oldIds = new Set(oldPromos.map(p => p.id));
      const newIds = new Set(newPromos.map(p => p.id));

      // Delete removed promos
      for (const old of oldPromos) {
        if (!newIds.has(old.id)) await deleteSpaPromo(old.id);
      }

      // Update existing or add new promos
      for (const promo of newPromos) {
        if (oldIds.has(promo.id)) {
          await updateSpaPromo(promo.id, { name: promo.name, price: promo.price, value_price: promo.value_price, active: promo.active });
        } else {
          await addSpaPromo(spa.id, promo);
        }
      }

      toast.success('Spa profile updated');
      setEditing(false);
      setEditData(null);
      onRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to save spa profile');
    }
  };

  const addExtraField = () => {
    setEditData(prev => ({
      ...prev,
      extra_fields: [...prev.extra_fields, { id: `ef-${Date.now()}`, label: '', value: '' }],
    }));
  };

  const updateExtraField = (idx, key, val) => {
    setEditData(prev => ({
      ...prev,
      extra_fields: prev.extra_fields.map((f, i) => i === idx ? { ...f, [key]: val } : f),
    }));
  };

  const removeExtraField = (idx) => {
    setEditData(prev => ({
      ...prev,
      extra_fields: prev.extra_fields.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end gap-2">
        {editing ? (
          <>
            <button onClick={cancelEditing} className="btn-secondary text-sm flex items-center gap-1.5">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={handleSave} className="btn-primary text-sm flex items-center gap-1.5">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </>
        ) : (
          <button onClick={startEditing} className="btn-secondary text-sm flex items-center gap-1.5">
            <Pencil className="w-4 h-4" /> Edit Profile
          </button>
        )}
      </div>

      {/* Tier */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">Service Tier</h3>
        {editing ? (
          <TierSelector value={editData.tier} onChange={val => setEditData(prev => ({ ...prev, tier: val }))} />
        ) : (
          spa.tier ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: TIER_DEFINITIONS[spa.tier]?.hex }}>
                {spa.tier}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{TIER_DEFINITIONS[spa.tier]?.label} — {TIER_DEFINITIONS[spa.tier]?.subtitle}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{TIER_DEFINITIONS[spa.tier]?.description}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No tier assigned</p>
          )
        )}
      </div>

      {/* Assigned Team */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide flex items-center gap-1.5">
          <Users className="w-4 h-4" /> Assigned Team
        </h3>
        {editing ? (
          <SpaTeamEditor
            value={editData.assigned_team}
            onChange={team => setEditData(prev => ({ ...prev, assigned_team: team }))}
          />
        ) : (
          <SpaTeamBadges assignedTeam={spa.assigned_team} />
        )}
      </div>

      {/* Budget & Goal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wide flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" /> Monthly Budget
          </h3>
          {editing ? (
            <input
              type="number"
              value={editData.monthly_budget}
              onChange={e => setEditData(prev => ({ ...prev, monthly_budget: e.target.value }))}
              className="input-field"
              placeholder="0"
              min="0"
            />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {spa.monthly_budget ? `$${spa.monthly_budget.toLocaleString()}` : '—'}
            </p>
          )}
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wide flex items-center gap-1.5">
            <Target className="w-4 h-4" /> Arrival Goal
          </h3>
          {editing ? (
            <input
              type="number"
              value={editData.arrival_goal}
              onChange={e => setEditData(prev => ({ ...prev, arrival_goal: e.target.value }))}
              className="input-field"
              placeholder="0"
              min="0"
            />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {spa.arrival_goal ? `${spa.arrival_goal} / mo` : '—'}
            </p>
          )}
        </div>
      </div>

      {/* Payment Schedule */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wide flex items-center gap-1.5">
          <Calendar className="w-4 h-4" /> Payment Schedule
        </h3>
        {editing ? (
          <select
            value={editData.payment_schedule}
            onChange={e => setEditData(prev => ({ ...prev, payment_schedule: e.target.value }))}
            className="input-field"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        ) : (
          <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
            {spa.payment_schedule || 'Monthly'}
          </p>
        )}
      </div>

      {/* Promos */}
      <div className="card p-5">
        {editing ? (
          <PromoManager promos={editData.promos} onChange={promos => setEditData(prev => ({ ...prev, promos }))} />
        ) : (
          <>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">Promotions</h3>
            {(spa.promos || []).length > 0 ? (
              <div className="space-y-2">
                {spa.promos.map(promo => (
                  <div key={promo.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div>
                      <p className={`text-sm font-medium ${promo.active ? 'text-gray-900 dark:text-white' : 'text-gray-400 line-through'}`}>{promo.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">${promo.price} promo · ${promo.value_price} value</p>
                      {promo.linked_ticket_id && (
                        <button
                          onClick={() => navigate(`/tickets/${promo.linked_ticket_id}`)}
                          className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 mt-0.5"
                        >
                          <Link2 className="w-2.5 h-2.5" /> Linked to ticket
                        </button>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${promo.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {promo.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No promotions</p>
            )}
          </>
        )}
      </div>

      {/* Onboarding Data */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Onboarding Information</h3>
          {spa.onboarded_at && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(spa.onboarded_at), 'MMM d, yyyy')}
              {spa.onboarded_via && ` · via ${spa.onboarded_via}`}
            </span>
          )}
        </div>
        {onboardingFields.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {onboardingFields.map(field => {
              const val = editing ? editData.onboarding_data[field.id] : spa.onboarding_data?.[field.id];
              return (
                <div key={field.id}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{field.label}</label>
                  {editing ? (
                    <DynamicFieldRenderer
                      field={field}
                      value={editData.onboarding_data[field.id] ?? ''}
                      onChange={v => setEditData(prev => ({
                        ...prev,
                        onboarding_data: { ...prev.onboarding_data, [field.id]: v },
                      }))}
                    />
                  ) : (
                    field.type === 'tier_select' && val ? (
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${TIER_DEFINITIONS[val]?.color || ''}`}>
                        Tier {val} — {TIER_DEFINITIONS[val]?.subtitle}
                      </span>
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-white">{val === true ? 'Yes' : val === false ? 'No' : val || <span className="text-gray-400 italic">—</span>}</p>
                    )
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No onboarding fields configured</p>
        )}
      </div>

      {/* Extra Custom Fields */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Additional Fields</h3>
          {editing && (
            <button type="button" onClick={addExtraField} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Field
            </button>
          )}
        </div>
        {editing ? (
          editData.extra_fields.length > 0 ? (
            <div className="space-y-2">
              {editData.extra_fields.map((ef, idx) => (
                <div key={ef.id} className="flex items-start gap-2">
                  <input
                    value={ef.label}
                    onChange={e => updateExtraField(idx, 'label', e.target.value)}
                    className="input-field text-sm py-1.5 w-1/3"
                    placeholder="Label"
                  />
                  <input
                    value={ef.value}
                    onChange={e => updateExtraField(idx, 'value', e.target.value)}
                    className="input-field text-sm py-1.5 flex-1"
                    placeholder="Value"
                  />
                  <button type="button" onClick={() => removeExtraField(idx)} className="p-1.5 hover:text-red-500 text-gray-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No extra fields. Click "Add Field" to create one.</p>
          )
        ) : (
          (spa.extra_fields || []).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {spa.extra_fields.map(ef => (
                <div key={ef.id}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{ef.label}</label>
                  <p className="text-sm text-gray-900 dark:text-white">{ef.value || '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No additional fields</p>
          )
        )}
      </div>
    </div>
  );
}

function TicketHistory({ tickets, navigate }) {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-16 card">
        <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No tickets for this client yet</p>
        <button onClick={() => navigate('/create')} className="btn-primary mt-4 text-sm">Create First Ticket</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map(ticket => {
        const typeColor = TICKET_TYPE_COLORS[ticket.ticket_type] || '#6B7280';
        return (
          <div
            key={ticket.id}
            onClick={() => navigate(`/tickets/${ticket.id}`)}
            className="card p-4 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: typeColor }}>{ticket.ticket_type}</span>
                <PriorityBadge priority={ticket.priority} />
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  ticket.status === 'Done' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>{ticket.status}</span>
              </div>
              <DepartmentDots departmentStatus={ticket.departmentStatus} />
            </div>

            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                {ticket.treatment_name || 'No treatment specified'}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(ticket.created_at), 'MMM d, yyyy')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <ProgressBar progress={ticket.progress} />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-8 text-right">{ticket.progress}%</span>
            </div>

            {ticket.due_date && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Due: {format(new Date(ticket.due_date + 'T12:00:00'), 'MMM d, yyyy')}
                {ticket.completed_at && <span className="text-green-600 ml-3">Completed {format(new Date(ticket.completed_at), 'MMM d, yyyy')}</span>}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SmallStatCard({ label, value, color = 'text-gray-900 dark:text-white' }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
