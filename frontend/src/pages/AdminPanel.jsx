import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchSpas, updateSpa as apiUpdateSpa, updateSpaTeam, createSpa as apiCreateSpa, fetchTickets, fetchTicketTypes, createTicketType as apiCreateTicketType, updateTicketType as apiUpdateTicketType, fetchEmployeesWorkload, updateUser as apiUpdateUser, createUser as apiCreateUser } from '../utils/api-service';
import { DEPARTMENTS, DEPT_COLORS, FIELD_TYPES, TIER_DEFINITIONS, EFFECTIVE_MINUTES_PER_DAY } from '../utils/constants';
import OnboardingFormBuilder from '../components/admin/OnboardingFormBuilder';
import WorkloadBar from '../components/common/WorkloadBar';
import SpaTeamEditor from '../components/spa/SpaTeamEditor';
import { Users, Building2, Tag, BarChart3, FileText, Download, Plus, Pencil, Trash2, X, Save, GripVertical, ChevronDown, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'users', label: 'Team Members', icon: Users },
  { key: 'spas', label: 'Spas', icon: Building2 },
  { key: 'types', label: 'Ticket Types', icon: Tag },
  { key: 'onboarding', label: 'Onboarding Form', icon: FileText },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'users' && <UserManagement />}
      {tab === 'spas' && <SpaManagement />}
      {tab === 'types' && <TicketTypeManagement />}
      {tab === 'onboarding' && <OnboardingFormBuilder />}
    </div>
  );
}

