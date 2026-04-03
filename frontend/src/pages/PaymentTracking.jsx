import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchSpas, updateSpa, fetchAllPaymentTracking, upsertPaymentTracking, fetchPaymentNotes, addPaymentNote, fetchBudgetReportsUpToMonth, fetchAllMonthAdjustments, fetchAppliedCreditsForMonth, createMonthAdjustment, updateAdjustmentStatus, deleteMonthAdjustment } from '../utils/api-service';
import { ChevronLeft, ChevronRight, Loader2, Send, CheckCircle, Clock, AlertTriangle, MessageSquare, ChevronDown, ChevronUp, CreditCard, Settings2, PlusCircle, MinusCircle, Wallet, ArrowRight, Undo2, Trash2 } from 'lucide-react';
import { format, addMonths, subMonths, getDaysInMonth } from 'date-fns';
import toast from 'react-hot-toast';

function monthToDate(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

function fmtUSD(val) {
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.\-]/g, '')) || 0;
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// Returns { count, periods: [{ period, label, deadline, amountDue }] }
function getPeriods(paymentSchedule, month, budget) {
  const [y, m] = month.split('-').map(Number);
  const totalDays = getDaysInMonth(new Date(y, m - 1));
  const schedule = paymentSchedule || 'monthly';

  if (schedule === 'weekly') {
    // 4 weekly periods
    const count = 4;
    const perPeriod = budget / count;
    return {
      count,
      periods: [
        { period: 1, label: 'Week 1', deadline: format(new Date(y, m - 1, 7), 'yyyy-MM-dd'), amountDue: perPeriod },
        { period: 2, label: 'Week 2', deadline: format(new Date(y, m - 1, 14), 'yyyy-MM-dd'), amountDue: perPeriod },
        { period: 3, label: 'Week 3', deadline: format(new Date(y, m - 1, 21), 'yyyy-MM-dd'), amountDue: perPeriod },
        { period: 4, label: 'Week 4', deadline: format(new Date(y, m - 1, totalDays), 'yyyy-MM-dd'), amountDue: perPeriod },
      ],
    };
  }

  if (schedule === 'biweekly') {
    const count = 2;
    const perPeriod = budget / count;
    return {
      count,
      periods: [
        { period: 1, label: '1st Half', deadline: format(new Date(y, m - 1, 15), 'yyyy-MM-dd'), amountDue: perPeriod },
        { period: 2, label: '2nd Half', deadline: format(new Date(y, m - 1, totalDays), 'yyyy-MM-dd'), amountDue: perPeriod },
      ],
    };
  }

  // monthly
  return {
    count: 1,
    periods: [
      { period: 1, label: 'Full Month', deadline: format(new Date(y, m - 1, totalDays), 'yyyy-MM-dd'), amountDue: budget },
    ],
  };
}

function isOverdue(deadline) {
  if (!deadline) return false;
  return new Date(deadline + 'T23:59:59') < new Date();
}

