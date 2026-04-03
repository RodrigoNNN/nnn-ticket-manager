import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchSpas, fetchTickets, fetchAllSpasMonthlyArrivals, upsertSpaArrival } from '../utils/api-service';
import { TIER_DEFINITIONS } from '../utils/constants';
import SpaTeamBadges from '../components/spa/SpaTeamBadges';
import SpaGoalStatus from '../components/spa/SpaGoalStatus';
import { Building2, Search, MapPin, Ticket, Loader2, CalendarDays, ChevronLeft, ChevronRight, Plus, X, Save, Check, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

function getMonthStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function getMonthLabel(date) {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function Clients() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { user, allUsers, isAdmin, isViewingAsOther } = useAuth();
  const showAdminFeatures = isAdmin && !isViewingAsOther;
  const [allSpas, setAllSpas] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Monthly arrivals
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [monthArrivals, setMonthArrivals] = useState([]); // raw rows
  const [arrivalsLoading, setArrivalsLoading] = useState(false);

  // Log arrival modal
  const [logModal, setLogModal] = useState(null); // { spaId, spaName }
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logCount, setLogCount] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [logSaving, setLogSaving] = useState(false);

  // Filters
  const [filterPod, setFilterPod] = useState(false);     // My Pod
  const [filterCountry, setFilterCountry] = useState(''); // '' | 'USA' | 'Canada'
  const [filterTier, setFilterTier] = useState('');       // '' | '1' | '2' | '3'
  const [filterGoal, setFilterGoal] = useState('');       // '' | 'on-track' | 'at-risk' | 'behind' | 'no-data'

  const monthStr = getMonthStr(monthDate);

  useEffect(() => {
    Promise.all([fetchSpas(), fetchTickets()])
      .then(([s, t]) => { setAllSpas(s); setTickets(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Fetch arrivals whenever month changes
  const loadArrivals = useCallback(() => {
    setArrivalsLoading(true);
    fetchAllSpasMonthlyArrivals(monthStr)
      .then(setMonthArrivals)
      .catch(() => {})
      .finally(() => setArrivalsLoading(false));
  }, [monthStr]);

  useEffect(() => { loadArrivals(); }, [loadArrivals]);

  // Compute arrival totals per spa for the month
  const arrivalsBySpa = {};
  for (const row of monthArrivals) {
    arrivalsBySpa[row.spa_id] = (arrivalsBySpa[row.spa_id] || 0) + row.arrivals;
  }

  const prevMonth = () => setMonthDate(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; });
  const nextMonth = () => setMonthDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; });

  const handleLogArrival = async () => {
    if (!logCount || Number(logCount) < 0) return toast.error('Enter a valid arrival count');
    setLogSaving(true);
    try {
      await upsertSpaArrival(logModal.spaId, logDate, Number(logCount), logNotes, user?.id);
      toast.success('Arrival logged');
      setLogModal(null);
      setLogCount('');
      setLogNotes('');
      loadArrivals();
    } catch (err) {
      toast.error(err.message || 'Failed to log arrival');
    } finally {
      setLogSaving(false);
    }
  };

  if (loading && allSpas.length === 0) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  // Helper: compute goal status for a spa
  const getGoalStatus = (spa) => {
    const arrivals = arrivalsBySpa[spa.id] || 0;
    const target = spa.arrival_goal_target;
    const min = spa.arrival_goal_min;
    if (!target && !min) return 'no-data';
    if (arrivals >= (target || min)) return 'on-track';
    if (arrivals >= (min || target)) return 'at-risk';
    return 'behind';
  };

  const spas = allSpas
    .filter(s => {
      // Text search
      const q = search.toLowerCase();
      if (q) {
        const nameMatch = s.name.toLowerCase().includes(q);
        const locMatch = (s.location || '').toLowerCase().includes(q);
        const teamNames = Object.values(s.assigned_team || {}).flat()
          .map(uid => allUsers.find(u => u.id === uid)?.name?.toLowerCase() || '');
        const teamMatch = teamNames.some(n => n.includes(q));
        if (!nameMatch && !locMatch && !teamMatch) return false;
      }
      // My Pod
      if (filterPod) {
        const allMembers = Object.values(s.assigned_team || {}).flat();
        if (!allMembers.includes(user?.id)) return false;
      }
      // Country
      if (filterCountry && s.country !== filterCountry) return false;
      // Tier
      if (filterTier && String(s.tier) !== filterTier) return false;
      // Goal status
      if (filterGoal && getGoalStatus(s) !== filterGoal) return false;
      return true;
    })
    .map(spa => {
      const spaTickets = tickets.filter(t => t.spa_id === spa.id);
      return {
        ...spa,
        ticketCount: spaTickets.length,
        openCount: spaTickets.filter(t => t.status === 'Open').length,
        inProgressCount: spaTickets.filter(t => t.status === 'In Progress').length,
        doneCount: spaTickets.filter(t => t.status === 'Done').length,
        monthArrivals: arrivalsBySpa[spa.id] || 0,
      };
    });

  const activeFilterCount = [filterPod, filterCountry, filterTier, filterGoal].filter(Boolean).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{allSpas.length} spas</p>
        </div>
        {/* Month navigator */}
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{getMonthLabel(monthDate)}</span>
          </div>
          <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-10"
          placeholder="Search by name, location, or team member..."
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />

        {/* My Pod */}
        <button
          onClick={() => setFilterPod(v => !v)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            filterPod
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'
          }`}
        >
          My Pod
        </button>

        {/* Country */}
        {['USA', 'Canada'].map(c => (
          <button
            key={c}
            onClick={() => setFilterCountry(v => v === c ? '' : c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterCountry === c
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}
          >
            {c}
          </button>
        ))}

        <span className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

        {/* Tier */}
        {[1, 2, 3].map(t => (
          <button
            key={t}
            onClick={() => setFilterTier(v => v === String(t) ? '' : String(t))}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterTier === String(t)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}
          >
            Tier {t}
          </button>
        ))}

        <span className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

        {/* Goal Status */}
        {[
          { key: 'on-track', label: 'On Track', dot: 'bg-green-500' },
          { key: 'at-risk', label: 'At Risk', dot: 'bg-amber-500' },
          { key: 'behind', label: 'Behind', dot: 'bg-red-500' },
        ].map(g => (
          <button
            key={g.key}
            onClick={() => setFilterGoal(v => v === g.key ? '' : g.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              filterGoal === g.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filterGoal === g.key ? 'bg-white' : g.dot}`} />
            {g.label}
          </button>
        ))}

        {/* Clear all */}
        {activeFilterCount > 0 && (
          <button
            onClick={() => { setFilterPod(false); setFilterCountry(''); setFilterTier(''); setFilterGoal(''); }}
            className="px-2 py-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Results count */}
      {(activeFilterCount > 0 || search) && (
        <p className="text-xs text-gray-400 mb-3">{spas.length} of {allSpas.length} spas</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {spas.map(spa => {
          const hasGoals = spa.arrival_goal_min || spa.arrival_goal_target;
          return (
            <div
              key={spa.id}
              className="card p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
            >
              {/* Header — clickable to spa detail */}
              <div
                onClick={() => navigate(`/spas/${spa.id}`)}
                className="cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{spa.name}</h3>
                        {spa.tag && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-mono font-medium">{spa.tag}</span>
                        )}
                      </div>
                      {spa.location && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {spa.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{spa.country}</span>
                    {spa.tier && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TIER_DEFINITIONS[spa.tier]?.color || ''}`}>
                        T{spa.tier}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Goal status */}
              {hasGoals && (
                <div className="mb-3">
                  <SpaGoalStatus
                    arrivals={spa.monthArrivals}
                    goalMin={spa.arrival_goal_min}
                    goalTarget={spa.arrival_goal_target}
                  />
                </div>
              )}

              {/* Budget + Log arrival row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {spa.monthly_budget && (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium">
                      ${spa.monthly_budget.toLocaleString()}/mo
                    </span>
                  )}
                  {spa.payment_type === 'credit_card' && (
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      CC
                    </span>
                  )}
                  {(spa.payment_type || 'invoice') !== 'credit_card' && spa.payment_schedule && spa.payment_schedule !== 'monthly' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium capitalize">
                      {spa.payment_schedule}
                    </span>
                  )}
                </div>
                {showAdminFeatures && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setLogModal({ spaId: spa.id, spaName: spa.name }); setLogDate(new Date().toISOString().slice(0, 10)); setLogCount(''); setLogNotes(''); }}
                    className="flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Log Arrival
                  </button>
                )}
              </div>

              {/* Team */}
              {Object.values(spa.assigned_team || {}).flat().length > 0 && (
                <div className="py-2">
                  <SpaTeamBadges assignedTeam={spa.assigned_team} compact maxShow={5} />
                </div>
              )}

              {/* Tickets footer */}
              <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigate(`/spas/${spa.id}`)}>
                  <Ticket className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{spa.ticketCount} tickets</span>
                </div>
                {spa.openCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{spa.openCount} open</span>}
                {spa.inProgressCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{spa.inProgressCount} active</span>}
                {spa.doneCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{spa.doneCount} done</span>}
              </div>
            </div>
          );
        })}
      </div>

      {spas.length === 0 && (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No clients found</p>
        </div>
      )}

      {/* Log Arrival Modal */}
      {logModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Log Arrival</h3>
              <button onClick={() => setLogModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{logModal.spaName}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Number of Arrivals</label>
                <input
                  type="number"
                  value={logCount}
                  onChange={e => setLogCount(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 3"
                  min="0"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 2 walk-ins, 1 booked"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setLogModal(null)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleLogArrival} disabled={logSaving} className="btn-primary flex items-center gap-2 text-sm">
                  {logSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {logSaving ? 'Saving...' : 'Log'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