function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [workloads, setWorkloads] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await fetchTickets();
        setTickets(t);
        const wl = {};
        for (const dept of DEPARTMENTS) {
          wl[dept] = await fetchEmployeesWorkload(dept);
        }
        setWorkloads(wl);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;

  const open = tickets.filter(t => t.status === 'Open').length;
  const inProgress = tickets.filter(t => t.status === 'In Progress').length;
  const done = tickets.filter(t => t.status === 'Done').length;

  const spaCount = {};
  for (const t of tickets) { const n = t.spa?.name || 'Unknown'; spaCount[n] = (spaCount[n] || 0) + 1; }
  const typeCount = {};
  for (const t of tickets) { typeCount[t.ticket_type] = (typeCount[t.ticket_type] || 0) + 1; }

  const exportCSV = () => {
    const headers = ['Type', 'Spa', 'Treatment', 'Priority', 'Status', 'Due Date'];
    const rows = tickets.map(t => [t.ticket_type, t.spa?.name || '', t.treatment_name || '', t.priority, t.status, t.due_date || '']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tickets-export.csv';
    a.click();
    toast.success('Export downloaded');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Open Tickets" value={open} color="text-blue-600" />
        <StatCard label="In Progress" value={inProgress} color="text-yellow-600" />
        <StatCard label="Completed" value={done} color="text-green-600" />
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">Team Workload Capacity</h3>
        <div className="space-y-4">
          {DEPARTMENTS.map(dept => {
            const deptWorkloads = workloads[dept] || {};
            const users = Object.values(deptWorkloads);
            if (users.length === 0) return null;
            return (
              <div key={dept}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${DEPT_COLORS[dept].dot}`} />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{dept}</span>
                  <span className="text-[10px] text-gray-400">({users.length} members)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                  {users.map(({ user, totalMinutes }) => (
                    <div key={user.id} className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full ${DEPT_COLORS[dept].dot} flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0`}>
                        {user.name.charAt(0)}
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 w-16 truncate">{user.name}</span>
                      <div className="flex-1"><WorkloadBar usedMinutes={totalMinutes} size="sm" showLabel={false} /></div>
                      <WorkloadBar usedMinutes={totalMinutes} compact />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">Tickets by Spa</h3>
          <div className="space-y-2">
            {Object.entries(spaCount).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 truncate">{name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / Math.max(...Object.values(spaCount))) * 100}%` }} />
                  </div>
                  <span className="text-gray-500 w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">Tickets by Type</h3>
          <div className="space-y-2">
            {Object.entries(typeCount).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 truncate">{type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(count / Math.max(...Object.values(typeCount))) * 100}%` }} />
                  </div>
                  <span className="text-gray-500 w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> Export All Tickets (CSV)
        </button>
      </div>
    </div>
  );
}

function UserManagement() {
  const { allUsers, refreshUsers } = useAuth();
  const [users, setUsers] = useState(allUsers);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', department: 'Management', whatsapp_number: '', role: 'member' });

  // Sync local state when allUsers changes (e.g. after refresh)
  useEffect(() => { setUsers(allUsers); }, [allUsers]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return toast.error('Name and email are required');
    setSaving(true);
    try {
      if (editing) {
        await apiUpdateUser(editing, {
          name: form.name,
          email: form.email,
          department: form.department,
          whatsapp_number: form.whatsapp_number,
          role: form.role,
        });
        toast.success('User updated');
      } else {
        await apiCreateUser({
          name: form.name,
          email: form.email,
          department: form.department,
          whatsapp_number: form.whatsapp_number,
          role: form.role,
        });
        toast.success('User created');
      }
      setShowForm(false); setEditing(null);
      setForm({ name: '', email: '', department: 'Management', whatsapp_number: '', role: 'member' });
      await refreshUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const editUser = (u) => {
    setForm({ name: u.name, email: u.email, department: u.department, whatsapp_number: u.whatsapp_number || '', role: u.role });
    setEditing(u.id); setShowForm(true);
  };

  const groupedUsers = {};
  for (const u of users) { if (!groupedUsers[u.department]) groupedUsers[u.department] = []; groupedUsers[u.department].push(u); }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{users.length} team members</p>
        <button onClick={() => { setEditing(null); setForm({ name: '', email: '', department: 'Management', whatsapp_number: '', role: 'member' }); setShowForm(true); }} className="btn-primary flex items-center gap-2 text-sm py-1.5">
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? 'Edit' : 'Add'} Team Member</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Name" />
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" placeholder="Email" type="email" />
              <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="input-field">
                <option value="Management">Management</option>
                <option value="Marketing">Marketing</option>
                <option value="IT">IT</option>
                <option value="Accounting">Accounting</option>
              </select>
              <input value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))} className="input-field" placeholder="WhatsApp Number" />
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input-field">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {Object.entries(groupedUsers).map(([dept, deptUsers]) => (
        <div key={dept} className="mb-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: DEPT_COLORS[dept]?.hex }}>{dept} ({deptUsers.length})</h3>
          <div className="card divide-y divide-gray-100 dark:divide-gray-700">
            {deptUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${DEPT_COLORS[dept]?.dot || 'bg-gray-400'} flex items-center justify-center text-white text-xs font-semibold`}>{u.name.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name} {u.role === 'admin' && <span className="text-xs text-blue-600 ml-1">Admin</span>}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                  </div>
                </div>
                <button onClick={() => editUser(u)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Pencil className="w-4 h-4 text-gray-400" /></button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SpaManagement() {
  const [spas, setSpas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyTeam = { Management: [], Marketing: [], IT: [], Accounting: [] };
  const [form, setForm] = useState({ name: '', location: '', country: 'USA', tier: null, monthly_budget: '', arrival_goal: '', assigned_team: emptyTeam });

  const refresh = useCallback(() => {
    fetchSpas().then(setSpas).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Please enter a spa name');
    try {
      if (editing) {
        await apiUpdateSpa(editing, {
          name: form.name,
          location: form.location,
          country: form.country,
          tier: form.tier,
          monthly_budget: form.monthly_budget ? Number(form.monthly_budget) : null,
          arrival_goal: form.arrival_goal ? Number(form.arrival_goal) : null,
        });
        // Persist team changes separately
        await updateSpaTeam(editing, form.assigned_team);
        toast.success('Spa updated');
      } else {
        await apiCreateSpa({
          name: form.name,
          location: form.location,
          country: form.country,
          tier: form.tier,
          monthly_budget: form.monthly_budget ? Number(form.monthly_budget) : null,
          arrival_goal: form.arrival_goal ? Number(form.arrival_goal) : null,
          assigned_team: form.assigned_team,
        });
        toast.success('Spa created');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', location: '', country: 'USA', tier: null, monthly_budget: '', arrival_goal: '', assigned_team: emptyTeam });
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to save spa');
    }
  };

  const editSpa = (spa) => {
    setForm({
      name: spa.name,
      location: spa.location || '',
      country: spa.country || 'USA',
      tier: spa.tier || null,
      monthly_budget: spa.monthly_budget ? String(spa.monthly_budget) : '',
      arrival_goal: spa.arrival_goal ? String(spa.arrival_goal) : '',
      assigned_team: spa.assigned_team ? JSON.parse(JSON.stringify(spa.assigned_team)) : { Management: [], Marketing: [], IT: [], Accounting: [] },
    });
    setEditing(spa.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{spas.length} spas</p>
        <button onClick={() => { setEditing(null); setForm({ name: '', location: '', country: 'USA', tier: null, monthly_budget: '', arrival_goal: '', assigned_team: emptyTeam }); setShowForm(true); }} className="btn-primary flex items-center gap-2 text-sm py-1.5">
          <Plus className="w-4 h-4" /> Add Spa
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="card p-6 w-full max-w-lg my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? 'Edit' : 'Create'} Spa</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Spa Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="input-field" placeholder="City, State" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="input-field">
                  <option value="USA">USA</option>
                  <option value="Canada">Canada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tier</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, tier: f.tier === t ? null : t }))}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        form.tier === t
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      Tier {t}
                    </button>
                  ))}
                </div>
                {form.tier && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{TIER_DEFINITIONS[form.tier]?.subtitle}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Budget ($)</label>
                  <input type="number" value={form.monthly_budget} onChange={e => setForm(f => ({ ...f, monthly_budget: e.target.value }))} className="input-field" placeholder="0" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Arrival Goal</label>
                  <input type="number" value={form.arrival_goal} onChange={e => setForm(f => ({ ...f, arrival_goal: e.target.value }))} className="input-field" placeholder="0" min="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigned Team</label>
                <SpaTeamEditor
                  value={form.assigned_team}
                  onChange={team => setForm(f => ({ ...f, assigned_team: team }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleSave} className="btn-primary flex items-center gap-2 text-sm"><Save className="w-4 h-4" /> Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card divide-y divide-gray-100 dark:divide-gray-700">
        {spas.map(spa => {
          const teamCount = Object.values(spa.assigned_team || {}).flat().length;
          return (
            <div key={spa.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{spa.name}</p>
                    {spa.tier && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TIER_DEFINITIONS[spa.tier]?.color || ''}`}>
                        T{spa.tier}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {spa.location || 'No location'} &middot; {spa.country}
                    {spa.monthly_budget ? ` · $${spa.monthly_budget.toLocaleString()}/mo` : ''}
                    {teamCount > 0 ? ` · ${teamCount} team member${teamCount !== 1 ? 's' : ''}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => editSpa(spa)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <Pencil className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TicketTypeManagement() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetchTicketTypes().then(setTypes).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { name: '', color: '#3B82F6', instructions: '', departments: [], subtasks: {}, custom_fields: [] };
  const [form, setForm] = useState(emptyForm);
  const [newTask, setNewTask] = useState({});

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setNewTask({});
    setShowForm(true);
  };

  const openEdit = (type) => {
    const depts = Object.keys(type.subtasks || {});
    // Normalize subtasks to { name, estimated_minutes } format
    const normalized = {};
    for (const [dept, tasks] of Object.entries(type.subtasks || {})) {
      normalized[dept] = (tasks || []).map(t =>
        typeof t === 'string' ? { name: t, estimated_minutes: 10 } : { name: t.name, estimated_minutes: t.estimated_minutes || 10 }
      );
    }
    setEditing(type.id);
    setForm({
      name: type.name,
      color: type.color,
      instructions: type.instructions || '',
      departments: depts,
      subtasks: normalized,
      custom_fields: JSON.parse(JSON.stringify(type.custom_fields || [])),
    });
    setNewTask({});
    setShowForm(true);
  };

  const toggleDept = (dept) => {
    setForm(f => {
      const has = f.departments.includes(dept);
      const departments = has ? f.departments.filter(d => d !== dept) : [...f.departments, dept];
      const subtasks = { ...f.subtasks };
      if (has) { delete subtasks[dept]; } else if (!subtasks[dept]) { subtasks[dept] = []; }
      return { ...f, departments, subtasks };
    });
  };

  const addSubtask = (dept) => {
    const text = (newTask[dept] || '').trim();
    if (!text) return;
    setForm(f => ({
      ...f,
      subtasks: { ...f.subtasks, [dept]: [...(f.subtasks[dept] || []), { name: text, estimated_minutes: 10 }] },
    }));
    setNewTask(n => ({ ...n, [dept]: '' }));
  };

  const removeSubtask = (dept, idx) => {
    setForm(f => ({
      ...f,
      subtasks: { ...f.subtasks, [dept]: f.subtasks[dept].filter((_, i) => i !== idx) },
    }));
  };

  const updateSubtaskTime = (dept, idx, minutes) => {
    setForm(f => ({
      ...f,
      subtasks: { ...f.subtasks, [dept]: f.subtasks[dept].map((t, i) => i === idx ? { ...t, estimated_minutes: Math.max(1, Number(minutes) || 1) } : t) },
    }));
  };

  const updateSubtaskName = (dept, idx, name) => {
    setForm(f => ({
      ...f,
      subtasks: { ...f.subtasks, [dept]: f.subtasks[dept].map((t, i) => i === idx ? { ...t, name } : t) },
    }));
  };

  const addCustomField = () => {
    setForm(f => ({
      ...f,
      custom_fields: [...f.custom_fields, { id: `cf-${Date.now()}`, label: '', type: 'text', required: false, options: [] }],
    }));
  };

  const updateCustomField = (idx, key, value) => {
    setForm(f => ({
      ...f,
      custom_fields: f.custom_fields.map((cf, i) => i === idx ? { ...cf, [key]: value } : cf),
    }));
  };

  const removeCustomField = (idx) => {
    setForm(f => ({ ...f, custom_fields: f.custom_fields.filter((_, i) => i !== idx) }));
  };

  const addFieldOption = (idx) => {
    setForm(f => ({
      ...f,
      custom_fields: f.custom_fields.map((cf, i) => i === idx ? { ...cf, options: [...cf.options, ''] } : cf),
    }));
  };

  const updateFieldOption = (fieldIdx, optIdx, value) => {
    setForm(f => ({
      ...f,
      custom_fields: f.custom_fields.map((cf, i) =>
        i === fieldIdx ? { ...cf, options: cf.options.map((o, j) => j === optIdx ? value : o) } : cf
      ),
    }));
  };

  const removeFieldOption = (fieldIdx, optIdx) => {
    setForm(f => ({
      ...f,
      custom_fields: f.custom_fields.map((cf, i) =>
        i === fieldIdx ? { ...cf, options: cf.options.filter((_, j) => j !== optIdx) } : cf
      ),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Please enter a ticket type name');
    if (form.departments.length === 0) return toast.error('Please select at least one department');

    const filteredSubtasks = {};
    for (const dept of form.departments) {
      filteredSubtasks[dept] = form.subtasks[dept] || [];
    }

    const data = { name: form.name, color: form.color, instructions: form.instructions, subtasks: filteredSubtasks, custom_fields: form.custom_fields };

    if (editing) {
      await apiUpdateTicketType(editing, data);
      toast.success('Ticket type updated');
    } else {
      await apiCreateTicketType(data);
      toast.success('Ticket type created');
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{types.length} ticket types configured</p>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm py-1.5">
          <Plus className="w-4 h-4" /> Add Ticket Type
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="card p-6 w-full max-w-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editing ? 'Edit' : 'Create'} Ticket Type</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-[1fr_auto] gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g., New Campaign" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600" />
                    <span className="text-xs text-gray-500 font-mono">{form.color}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructions</label>
                <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} className="input-field min-h-[80px] resize-y" placeholder="General instructions or notes for this ticket type..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Departments *</label>
                <div className="flex flex-wrap gap-2">
                  {DEPARTMENTS.map(dept => {
                    const active = form.departments.includes(dept);
                    return (
                      <button key={dept} type="button" onClick={() => toggleDept(dept)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${active
                          ? 'text-white border-transparent'
                          : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400'}`}
                        style={active ? { backgroundColor: DEPT_COLORS[dept]?.hex, borderColor: DEPT_COLORS[dept]?.hex } : {}}
                      >
                        {dept}
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.departments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Subtasks per Department</label>
                  <div className="space-y-4">
                    {form.departments.map(dept => {
                      const deptTasks = form.subtasks[dept] || [];
                      const deptTotal = deptTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
                      return (
                      <div key={dept} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3" style={{ borderLeftWidth: '4px', borderLeftColor: DEPT_COLORS[dept]?.hex }}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold" style={{ color: DEPT_COLORS[dept]?.hex }}>{dept}</p>
                          {deptTasks.length > 0 && (
                            <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{deptTotal}min total</span>
                          )}
                        </div>
                        <div className="space-y-1.5 mb-2">
                          {deptTasks.map((task, idx) => (
                            <div key={idx} className="flex items-center gap-2 group">
                              <input
                                value={task.name}
                                onChange={e => updateSubtaskName(dept, idx, e.target.value)}
                                className="input-field text-sm py-1 flex-1"
                                placeholder="Task name..."
                              />
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <input
                                  type="number"
                                  value={task.estimated_minutes}
                                  onChange={e => updateSubtaskTime(dept, idx, e.target.value)}
                                  className="input-field text-xs py-1 w-16 text-center"
                                  min="1"
                                  title="Estimated minutes"
                                />
                                <span className="text-[10px] text-gray-400">min</span>
                              </div>
                              <button type="button" onClick={() => removeSubtask(dept, idx)} className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          {deptTasks.length === 0 && (
                            <p className="text-xs text-gray-400 italic">No subtasks yet</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={newTask[dept] || ''}
                            onChange={e => setNewTask(n => ({ ...n, [dept]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(dept); } }}
                            className="input-field flex-1 text-sm py-1.5"
                            placeholder={`Add subtask for ${dept}...`}
                          />
                          <button type="button" onClick={() => addSubtask(dept)} className="btn-secondary text-sm py-1.5 px-3">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Fields</label>
                  <button type="button" onClick={addCustomField} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Field
                  </button>
                </div>
                {form.custom_fields.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No custom fields. These will appear as extra form inputs when creating a ticket of this type.</p>
                )}
                <div className="space-y-3">
                  {form.custom_fields.map((field, idx) => (
                    <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            value={field.label}
                            onChange={e => updateCustomField(idx, 'label', e.target.value)}
                            className="input-field text-sm py-1.5"
                            placeholder="Field label..."
                          />
                          <div className="flex items-center gap-2">
                            <select
                              value={field.type}
                              onChange={e => updateCustomField(idx, 'type', e.target.value)}
                              className="input-field text-sm py-1.5 flex-1"
                            >
                              {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                            </select>
                            <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer">
                              <input type="checkbox" checked={field.required} onChange={e => updateCustomField(idx, 'required', e.target.checked)} className="rounded border-gray-300 text-blue-600" />
                              Required
                            </label>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeCustomField(idx)} className="p-1 hover:text-red-500 text-gray-400 mt-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {field.type === 'select' && (
                        <div className="mt-2 pl-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Dropdown options:</p>
                          <div className="space-y-1">
                            {field.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-1">
                                <input
                                  value={opt}
                                  onChange={e => updateFieldOption(idx, optIdx, e.target.value)}
                                  className="input-field text-xs py-1 flex-1"
                                  placeholder={`Option ${optIdx + 1}`}
                                />
                                <button type="button" onClick={() => removeFieldOption(idx, optIdx)} className="p-0.5 hover:text-red-500 text-gray-400">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button type="button" onClick={() => addFieldOption(idx)} className="text-xs text-blue-600 hover:text-blue-700 mt-1">+ Add option</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleSave} className="btn-primary flex items-center gap-2 text-sm"><Save className="w-4 h-4" /> {editing ? 'Update' : 'Create'} Ticket Type</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {types.map(type => {
          const subtasks = type.subtasks;
          return (
            <div key={type.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{type.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                  <button onClick={() => openEdit(type)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Pencil className="w-4 h-4 text-gray-400" /></button>
                </div>
              </div>
              {type.instructions && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 italic">{type.instructions}</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(subtasks || {}).map(([dept, tasks]) => {
                  const deptTotal = (tasks || []).reduce((sum, t) => sum + (typeof t === 'object' ? (t.estimated_minutes || 0) : 0), 0);
                  return (
                  <div key={dept}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium" style={{ color: DEPT_COLORS[dept]?.hex }}>{dept}</p>
                      {deptTotal > 0 && <span className="text-[10px] text-gray-400">{deptTotal}min</span>}
                    </div>
                    <ul className="space-y-0.5">
                      {(tasks || []).map((task, i) => {
                        const name = typeof task === 'string' ? task : task.name;
                        const mins = typeof task === 'object' ? task.estimated_minutes : null;
                        return (
                          <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
                            <span>&#8226; {name}</span>
                            {mins != null && <span className="text-[10px] text-gray-400 ml-1">{mins}m</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  );
                })}
              </div>
              {(type.custom_fields || []).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Custom Fields:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {type.custom_fields.map(cf => (
                      <span key={cf.id} className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        {cf.label} <span className="text-gray-400 dark:text-gray-500">({cf.type}){cf.required ? ' *' : ''}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'text-gray-900 dark:text-white' }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