const STATUS_CONFIG = {
  paid: { label: 'Paid', icon: CheckCircle, bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', rowBg: 'bg-green-50/30 dark:bg-green-900/5' },
  pending: { label: 'Pending', icon: Clock, bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', rowBg: '' },
  overdue: { label: 'Overdue', icon: AlertTriangle, bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', rowBg: 'bg-red-50/30 dark:bg-red-900/5' },
};

const PAYMENT_TYPE_LABELS = { credit_card: 'Credit Card', invoice: 'Invoice' };
const SCHEDULE_LABELS = { weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly' };

export default function PaymentTracking() {
  const { user, isAdmin, isViewingAsOther, allUsers } = useAuth();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [spas, setSpas] = useState([]);
  const [payments, setPayments] = useState({});       // { spaId: { period: paymentRecord } }
  const [runningBalances, setRunningBalances] = useState({});
  const [notes, setNotes] = useState({});
  const [expandedNotes, setExpandedNotes] = useState({});
  const [expandedSpas, setExpandedSpas] = useState({}); // for multi-period accordion
  const [noteInputs, setNoteInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [savedIndicator, setSavedIndicator] = useState(null);
  const [editingSettings, setEditingSettings] = useState(null);
  const [adjustments, setAdjustments] = useState({});   // { spaId: [adjustments] }
  const [appliedCredits, setAppliedCredits] = useState({}); // credits applied TO this month from other months
  const [adjModal, setAdjModal] = useState(null);       // { spaId, type: 'add_budget'|'lower_budget'|'credit_hold' }
  const [adjAmount, setAdjAmount] = useState('');
  const [adjNote, setAdjNote] = useState('');

  const effectiveAdmin = isAdmin && !isViewingAsOther;
  const canEdit = effectiveAdmin || user?.department === 'Accounting';

  const flashSaved = (key) => {
    setSavedIndicator(key);
    setTimeout(() => setSavedIndicator(prev => prev === key ? null : prev), 2000);
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [allSpas, allPayments, historicalReports, allAdjustments, allAppliedCredits] = await Promise.all([
        fetchSpas(),
        fetchAllPaymentTracking(month),
        fetchBudgetReportsUpToMonth(month),
        fetchAllMonthAdjustments(month),
        fetchAppliedCreditsForMonth(month),
      ]);

      allSpas.sort((a, b) => a.name.localeCompare(b.name));
      setSpas(allSpas);

      // Build payments map: { spaId: { periodNum: record } }
      const payMap = {};
      for (const p of allPayments) {
        if (!payMap[p.spa_id]) payMap[p.spa_id] = {};
        payMap[p.spa_id][p.period || 1] = p;
      }
      setPayments(payMap);

      // Running balances
      const spendByMonth = {};
      for (const r of historicalReports) {
        if (!spendByMonth[r.spa_id]) spendByMonth[r.spa_id] = {};
        spendByMonth[r.spa_id][r.month] = (spendByMonth[r.spa_id][r.month] || 0) + (r.actual_spend || 0);
      }
      const balances = {};
      for (const spa of allSpas) {
        const budget = spa.monthly_budget || 0;
        const months = Object.keys(spendByMonth[spa.id] || {}).sort();
        let cumulative = 0;
        for (const m of months) {
          cumulative += budget - (spendByMonth[spa.id][m] || 0);
        }
        balances[spa.id] = cumulative;
      }
      setRunningBalances(balances);

      // Build adjustments map: { spaId: [adj1, adj2, ...] }
      const adjMap = {};
      for (const adj of allAdjustments) {
        if (!adjMap[adj.spa_id]) adjMap[adj.spa_id] = [];
        adjMap[adj.spa_id].push(adj);
      }
      setAdjustments(adjMap);

      // Applied credits from other months TO this month
      const creditMap = {};
      for (const c of allAppliedCredits) {
        if (!creditMap[c.spa_id]) creditMap[c.spa_id] = [];
        creditMap[c.spa_id].push(c);
      }
      setAppliedCredits(creditMap);

      // Load notes
      const notesMap = {};
      for (const spa of allSpas) {
        try {
          notesMap[spa.id] = await fetchPaymentNotes(spa.id, month);
        } catch { notesMap[spa.id] = []; }
      }
      setNotes(notesMap);
    } catch (err) {
      console.error('Failed to load payment tracking:', err);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Handlers ───

  const handleStatusChange = async (spaId, period, newStatus) => {
    const key = `status-${spaId}-${period}`;
    setSaving(key);
    try {
      const fields = { status: newStatus };
      if (newStatus === 'paid') fields.paid_at = new Date().toISOString();
      else fields.paid_at = null;
      await upsertPaymentTracking(spaId, month, fields, user.id, period);
      flashSaved(`card-${spaId}`);
      await loadData(true);
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setSaving(null);
    }
  };

  const handleDeadlineChange = async (spaId, period, deadline) => {
    const key = `deadline-${spaId}-${period}`;
    setSaving(key);
    try {
      await upsertPaymentTracking(spaId, month, { deadline }, user.id, period);
      flashSaved(`card-${spaId}`);
      await loadData(true);
    } catch (err) {
      toast.error('Failed to update deadline');
    } finally {
      setSaving(null);
    }
  };

  const handleAmountPaid = async (spaId, period, value) => {
    const num = parseFloat(String(value).replace(/[^0-9.\-]/g, '')) || 0;
    if (num <= 0) return;
    const key = `amount-${spaId}-${period}`;
    setSaving(key);
    try {
      await upsertPaymentTracking(spaId, month, { amount_paid: num }, user.id, period);
      flashSaved(`card-${spaId}`);
      await loadData(true);
    } catch (err) {
      toast.error('Failed to save amount');
    } finally {
      setSaving(null);
    }
  };

  const handleAmountDue = async (spaId, period, value) => {
    const num = parseFloat(String(value).replace(/[^0-9.\-]/g, '')) || 0;
    if (num < 0) return;
    const key = `due-${spaId}-${period}`;
    setSaving(key);
    try {
      await upsertPaymentTracking(spaId, month, { amount_due: num }, user.id, period);
      flashSaved(`card-${spaId}`);
      await loadData(true);
    } catch (err) {
      toast.error('Failed to update amount due');
    } finally {
      setSaving(null);
    }
  };

  const handleAddNote = async (spaId) => {
    const text = (noteInputs[spaId] || '').trim();
    if (!text) return;
    setSaving(`note-${spaId}`);
    try {
      await addPaymentNote(spaId, month, text, user.id);
      setNoteInputs(prev => ({ ...prev, [spaId]: '' }));
      const updated = await fetchPaymentNotes(spaId, month);
      setNotes(prev => ({ ...prev, [spaId]: updated }));
      toast.success('Note added');
    } catch (err) {
      toast.error('Failed to add note');
    } finally {
      setSaving(null);
    }
  };

  const handlePaymentTypeChange = async (spaId, newType) => {
    setSaving(`type-${spaId}`);
    try {
      await updateSpa(spaId, { payment_type: newType });
      toast.success(`Changed to ${PAYMENT_TYPE_LABELS[newType]}`);
      setEditingSettings(null);
      await loadData(true);
    } catch (err) {
      toast.error('Failed to update payment type');
    } finally {
      setSaving(null);
    }
  };

  const handleScheduleChange = async (spaId, newSchedule) => {
    setSaving(`schedule-${spaId}`);
    try {
      await updateSpa(spaId, { payment_schedule: newSchedule });
      toast.success(`Changed to ${SCHEDULE_LABELS[newSchedule]}`);
      await loadData(true);
    } catch (err) {
      toast.error('Failed to update schedule');
    } finally {
      setSaving(null);
    }
  };

  // ─── Adjustment handlers ───

  const handleCreateAdjustment = async () => {
    if (!adjModal || !adjAmount) return;
    const num = parseFloat(String(adjAmount).replace(/[^0-9.]/g, '')) || 0;
    if (num <= 0) return;
    setSaving('adj');
    try {
      await createMonthAdjustment(adjModal.spaId, month, adjModal.type, num, adjNote, user.id);
      const label = adjModal.type === 'add_budget' ? 'Budget added' : adjModal.type === 'lower_budget' ? 'Budget lowered' : 'Credit saved';
      toast.success(label);
      setAdjModal(null);
      setAdjAmount('');
      setAdjNote('');
      await loadData(true);
    } catch (err) {
      toast.error('Failed to save adjustment');
    } finally {
      setSaving(null);
    }
  };

  const handleApplyCredit = async (adjId, targetMonth) => {
    setSaving(`apply-${adjId}`);
    try {
      await updateAdjustmentStatus(adjId, 'applied', targetMonth);
      toast.success('Credit applied to next month');
      await loadData(true);
    } catch (err) {
      toast.error('Failed to apply credit');
    } finally {
      setSaving(null);
    }
  };

  const handleReturnCredit = async (adjId) => {
    setSaving(`return-${adjId}`);
    try {
      await updateAdjustmentStatus(adjId, 'returned');
      toast.success('Credit returned');
      await loadData(true);
    } catch (err) {
      toast.error('Failed to return credit');
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteAdjustment = async (adjId) => {
    setSaving(`del-${adjId}`);
    try {
      await deleteMonthAdjustment(adjId);
      toast.success('Removed');
      await loadData(true);
    } catch (err) {
      toast.error('Failed to remove');
    } finally {
      setSaving(null);
    }
  };

  // ─── Helpers ───

  const getEffectiveBudget = (spaId, baseBudget) => {
    const spaAdj = adjustments[spaId] || [];
    const incoming = appliedCredits[spaId] || [];
    let effective = baseBudget;
    for (const a of spaAdj) {
      if (a.type === 'add_budget' && a.status === 'active') effective += a.amount;
      if (a.type === 'lower_budget' && a.status === 'active') effective -= a.amount;
      if (a.type === 'credit_hold' && a.status === 'active') effective -= a.amount;
    }
    // Add credits applied from other months
    for (const c of incoming) effective += c.amount;
    return Math.max(0, effective);
  };

  const getNextMonth = () => format(addMonths(monthToDate(month), 1), 'yyyy-MM');

  const prevMonth = () => setMonth(format(subMonths(monthToDate(month), 1), 'yyyy-MM'));
  const nextMonth = () => setMonth(format(addMonths(monthToDate(month), 1), 'yyyy-MM'));

  const toggleNotes = (spaId) => setExpandedNotes(prev => ({ ...prev, [spaId]: !prev[spaId] }));
  const toggleSpa = (spaId) => setExpandedSpas(prev => ({ ...prev, [spaId]: !prev[spaId] }));

  // ─── Derived data ───

  const trackableSpas = spas.filter(s => (s.payment_type || 'invoice') !== 'credit_card');
  const creditCardSpas = spas.filter(s => (s.payment_type || 'invoice') === 'credit_card');

  // Stats: count individual periods across all trackable spas
  let totalPaidPeriods = 0, totalOverduePeriods = 0, totalPendingPeriods = 0;
  for (const spa of trackableSpas) {
    const effBudget = getEffectiveBudget(spa.id, spa.monthly_budget || 0);
    const { periods } = getPeriods(spa.payment_schedule, month, effBudget);
    const spaPayments = payments[spa.id] || {};
    for (const pd of periods) {
      const p = spaPayments[pd.period] || {};
      const dl = p.deadline || pd.deadline;
      if (p.status === 'paid') totalPaidPeriods++;
      else if (isOverdue(dl)) totalOverduePeriods++;
      else totalPendingPeriods++;
    }
  }

  // ─── Period row renderer ───

  const renderPeriodRow = (spa, pd, spaPayments, isOnly) => {
    const p = spaPayments[pd.period] || {};
    const deadline = p.deadline || pd.deadline;
    const overdue = p.status !== 'paid' && isOverdue(deadline);
    const status = p.status === 'paid' ? 'paid' : overdue ? 'overdue' : 'pending';
    const statusCfg = STATUS_CONFIG[status];
    const StatusIcon = statusCfg.icon;

    return (
      <div key={pd.period} className={`flex items-center gap-3 flex-wrap py-2 ${!isOnly ? 'border-t border-gray-100 dark:border-gray-700/50 first:border-0' : ''}`}>
        {/* Period label */}
        {!isOnly && (
          <div className="min-w-[70px]">
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">{pd.label}</span>
          </div>
        )}

        {/* Amount due for this period — editable, falls back to calculated */}
        <div className="text-center min-w-[80px]">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Due</p>
          {canEdit ? (
            <input
              type="text"
              inputMode="decimal"
              defaultValue={(() => {
                const saved = p.amount_due;
                return (saved && saved > 0) ? saved.toLocaleString('en-US', { minimumFractionDigits: 2 }) : pd.amountDue > 0 ? pd.amountDue.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '';
              })()}
              onBlur={(e) => {
                const num = parseFloat(String(e.target.value).replace(/[^0-9.\-]/g, '')) || 0;
                if (num >= 0) {
                  e.target.value = num > 0 ? num.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '';
                  handleAmountDue(spa.id, pd.period, num);
                }
              }}
              placeholder={pd.amountDue > 0 ? pd.amountDue.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
              className="input-field text-xs py-1 text-center w-24 mt-0.5"
            />
          ) : (
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {(() => {
                const display = (p.amount_due && p.amount_due > 0) ? p.amount_due : pd.amountDue;
                return display > 0 ? fmtUSD(display) : '—';
              })()}
            </p>
          )}
        </div>

        {/* Amount paid */}
        <div className="text-center min-w-[100px]">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Paid</p>
          {canEdit ? (
            <input
              type="text"
              inputMode="decimal"
              defaultValue={p.amount_paid > 0 ? p.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
              onBlur={(e) => {
                const num = parseFloat(String(e.target.value).replace(/[^0-9.\-]/g, '')) || 0;
                if (num > 0) {
                  e.target.value = num.toLocaleString('en-US', { minimumFractionDigits: 2 });
                  handleAmountPaid(spa.id, pd.period, num);
                }
              }}
              placeholder="0.00"
              className="input-field text-xs py-1 text-center w-24 mt-0.5"
            />
          ) : (
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {(p.amount_paid || 0) > 0 ? fmtUSD(p.amount_paid) : '—'}
            </p>
          )}
        </div>

        {/* Deadline */}
        <div className="text-center min-w-[110px]">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Deadline</p>
          {canEdit ? (
            <input
              type="date"
              value={deadline}
              onChange={(e) => handleDeadlineChange(spa.id, pd.period, e.target.value)}
              className={`input-field text-xs py-1 text-center w-[120px] mt-0.5 ${overdue ? 'border-red-300 dark:border-red-600' : ''}`}
            />
          ) : (
            <p className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
              {format(new Date(deadline + 'T12:00:00'), 'MMM d')}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="text-center min-w-[110px]">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Status</p>
          {canEdit ? (
            <div className="flex gap-1 mt-0.5">
              {['pending', 'paid', 'overdue'].map(s => {
                const cfg = STATUS_CONFIG[s];
                const isActive = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(spa.id, pd.period, s)}
                    disabled={saving === `status-${spa.id}-${pd.period}`}
                    className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
                      isActive ? cfg.bg : 'bg-gray-50 text-gray-400 dark:bg-gray-700/50 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusCfg.bg}`}>
              <StatusIcon className="w-3 h-3" /> {statusCfg.label}
            </span>
          )}
        </div>
      </div>
    );
  };

  // ─── Render ───

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Tracking</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[110px] text-center">
            {format(monthToDate(month), 'MMMM yyyy')}
          </span>
          <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats bar — counts individual payment periods */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Paid</p>
          <p className="text-2xl font-bold text-green-600">{totalPaidPeriods}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{totalPendingPeriods}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{totalOverduePeriods}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : spas.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">No clients found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* ─── Credit Card clients — simplified ─── */}
          {creditCardSpas.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-2 mb-1">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Credit Card — No Follow-up Needed</span>
                <span className="text-[10px] text-gray-400">({creditCardSpas.length})</span>
              </div>
              {creditCardSpas.map(spa => {
                const budget = getEffectiveBudget(spa.id, spa.monthly_budget || 0);
                const [y, m] = month.split('-').map(Number);
                const totalDays = getDaysInMonth(new Date(y, m - 1));
                const dailyPace = totalDays > 0 ? budget / totalDays : 0;
                const balance = runningBalances[spa.id] || 0;
                const isSettingsOpen = editingSettings === spa.id;

                return (
                  <div key={spa.id} className="card overflow-hidden bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="p-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="min-w-[180px] flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white">{spa.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Credit Card
                            </span>
                            {canEdit && (
                              <button onClick={() => setEditingSettings(isSettingsOpen ? null : spa.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <Settings2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {spa.location && <p className="text-[11px] text-gray-400">{spa.location}</p>}
                        </div>
                        <div className="text-center min-w-[90px]">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Monthly</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{budget > 0 ? fmtUSD(budget) : '—'}</p>
                        </div>
                        <div className="text-center min-w-[90px]">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Daily Pace</p>
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{dailyPace > 0 ? `${fmtUSD(dailyPace)}/d` : '—'}</p>
                        </div>
                        <div className="text-center min-w-[90px]">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Credit/Debit</p>
                          <p className={`text-sm font-bold ${
                            balance === 0 ? 'text-gray-400' : balance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {balance !== 0 ? fmtUSD(balance) : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Inline settings editor */}
                      {isSettingsOpen && canEdit && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Payment Type:</span>
                          <select
                            value={spa.payment_type || 'credit_card'}
                            onChange={(e) => handlePaymentTypeChange(spa.id, e.target.value)}
                            disabled={saving === `type-${spa.id}`}
                            className="input-field text-xs py-1 w-auto"
                          >
                            <option value="credit_card">Credit Card</option>
                            <option value="invoice">Invoice</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ─── Invoice clients — full tracking with periods ─── */}
          {trackableSpas.length > 0 && (
            <>
              {creditCardSpas.length > 0 && (
                <div className="flex items-center gap-2 mt-4 mb-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Invoice — Follow-up Required</span>
                  <span className="text-[10px] text-gray-400">({trackableSpas.length})</span>
                </div>
              )}
              {trackableSpas.map(spa => {
                const baseBudget = spa.monthly_budget || 0;
                const effectiveBudget = getEffectiveBudget(spa.id, baseBudget);
                const { periods, count: periodCount } = getPeriods(spa.payment_schedule, month, effectiveBudget);
                const spaPayments = payments[spa.id] || {};
                const balance = runningBalances[spa.id] || 0;
                const spaNotes = notes[spa.id] || [];
                const spaAdj = adjustments[spa.id] || [];
                const spaAppliedCredits = appliedCredits[spa.id] || [];
                const activeAdj = spaAdj.filter(a => a.status === 'active');
                const activeHolds = activeAdj.filter(a => a.type === 'credit_hold');
                const activeBudgetAdj = activeAdj.filter(a => a.type === 'add_budget' || a.type === 'lower_budget');
                const isNotesExpanded = expandedNotes[spa.id];
                const isSpaExpanded = expandedSpas[spa.id] === true;
                const latestNote = spaNotes[0];
                const daysSinceNote = latestNote ? Math.floor((Date.now() - new Date(latestNote.created_at).getTime()) / 86400000) : null;
                const noteAuthor = latestNote ? (allUsers || []).find(u => u.id === latestNote.created_by)?.name : null;
                const isSettingsOpen = editingSettings === spa.id;

                // Overall status for card color: worst across all periods
                const periodStatuses = periods.map(pd => {
                  const p = spaPayments[pd.period] || {};
                  const dl = p.deadline || pd.deadline;
                  if (p.status === 'paid') return 'paid';
                  if (isOverdue(dl)) return 'overdue';
                  return 'pending';
                });
                const worstStatus = periodStatuses.includes('overdue') ? 'overdue' : periodStatuses.includes('pending') ? 'pending' : 'paid';
                const cardBg = STATUS_CONFIG[worstStatus].rowBg;

                // Summary: paid count / total
                const paidPeriodCount = periodStatuses.filter(s => s === 'paid').length;

                return (
                  <div key={spa.id} className={`card overflow-hidden ${cardBg}`}>
                    {/* Header row */}
                    <div className="p-4">
                      <div className="flex items-start gap-4 flex-wrap">
                        {/* Client info + badges */}
                        <div className="min-w-[180px] flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white">{spa.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                              Invoice
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${
                              spa.payment_schedule === 'weekly' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              spa.payment_schedule === 'biweekly' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                              'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {spa.payment_schedule || 'monthly'}
                            </span>
                            {periodCount > 1 && (
                              <span className="text-[10px] text-gray-400">
                                {paidPeriodCount}/{periodCount} paid
                              </span>
                            )}
                            {canEdit && (
                              <button onClick={() => setEditingSettings(isSettingsOpen ? null : spa.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <Settings2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {savedIndicator === `card-${spa.id}` && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1 animate-pulse">
                                <CheckCircle className="w-3 h-3" /> Saved
                              </span>
                            )}
                          </div>
                          {spa.location && <p className="text-[11px] text-gray-400">{spa.location}</p>}
                        </div>

                        {/* Budget (effective, with adjustment indicator) */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                            {periodCount > 1 ? 'Monthly' : 'Due'}
                          </p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {effectiveBudget > 0 ? fmtUSD(effectiveBudget) : '—'}
                          </p>
                          {effectiveBudget !== baseBudget && baseBudget > 0 && (
                            <p className={`text-[9px] ${effectiveBudget > baseBudget ? 'text-green-600' : 'text-red-500'}`}>
                              base {fmtUSD(baseBudget)} {effectiveBudget > baseBudget ? `+${fmtUSD(effectiveBudget - baseBudget)}` : fmtUSD(effectiveBudget - baseBudget)}
                            </p>
                          )}
                        </div>

                        {/* Running balance */}
                        <div className="text-center min-w-[90px]">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Credit/Debit</p>
                          <p className={`text-sm font-bold ${
                            balance === 0 ? 'text-gray-400' : balance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {balance !== 0 ? fmtUSD(balance) : '—'}
                          </p>
                        </div>

                        {/* Single period: render inline */}
                        {periodCount === 1 && (
                          <>
                            {/* Amount paid */}
                            <div className="text-center min-w-[100px]">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Paid</p>
                              {canEdit ? (
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  defaultValue={(spaPayments[1]?.amount_paid || 0) > 0 ? spaPayments[1].amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                                  onBlur={(e) => {
                                    const num = parseFloat(String(e.target.value).replace(/[^0-9.\-]/g, '')) || 0;
                                    if (num > 0) {
                                      e.target.value = num.toLocaleString('en-US', { minimumFractionDigits: 2 });
                                      handleAmountPaid(spa.id, 1, num);
                                    }
                                  }}
                                  placeholder="0.00"
                                  className="input-field text-xs py-1 text-center w-24 mt-0.5"
                                />
                              ) : (
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                  {(spaPayments[1]?.amount_paid || 0) > 0 ? fmtUSD(spaPayments[1].amount_paid) : '—'}
                                </p>
                              )}
                            </div>

                            {/* Deadline */}
                            <div className="text-center min-w-[110px]">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Deadline</p>
                              {(() => {
                                const p1 = spaPayments[1] || {};
                                const dl = p1.deadline || periods[0].deadline;
                                const ov = p1.status !== 'paid' && isOverdue(dl);
                                return canEdit ? (
                                  <input type="date" value={dl} onChange={(e) => handleDeadlineChange(spa.id, 1, e.target.value)} className={`input-field text-xs py-1 text-center w-[120px] mt-0.5 ${ov ? 'border-red-300 dark:border-red-600' : ''}`} />
                                ) : (
                                  <p className={`text-sm font-medium ${ov ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>{format(new Date(dl + 'T12:00:00'), 'MMM d')}</p>
                                );
                              })()}
                            </div>

                            {/* Status */}
                            <div className="text-center min-w-[110px]">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Status</p>
                              {(() => {
                                const p1 = spaPayments[1] || {};
                                const dl = p1.deadline || periods[0].deadline;
                                const ov = p1.status !== 'paid' && isOverdue(dl);
                                const st = p1.status === 'paid' ? 'paid' : ov ? 'overdue' : 'pending';
                                const stCfg = STATUS_CONFIG[st];
                                const StIcon = stCfg.icon;
                                return canEdit ? (
                                  <div className="flex gap-1 mt-0.5">
                                    {['pending', 'paid', 'overdue'].map(s => {
                                      const cfg = STATUS_CONFIG[s];
                                      return (
                                        <button key={s} onClick={() => handleStatusChange(spa.id, 1, s)} disabled={saving === `status-${spa.id}-1`}
                                          className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${st === s ? cfg.bg : 'bg-gray-50 text-gray-400 dark:bg-gray-700/50 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                          {cfg.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${stCfg.bg}`}>
                                    <StIcon className="w-3 h-3" /> {stCfg.label}
                                  </span>
                                );
                              })()}
                            </div>
                          </>
                        )}

                        {/* Multi-period: toggle to expand */}
                        {periodCount > 1 && (
                          <button onClick={() => toggleSpa(spa.id)} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors mt-1 ${
                            isSpaExpanded
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}>
                            {isSpaExpanded ? 'Collapse' : `${periodCount} payments`}
                            {isSpaExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}

                        {/* Notes toggle */}
                        <button
                          onClick={() => toggleNotes(spa.id)}
                          className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors mt-1 ${
                            isNotesExpanded ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            spaNotes.length > 0 ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
                            'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {spaNotes.length > 0 ? spaNotes.length : ''}
                          {isNotesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Settings editor (inline) */}
                      {isSettingsOpen && canEdit && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Type:</span>
                            <select value={spa.payment_type || 'invoice'} onChange={(e) => handlePaymentTypeChange(spa.id, e.target.value)} disabled={saving === `type-${spa.id}`} className="input-field text-xs py-1 w-auto">
                              <option value="credit_card">Credit Card</option>
                              <option value="invoice">Invoice</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Schedule:</span>
                            <select value={spa.payment_schedule || 'monthly'} onChange={(e) => handleScheduleChange(spa.id, e.target.value)} disabled={saving === `schedule-${spa.id}`} className="input-field text-xs py-1 w-auto">
                              <option value="weekly">Weekly (4 payments)</option>
                              <option value="biweekly">Biweekly (2 payments)</option>
                              <option value="monthly">Monthly (1 payment)</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Budget action buttons */}
                      {canEdit && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => { setAdjModal({ spaId: spa.id, type: 'add_budget' }); setAdjAmount(''); setAdjNote(''); }}
                              className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors">
                              <PlusCircle className="w-3 h-3" /> Add Budget
                            </button>
                            <button onClick={() => { setAdjModal({ spaId: spa.id, type: 'lower_budget' }); setAdjAmount(''); setAdjNote(''); }}
                              className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors">
                              <MinusCircle className="w-3 h-3" /> Lower Budget
                            </button>
                            <button onClick={() => { setAdjModal({ spaId: spa.id, type: 'credit_hold' }); setAdjAmount(''); setAdjNote(''); }}
                              className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30 transition-colors">
                              <Wallet className="w-3 h-3" /> Save as Credit
                            </button>
                          </div>

                          {/* Active adjustments tags */}
                          {activeBudgetAdj.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {activeBudgetAdj.map(a => (
                                <span key={a.id} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${
                                  a.type === 'add_budget' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {a.type === 'add_budget' ? '+' : '-'}{fmtUSD(a.amount)}
                                  {a.note && <span className="text-[9px] opacity-70">({a.note})</span>}
                                  <button onClick={() => handleDeleteAdjustment(a.id)} className="ml-0.5 hover:opacity-70"><Trash2 className="w-2.5 h-2.5" /></button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Credit holds */}
                          {activeHolds.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {activeHolds.map(h => (
                                <div key={h.id} className="flex items-center gap-2 text-xs bg-yellow-50 dark:bg-yellow-900/10 rounded-lg px-3 py-2">
                                  <Wallet className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                  <span className="font-semibold text-yellow-700 dark:text-yellow-400">{fmtUSD(h.amount)} held</span>
                                  {h.note && <span className="text-[10px] text-yellow-600 dark:text-yellow-500">— {h.note}</span>}
                                  <div className="flex items-center gap-1 ml-auto">
                                    <button onClick={() => handleApplyCredit(h.id, getNextMonth())} disabled={saving === `apply-${h.id}`}
                                      className="flex items-center gap-0.5 text-[10px] font-medium px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 transition-colors">
                                      <ArrowRight className="w-3 h-3" /> Apply Next Month
                                    </button>
                                    <button onClick={() => handleReturnCredit(h.id)} disabled={saving === `return-${h.id}`}
                                      className="flex items-center gap-0.5 text-[10px] font-medium px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 transition-colors">
                                      <Undo2 className="w-3 h-3" /> Return
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Applied credits from other months */}
                          {spaAppliedCredits.length > 0 && (
                            <div className="mt-2">
                              {spaAppliedCredits.map(c => (
                                <div key={c.id} className="flex items-center gap-2 text-[10px] text-blue-600 dark:text-blue-400">
                                  <ArrowRight className="w-3 h-3" />
                                  <span>+{fmtUSD(c.amount)} credit from {format(monthToDate(c.month), 'MMM yyyy')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Multi-period rows */}
                      {periodCount > 1 && isSpaExpanded && (
                        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                          {periods.map(pd => renderPeriodRow(spa, pd, spaPayments, false))}
                        </div>
                      )}

                      {/* Latest note preview (collapsed) */}
                      {!isNotesExpanded && latestNote && (
                        <div className="mt-2 pl-1 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                          <span className="truncate max-w-[400px]">{latestNote.note}</span>
                          <span className="flex-shrink-0">— {noteAuthor || 'Unknown'}</span>
                          {daysSinceNote != null && (
                            <span className={`flex-shrink-0 ${daysSinceNote > 7 ? 'text-red-500' : daysSinceNote > 3 ? 'text-yellow-500' : 'text-gray-400'}`}>
                              {daysSinceNote === 0 ? 'today' : `${daysSinceNote}d ago`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expanded notes section */}
                    {isNotesExpanded && (
                      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 px-4 py-3">
                        {canEdit && (
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              value={noteInputs[spa.id] || ''}
                              onChange={(e) => setNoteInputs(prev => ({ ...prev, [spa.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(spa.id); }}
                              placeholder="Add a note..."
                              className="input-field text-xs py-1.5 flex-1"
                            />
                            <button
                              onClick={() => handleAddNote(spa.id)}
                              disabled={!(noteInputs[spa.id] || '').trim() || saving === `note-${spa.id}`}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-colors flex items-center gap-1"
                            >
                              {saving === `note-${spa.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                        {spaNotes.length > 0 ? (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {spaNotes.map(n => {
                              const author = (allUsers || []).find(u => u.id === n.created_by)?.name || 'Unknown';
                              return (
                                <div key={n.id} className="flex gap-2 text-xs">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-gray-700 dark:text-gray-300">{n.note}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                      {author} · {format(new Date(n.created_at), 'MMM d, h:mm a')}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No notes yet</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
      {/* Adjustment Modal */}
      {adjModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAdjModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              {adjModal.type === 'add_budget' && <><PlusCircle className="w-4 h-4 text-green-600" /> Add Budget</>}
              {adjModal.type === 'lower_budget' && <><MinusCircle className="w-4 h-4 text-red-600" /> Lower Budget</>}
              {adjModal.type === 'credit_hold' && <><Wallet className="w-4 h-4 text-yellow-600" /> Save as Credit</>}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {adjModal.type === 'add_budget' && 'Add extra budget for this month. Daily pace will be recalculated.'}
              {adjModal.type === 'lower_budget' && 'Reduce budget for this month. Daily pace will be recalculated.'}
              {adjModal.type === 'credit_hold' && 'Hold this amount from the budget for a future month. Client can request it back anytime.'}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Amount ($)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAdjustment(); }}
                  placeholder="0.00"
                  className="input-field text-sm py-2 w-full"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={adjNote}
                  onChange={(e) => setAdjNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAdjustment(); }}
                  placeholder="Reason..."
                  className="input-field text-xs py-1.5 w-full"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setAdjModal(null)} className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateAdjustment} disabled={saving === 'adj' || !adjAmount}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg text-white transition-colors disabled:opacity-50 ${
                  adjModal.type === 'add_budget' ? 'bg-green-600 hover:bg-green-700' :
                  adjModal.type === 'lower_budget' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-yellow-600 hover:bg-yellow-700'
                }`}>
                {saving === 'adj' ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
