import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchSpas, fetchAllBudgetReports, fetchBudgetReportsUpToMonth, upsertBudgetReport } from '../utils/api-service';
import { ChevronLeft, ChevronRight, ExternalLink, Save, Loader2, CheckCircle, TrendingUp, TrendingDown, Eye, Users } from 'lucide-react';
import { format, addMonths, subMonths, getDaysInMonth } from 'date-fns';
import toast from 'react-hot-toast';

// Parse 'yyyy-MM' to local date (avoids UTC timezone rollback)
function monthToDate(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

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

function getDailyPaces(budget, month, stageSpends, stageHasReport) {
  const [y, m] = month.split('-').map(Number);
  const totalDays = getDaysInMonth(new Date(y, m - 1));
  const target = totalDays > 0 ? budget / totalDays : 0;

  const today = new Date();
  const isCurrentMonth = format(today, 'yyyy-MM') === month;
  let adjusted = null;
  let remainingDays = 0;
  let stageLabel = '';
  let stageExpected = 0;
  let stageSpent = 0;
  let hasData = false;

  if (isCurrentMonth && budget > 0) {
    const dayOfMonth = today.getDate();

    // Determine current stage boundaries
    let stageStart, stageEnd, stageNum;
    if (dayOfMonth <= 15) {
      stageNum = 1; stageStart = 1; stageEnd = 15;
    } else if (dayOfMonth <= 25) {
      stageNum = 2; stageStart = 16; stageEnd = 25;
    } else {
      stageNum = 3; stageStart = 26; stageEnd = totalDays;
    }

    const stageDays = stageEnd - stageStart + 1;
    stageExpected = target * stageDays;
    stageSpent = stageSpends[stageNum] || 0;
    hasData = stageHasReport[stageNum] || false;
    remainingDays = stageEnd - dayOfMonth;
    stageLabel = `S${stageNum}`;

    if (hasData) {
      // Spend reported: recalculate pace based on what's left
      if (remainingDays > 0) {
        adjusted = (stageExpected - stageSpent) / remainingDays;
      } else {
        adjusted = stageExpected - stageSpent;
      }
    } else {
      // No spend reported yet: show steady pace for the full stage
      adjusted = stageDays > 0 ? stageExpected / stageDays : 0;
    }
  }

  return { target, adjusted, remainingDays, totalDays, stageLabel, stageExpected, stageSpent, hasData };
}

export default function BudgetReport() {
  const { user, isAdmin, isViewingAsOther, allUsers } = useAuth();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [spas, setSpas] = useState([]);
  const [reports, setReports] = useState({});
  const [runningBalances, setRunningBalances] = useState({});
  const [editValues, setEditValues] = useState({});
  const [allSpasData, setAllSpasData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const effectiveAdmin = isAdmin && !isViewingAsOther;
  const canEdit = effectiveAdmin || user?.department === 'Marketing';
  const currentStage = getCurrentStage(month);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allSpas, allReports, historicalReports] = await Promise.all([
        fetchSpas(),
        fetchAllBudgetReports(month),
        fetchBudgetReportsUpToMonth(month),
      ]);

      // Store all spas for admin toggle
      allSpas.sort((a, b) => a.name.localeCompare(b.name));
      setAllSpasData(allSpas);

      // Filter spas based on role and showAll toggle
      let filteredSpas;
      if (effectiveAdmin && showAll) {
        // Admin "All Clients" mode: show everything
        filteredSpas = allSpas;
      } else if (effectiveAdmin) {
        // Admin default: show their assigned spas (like a marketing member)
        filteredSpas = allSpas.filter(spa => {
          const teamIds = spa.assigned_team?.Marketing || [];
          return teamIds.includes(user.id);
        });
      } else if (user?.department === 'Accounting') {
        // Accounting always sees all
        filteredSpas = allSpas;
      } else {
        // Marketing: only their assigned spas
        filteredSpas = allSpas.filter(spa => {
          const teamIds = spa.assigned_team?.Marketing || [];
          return teamIds.includes(user.id);
        });
      }
      setSpas(filteredSpas);

      // Build reports map for current month: { spaId: { 1: report, 2: report, 3: report } }
      const map = {};
      for (const r of allReports) {
        if (!map[r.spa_id]) map[r.spa_id] = {};
        map[r.spa_id][r.stage] = r;
      }
      setReports(map);

      // Compute running balances: sum of (budget - spent) for each month up to selected
      const spaBudgetMap = {};
      for (const spa of allSpas) spaBudgetMap[spa.id] = spa.monthly_budget || 0;

      // Group historical spend by spa + month
      const spendByMonth = {}; // { spaId: { month: totalSpent } }
      for (const r of historicalReports) {
        if (!spendByMonth[r.spa_id]) spendByMonth[r.spa_id] = {};
        spendByMonth[r.spa_id][r.month] = (spendByMonth[r.spa_id][r.month] || 0) + (r.actual_spend || 0);
      }

      // Calculate running balance per spa
      const balances = {};
      for (const spa of filteredSpas) {
        const budget = spaBudgetMap[spa.id] || 0;
        const months = Object.keys(spendByMonth[spa.id] || {}).sort();
        let cumulative = 0;
        for (const m of months) {
          const spent = spendByMonth[spa.id][m] || 0;
          cumulative += budget - spent;
        }
        balances[spa.id] = cumulative;
      }
      setRunningBalances(balances);

      // Init edit values
      const edits = {};
      for (const spa of filteredSpas) {
        edits[spa.id] = {};
        for (const s of [1, 2, 3]) {
          const val = map[spa.id]?.[s]?.actual_spend;
          edits[spa.id][s] = val != null && val > 0 ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
        }
      }
      setEditValues(edits);
    } catch (err) {
      console.error('Failed to load budget report data:', err);
    } finally {
      setLoading(false);
    }
  }, [month, user?.id, effectiveAdmin, showAll]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (spaId, stageNum) => {
    const key = `${spaId}-${stageNum}`;
    const val = parseCurrency(editValues[spaId]?.[stageNum]);
    if (val <= 0) {
      toast.error('Enter an amount greater than 0');
      return;
    }
    setSaving(key);
    try {
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
    const savedStr = saved != null && saved > 0 ? saved.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    return current !== savedStr;
  };

  const prevMonth = () => setMonth(format(subMonths(monthToDate(month), 1), 'yyyy-MM'));
  const nextMonth = () => setMonth(format(addMonths(monthToDate(month), 1), 'yyyy-MM'));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Report</h1>
          {effectiveAdmin && (
            <button
              onClick={() => setShowAll(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showAll
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {showAll ? <Users className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showAll ? 'All Clients' : 'My Clients'}
            </button>
          )}
        </div>
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
                {effectiveAdmin && showAll && (
                  <th className="text-left px-2 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[130px]">Assigned To</th>
                )}
                <th className="text-center px-2 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[60px]">Budget</th>
                <th className="text-center px-2 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[100px]">Daily Pace</th>
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
                <th className="text-center px-2 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[110px]">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {spas.map(spa => {
                const budget = spa.monthly_budget || 0;
                const stageSpends = { 1: reports[spa.id]?.[1]?.actual_spend || 0, 2: reports[spa.id]?.[2]?.actual_spend || 0, 3: reports[spa.id]?.[3]?.actual_spend || 0 };
                const stageHasReport = { 1: (reports[spa.id]?.[1]?.actual_spend || 0) > 0, 2: (reports[spa.id]?.[2]?.actual_spend || 0) > 0, 3: (reports[spa.id]?.[3]?.actual_spend || 0) > 0 };
                const totalSpent = stageSpends[1] + stageSpends[2] + stageSpends[3];
                const credit = budget - totalSpent;
                const pace = getDailyPaces(budget, month, stageSpends, stageHasReport);

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

                    {/* Assigned Marketing member (admin showAll only) */}
                    {effectiveAdmin && showAll && (() => {
                      const marketingIds = spa.assigned_team?.Marketing || [];
                      const marketingNames = marketingIds
                        .map(id => (allUsers || []).find(u => u.id === id))
                        .filter(Boolean);
                      const hasAnyReport = totalSpent > 0;
                      const stagesReported = [1, 2, 3].filter(s => (reports[spa.id]?.[s]?.actual_spend || 0) > 0).length;

                      return (
                        <td className="px-2 py-3">
                          {marketingNames.length > 0 ? (
                            <div>
                              {marketingNames.map(u => (
                                <p key={u.id} className="text-xs text-gray-700 dark:text-gray-300">{u.name}</p>
                              ))}
                              <div className="flex items-center gap-1 mt-1">
                                {currentStage ? (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    stagesReported >= currentStage
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  }`}>
                                    {stagesReported >= currentStage ? 'Up to date' : `${stagesReported}/${currentStage} reported`}
                                  </span>
                                ) : hasAnyReport ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    {stagesReported}/3 reported
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                    No data
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                      );
                    })()}

                    {/* Budget */}
                    <td className="px-2 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400">
                      {budget > 0 ? fmtUSD(budget) : '—'}
                    </td>

                    {/* Daily Pace */}
                    <td className="px-2 py-2 text-center">
                      {budget > 0 ? (
                        <div>
                          <div className="text-[10px] text-gray-400 mb-0.5">
                            Target: {fmtUSD(pace.target)}/d
                          </div>
                          {pace.adjusted != null ? (
                            <>
                              <div className={`text-xs font-bold ${
                                !pace.hasData
                                  ? 'text-gray-700 dark:text-gray-300'
                                  : pace.adjusted < 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : Math.abs(pace.adjusted - pace.target) < pace.target * 0.1
                                      ? 'text-green-600 dark:text-green-400'
                                      : pace.adjusted > pace.target
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-blue-600 dark:text-blue-400'
                              }`}>
                                {pace.hasData && pace.adjusted < 0 ? 'Over budget' : `${fmtUSD(pace.adjusted)}/d`}
                              </div>
                              <div className="text-[9px] text-gray-400 mt-0.5">
                                {pace.stageLabel} · {pace.hasData ? `${pace.remainingDays}d left` : 'steady'}
                              </div>
                            </>
                          ) : (
                            <div className="text-[10px] text-gray-300 dark:text-gray-600">—</div>
                          )}
                        </div>
                      ) : '—'}
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

                    {/* Running balance */}
                    <td className={`px-2 py-3 text-center text-xs font-bold ${
                      runningBalances[spa.id] == null || runningBalances[spa.id] === 0
                        ? 'text-gray-400'
                        : runningBalances[spa.id] > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}>
                      {runningBalances[spa.id] != null && runningBalances[spa.id] !== 0 ? fmtUSD(runningBalances[spa.id]) : '—'}
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
