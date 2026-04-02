import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchBudgetReports, upsertBudgetReport } from '../../utils/api-service';
import { Loader2, Save, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, addMonths, subMonths, getDaysInMonth } from 'date-fns';
import toast from 'react-hot-toast';

function parseCurrency(val) {
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(/[^0-9.\-]/g, '')) || 0;
}

function fmtUSD(val) {
  return parseCurrency(val).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// Stage definitions: returns date ranges for a given month
function getStages(month) {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = getDaysInMonth(new Date(y, m - 1));
  return [
    { stage: 1, label: 'Stage 1', range: `1st – 15th`, days: 15, startDay: 1, endDay: 15 },
    { stage: 2, label: 'Stage 2', range: `16th – 25th`, days: 10, startDay: 16, endDay: 25 },
    { stage: 3, label: 'Stage 3', range: `26th – ${daysInMonth}${daysInMonth === 28 ? 'th' : daysInMonth === 30 ? 'th' : 'st'}`, days: daysInMonth - 25, startDay: 26, endDay: daysInMonth },
  ];
}

// Which stage is "current" based on today's date
function getCurrentStage(month) {
  const today = new Date();
  const currentMonth = format(today, 'yyyy-MM');
  if (month !== currentMonth) return null;
  const day = today.getDate();
  if (day <= 15) return 1;
  if (day <= 25) return 2;
  return 3;
}

export default function BudgetPacing({ spa, month, onMonthChange }) {
  const { user, isAdmin, isViewingAsOther } = useAuth();
  const effectiveAdmin = isAdmin && !isViewingAsOther;
  const [reports, setReports] = useState({});
  const [editValues, setEditValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  // Marketing + Admin can edit; Accounting can view read-only; others hidden
  const canView = effectiveAdmin || user?.department === 'Marketing' || user?.department === 'Accounting';
  const canEdit = effectiveAdmin || user?.department === 'Marketing';

  if (!canView) return null;

  const budget = spa.monthly_budget || 0;
  const stages = getStages(month);
  const totalDays = stages.reduce((s, st) => s + st.days, 0);
  const dailyPace = totalDays > 0 ? budget / totalDays : 0;
  const currentStage = getCurrentStage(month);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBudgetReports(spa.id, month);
      const map = {};
      for (const r of data) map[r.stage] = r;
      setReports(map);
      // Init edit values from saved data
      const edits = {};
      for (const s of [1, 2, 3]) {
        edits[s] = {
          spend: map[s]?.actual_spend != null ? map[s].actual_spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
          notes: map[s]?.notes || '',
        };
      }
      setEditValues(edits);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [spa.id, month]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleSaveStage = async (stageNum) => {
    setSaving(stageNum);
    try {
      const val = editValues[stageNum];
      await upsertBudgetReport(spa.id, month, stageNum, val.spend, val.notes, user.id);
      toast.success(`Stage ${stageNum} saved`);
      await loadReports();
    } catch (err) {
      toast.error('Failed to save');
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  const updateEdit = (stageNum, field, value) => {
    setEditValues(prev => ({ ...prev, [stageNum]: { ...prev[stageNum], [field]: value } }));
  };

  // Cumulative calculations
  const getCumulativeExpected = (stageNum) => {
    let days = 0;
    for (const s of stages) {
      days += s.days;
      if (s.stage === stageNum) break;
    }
    return dailyPace * days;
  };

  const getCumulativeActual = (stageNum) => {
    let total = 0;
    for (let s = 1; s <= stageNum; s++) {
      total += (reports[s]?.actual_spend || 0);
    }
    return total;
  };

  const totalSpent = getCumulativeActual(3);
  const credit = budget - totalSpent;

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
          Budget Pacing & 3-Stage Report
        </h3>
        {onMonthChange && (
          <div className="flex items-center gap-2">
            <button onClick={() => onMonthChange(format(subMonths(new Date(month + '-01'), 1), 'yyyy-MM'))} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[100px] text-center">
              {format(new Date(month + '-01'), 'MMM yyyy')}
            </span>
            <button onClick={() => onMonthChange(format(addMonths(new Date(month + '-01'), 1), 'yyyy-MM'))} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Daily pace summary */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4 px-1">
        <span>Monthly budget: <strong className="text-gray-700 dark:text-gray-300">{fmtUSD(budget)}</strong></span>
        <span>Daily pace: <strong className="text-gray-700 dark:text-gray-300">{fmtUSD(dailyPace)}/day</strong></span>
        <span>{totalDays} days</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Stages */}
          <div className="space-y-3 mb-4">
            {stages.map((s) => {
              const expected = getCumulativeExpected(s.stage);
              const stageExpected = dailyPace * s.days;
              const actual = reports[s.stage]?.actual_spend;
              const hasData = actual != null && actual > 0;
              const cumulativeActual = getCumulativeActual(s.stage);
              const diff = hasData ? stageExpected - actual : null;
              const isCurrent = currentStage === s.stage;
              const isPast = currentStage ? s.stage < currentStage : false;
              const isFuture = currentStage ? s.stage > currentStage : false;
              const isDirty = editValues[s.stage]?.spend !== (reports[s.stage]?.actual_spend != null ? reports[s.stage].actual_spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '') || editValues[s.stage]?.notes !== (reports[s.stage]?.notes || '');

              return (
                <div key={s.stage} className={`border rounded-lg p-4 transition-colors ${
                  isCurrent
                    ? 'border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'border-gray-200 dark:border-gray-700'
                }`}>
                  {/* Stage header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{s.label}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{s.range}</span>
                      <span className="text-[10px] text-gray-400">({s.days} days)</span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">Current</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Expected: <strong>{fmtUSD(stageExpected)}</strong>
                    </span>
                  </div>

                  {/* Progress bar */}
                  {hasData && (
                    <div className="mb-2">
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            actual > stageExpected * 1.05 ? 'bg-red-500' : actual < stageExpected * 0.95 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((actual / stageExpected) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Input row */}
                  <div className="flex items-center gap-3">
                    {canEdit ? (
                      <>
                        <div className="flex-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editValues[s.stage]?.spend || ''}
                            onChange={(e) => updateEdit(s.stage, 'spend', e.target.value)}
                            onBlur={() => {
                              const num = parseCurrency(editValues[s.stage]?.spend);
                              if (num > 0) updateEdit(s.stage, 'spend', num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                            }}
                            onFocus={(e) => {
                              const num = parseCurrency(editValues[s.stage]?.spend);
                              if (num > 0) updateEdit(s.stage, 'spend', String(num));
                              setTimeout(() => e.target.select(), 0);
                            }}
                            placeholder="Actual spend..."
                            className="input-field text-sm py-1.5"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={editValues[s.stage]?.notes || ''}
                            onChange={(e) => updateEdit(s.stage, 'notes', e.target.value)}
                            placeholder="Notes (optional)"
                            className="input-field text-sm py-1.5"
                          />
                        </div>
                        <button
                          onClick={() => handleSaveStage(s.stage)}
                          disabled={saving === s.stage || !isDirty}
                          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                          {saving === s.stage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-4 w-full">
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {hasData ? fmtUSD(actual) : <span className="text-gray-400 italic">Not reported</span>}
                        </span>
                        {reports[s.stage]?.notes && (
                          <span className="text-xs text-gray-400">{reports[s.stage].notes}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status indicator */}
                  {hasData && diff !== null && (
                    <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${
                      Math.abs(diff) < stageExpected * 0.05
                        ? 'text-green-600 dark:text-green-400'
                        : diff > 0
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}>
                      {Math.abs(diff) < stageExpected * 0.05 ? (
                        <><CheckCircle className="w-3.5 h-3.5" /> On pace</>
                      ) : diff > 0 ? (
                        <><TrendingDown className="w-3.5 h-3.5" /> Underspending by {fmtUSD(diff)}</>
                      ) : (
                        <><TrendingUp className="w-3.5 h-3.5" /> Overspending by {fmtUSD(Math.abs(diff))}</>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Monthly summary */}
          <div className={`rounded-lg p-3 text-xs font-medium flex items-center justify-between ${
            totalSpent === 0
              ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-500'
              : Math.abs(credit) < budget * 0.03
                ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400'
                : credit > 0
                  ? 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400'
                  : 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400'
          }`}>
            <div className="flex items-center gap-4">
              <span>Total spent: <strong>{fmtUSD(totalSpent)}</strong></span>
              <span>Budget: <strong>{fmtUSD(budget)}</strong></span>
            </div>
            {totalSpent > 0 && (
              <span className="flex items-center gap-1">
                {Math.abs(credit) < budget * 0.03 ? (
                  <><CheckCircle className="w-3.5 h-3.5" /> On budget</>
                ) : credit > 0 ? (
                  <><AlertTriangle className="w-3.5 h-3.5" /> Credit: {fmtUSD(credit)}</>
                ) : (
                  <><AlertTriangle className="w-3.5 h-3.5" /> Over: {fmtUSD(Math.abs(credit))}</>
                )}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
