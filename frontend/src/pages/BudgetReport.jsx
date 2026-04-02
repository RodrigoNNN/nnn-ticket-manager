import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchSpas, fetchAllBudgetReports, upsertBudgetReport } from '../utils/api-service';
import { ChevronLeft, ChevronRight, ExternalLink, Save, Loader2, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { format, addMonths, subMonths, getDaysInMonth } from 'date-fns';
import toast from 'react-hot-toast';

function parseCurrency(val) {
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(/[^0-9.\-]/g, '')) || 0;
}

function fmtUSD(val) {
  return parseCurrency(val).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function getStageExpected(budget, month, stageNum) {
  const [y, m] = month.split('-').map(Number);
  const totalDays = getDaysInMonth(new Date(y, m - 1));
  const dailyPace = totalDays > 0 ? budget / totalDays : 0;
  const stageDays = stageNum === 1 ? 15 : stageNum === 2 ? 10 : totalDays - 25;
  return dailyPace * stageDays;
}

function getCurrentStage(month) {
  const today = new Date();
  if (format(today, 'yyyy-MM') !== month) return null;
  const day = today.getDate();
  if (day <= 15) return 1;
  if (day <= 25) return 2;
  return 3;
}

export default function BudgetReport() {
  const { user, isAdmin, isViewingAsOther } = useAuth();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [spas, setSpas] = useState([]);
  const [reports, setReports] = useState({});
  const [editValues, setEditValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const effectiveAdmin = isAdmin && !isViewingAsOther;
  const canEdit = effectiveAdmin || user?.department === 'Marketing';
  const currentStage = getCurrentStage(month);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allSpas, allReports] = await Promise.all([
        fetchSpas(),
        fetchAllBudgetReports(month),
      ]);

      // Filter spas assigned to this user's marketing team (or all if admin)
      let filteredSpas = allSpas;
      if (!effectiveAdmin) {
        filteredSpas = allSpas.filter(spa => {
          const teamIds = spa.assigned_team?.Marketing || [];
          return teamIds.includes(user.id);
        });
      }
      filteredSpas.sort((a, b) => a.name.localeCompare(b.name));
      setSpas(filteredSpas);

      // Build reports map: { spaId: { 1: report, 2: report, 3: report } }
      const map = {};
      for (const r of allReports) {
        if (!map[r.spa_id]) map[r.spa_id] = {};
        map[r.spa_id][r.stage] = r;
      }
      setReports(map);

      // Init edit values
      const edits = {};
      for (const spa of filteredSpas) {
        edits[spa.id] = {};
        for (const s of [1, 2, 3]) {
          const val = map[spa.id]?.[s]?.actual_spend;
          edits[spa.id][s] = val != null ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
        }
      }
      setEditValues(edits);
    } catch (err) {
      console.error('Failed to load budget report data:', err);
    } finally {
      setLoading(false);
    }
  }, [month, user?.id, effectiveAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (spaId, stageNum) => {
    const key = `${spaId}-${stageNum}`;
    setSaving(key);
    try {
      const val = editValues[spaId]?.[stageNum] || '';
      await upsertBudgetReport(spaId, month, stageNum, val, '', user.id);
      toast.success('Saved');
      await loadData();
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const updateEdit = (spaId, stageNum, value) => {
    setEditValues(prev => ({
      ...prev,
      [spaId]: { ...prev[spaId], [stageNum]: value },
    }));
  };

  const isDirty = (spaId, stageNum) => {
    const saved = reports[spaId]?.[stageNum]?.actual_spend;
    const current = editValues[spaId]?.[stageNum] || '';
    const savedStr = saved != null ? saved.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    return current !== savedStr;
  };

  const prevMonth = () => setMonth(format(subMonths(new Date(month + '-01'), 1), 'yyyy-MM'));
  const nextMonth = () => setMonth(format(addMonths(new Date(month + '-01'), 1), 'yyyy-MM'));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Report</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[110px] text-center">
            {format(new Date(month + '-01'), 'MMMM yyyy')}
          </span>
          <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : spas.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">No spas assigned to you.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide sticky left-0 bg-gray-50 dark:bg-gray-800/50 z-10 min-w-[180px]">Client</th>
                <th className="text-center px-2 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[60px]">Budget</th>
                <th className="text-center px-2 py-3 text-xs font-semibold uppercase tracking-wide min-w-[170px]">
                  <span className={currentStage === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}>
                    Stage 1 <span className="font-normal text-[10px]">(1st–15th)</span>
                  </span>
                </th>
                <th className="text-center px-2 py-3 text-xs font-semibold uppercase tracking-wide min-w-[170px]">
                  <span className={currentStage === 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}>
                    Stage 2 <span className="font-normal text-[10px]">(16th–25th)</span>
                  </span>
                </th>
                <th className="text-center px-2 py-3 text-xs font-semibold uppercase tracking-wide min-w-[170px]">
                  <span className={currentStage === 3 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}>
                    Stage 3 <span className="font-normal text-[10px]">(26th–EOM)</span>
                  </span>
                </th>
                <th className="text-center px-2 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[100px]">Total Spent</th>
                <th className="text-center px-2 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[90px]">Credit</th>
              </tr>
            </thead>
            <tbody>
              {spas.map(spa => {
                const budget = spa.monthly_budget || 0;
                const totalSpent = [1, 2, 3].reduce((sum, s) => sum + (reports[spa.id]?.[s]?.actual_spend || 0), 0);
                const credit = budget - totalSpent;

                return (
                  <tr key={spa.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    {/* Client name + ads link */}
                    <td className="px-4 py-3 sticky left-0 bg-white dark:bg-gray-900 z-10">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">{spa.name}</span>
                        {spa.ads_manager_url && (
                          <a
                            href={spa.ads_manager_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 flex-shrink-0"
                            title="Open Ads Manager"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      {spa.location && <p className="text-[11px] text-gray-400">{spa.location}</p>}
                    </td>

                    {/* Budget */}
                    <td className="px-2 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400">
                      {budget > 0 ? fmtUSD(budget) : '—'}
                    </td>

                    {/* Stage cells */}
                    {[1, 2, 3].map(stageNum => {
                      const expected = getStageExpected(budget, month, stageNum);
                      const actual = reports[spa.id]?.[stageNum]?.actual_spend;
                      const hasData = actual != null && actual > 0;
                      const savingKey = `${spa.id}-${stageNum}`;
                      const dirty = isDirty(spa.id, stageNum);

                      return (
                        <td key={stageNum} className={`px-2 py-2 ${currentStage === stageNum ? 'bg-blue-50/50 dark:bg-blue-900/5' : ''}`}>
                          <div className="text-[10px] text-gray-400 text-center mb-1">
                            Exp: {fmtUSD(expected)}
                          </div>
                          {canEdit ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editValues[spa.id]?.[stageNum] || ''}
                                onChange={(e) => updateEdit(spa.id, stageNum, e.target.value)}
                                onBlur={() => {
                                  const num = parseCurrency(editValues[spa.id]?.[stageNum]);
                                  if (num > 0) updateEdit(spa.id, stageNum, num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                                }}
                                onFocus={(e) => {
                                  const num = parseCurrency(editValues[spa.id]?.[stageNum]);
                                  if (num > 0) updateEdit(spa.id, stageNum, String(num));
                                  setTimeout(() => e.target.select(), 0);
                                }}
                                placeholder="0.00"
                                className="input-field text-xs py-1 text-center w-full"
                              />
                              <button
                                onClick={() => handleSave(spa.id, stageNum)}
                                disabled={saving === savingKey || !dirty}
                                className="flex-shrink-0 p-1 text-blue-600 hover:text-blue-700 disabled:text-gray-300 dark:disabled:text-gray-600"
                              >
                                {saving === savingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-center font-medium text-gray-700 dark:text-gray-300">
                              {hasData ? fmtUSD(actual) : '—'}
                            </p>
                          )}
                          {/* Status dot */}
                          {hasData && (
                            <div className="flex justify-center mt-1">
                              {Math.abs(actual - expected) < expected * 0.05 ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : actual > expected ? (
                                <TrendingUp className="w-3 h-3 text-red-500" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-yellow-500" />
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Total spent */}
                    <td className="px-2 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
                      {totalSpent > 0 ? fmtUSD(totalSpent) : '—'}
                    </td>

                    {/* Credit/debit */}
                    <td className={`px-2 py-3 text-center text-xs font-bold ${
                      totalSpent === 0
                        ? 'text-gray-400'
                        : credit >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}>
                      {totalSpent > 0 ? fmtUSD(credit) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
