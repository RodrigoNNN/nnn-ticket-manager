import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchBudgetAllocations, saveBudgetAllocations } from '../../utils/api-service';
import { Plus, Trash2, Save, Loader2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import toast from 'react-hot-toast';

// Parse a string like "1,500.00" or "$1500" into a number
function parseCurrency(val) {
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(/[^0-9.\-]/g, '')) || 0;
}

// Format a number as "$1,500.00"
function fmtUSD(val) {
  return parseCurrency(val).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function BudgetBreakdown({ spa }) {
  const { user, isAdmin } = useAuth();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Accounting + admin can edit, everyone else is view-only
  const canEdit = isAdmin || user?.department === 'Accounting';

  const loadAllocations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBudgetAllocations(spa.id, month);
      setRows(data.map(r => ({ label: r.label, amount: r.amount })));
      setDirty(false);
    } catch (err) {
      console.error('Failed to load allocations:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [spa.id, month]);

  useEffect(() => { loadAllocations(); }, [loadAllocations]);

  const addRow = () => {
    setRows(prev => [...prev, { label: '', amount: '' }]);
    setDirty(true);
  };

  const removeRow = (index) => {
    setRows(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const updateRow = (index, field, value) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveBudgetAllocations(spa.id, month, rows, user.id);
      setDirty(false);
      toast.success('Budget breakdown saved');
    } catch (err) {
      console.error('Failed to save allocations:', err);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const prevMonth = () => {
    setMonth(format(subMonths(new Date(month + '-01'), 1), 'yyyy-MM'));
  };
  const nextMonth = () => {
    setMonth(format(addMonths(new Date(month + '-01'), 1), 'yyyy-MM'));
  };

  const totalAllocated = rows.reduce((sum, r) => sum + parseCurrency(r.amount), 0);
  const budget = spa.monthly_budget || 0;
  const diff = budget - totalAllocated;

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
          Budget Breakdown
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[100px] text-center">
            {format(new Date(month + '-01'), 'MMM yyyy')}
          </span>
          <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Budget summary bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3 px-1">
        <span>Monthly budget: <strong className="text-gray-700 dark:text-gray-300">{fmtUSD(budget)}</strong></span>
        <span>
          Allocated: <strong className={totalAllocated > budget ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}>{fmtUSD(totalAllocated)}</strong>
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Rows */}
          {rows.length === 0 && !canEdit && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No budget breakdown for this month.</p>
          )}

          {rows.length > 0 && (
            <div className="space-y-2 mb-3">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_120px_32px] gap-2 px-1">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase">Description</span>
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase text-right">Amount</span>
                <span />
              </div>

              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_32px] gap-2 items-center">
                  {canEdit ? (
                    <>
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) => updateRow(i, 'label', e.target.value)}
                        placeholder="e.g. Botox Campaign"
                        className="input-field text-sm py-1.5"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.amount}
                        onChange={(e) => updateRow(i, 'amount', e.target.value)}
                        onBlur={() => {
                          const num = parseCurrency(row.amount);
                          updateRow(i, 'amount', num > 0 ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
                        }}
                        onFocus={(e) => {
                          const num = parseCurrency(row.amount);
                          if (num > 0) updateRow(i, 'amount', String(num));
                          setTimeout(() => e.target.select(), 0);
                        }}
                        placeholder="0.00"
                        className="input-field text-sm py-1.5 text-right"
                      />
                      <button
                        onClick={() => removeRow(i)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{row.label || '(no description)'}</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 text-right font-medium">
                        {fmtUSD(row.amount)}
                      </span>
                      <span />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Difference indicator */}
          {rows.length > 0 && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium mb-3 ${
              Math.abs(diff) < 0.01
                ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400'
                : diff > 0
                  ? 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400'
                  : 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400'
            }`}>
              <span className="flex items-center gap-1">
                {Math.abs(diff) >= 0.01 && <AlertTriangle className="w-3.5 h-3.5" />}
                {Math.abs(diff) < 0.01
                  ? 'Fully allocated'
                  : diff > 0
                    ? `${fmtUSD(diff)} unallocated`
                    : `${fmtUSD(Math.abs(diff))} over budget`
                }
              </span>
              <span className="font-bold">Total: {fmtUSD(totalAllocated)}</span>
            </div>
          )}

          {/* Actions */}
          {canEdit && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={addRow}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
