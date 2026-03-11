import { useState } from 'react';
import { Plus, X, Pencil, Save, ToggleLeft, ToggleRight } from 'lucide-react';

/**
 * List of promos: name, promo price, value price, active toggle
 * Add / edit / remove promos
 * Props: promos (array), onChange(updatedPromos)
 */
export default function PromoManager({ promos = [], onChange }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', value_price: '' });

  const startAdd = () => {
    setForm({ name: '', price: '', value_price: '' });
    setEditing('new');
  };

  const startEdit = (promo) => {
    setForm({ name: promo.name, price: String(promo.price || ''), value_price: String(promo.value_price || '') });
    setEditing(promo.id);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing === 'new') {
      const newPromo = {
        id: `p-${Date.now()}`,
        name: form.name.trim(),
        price: Number(form.price) || 0,
        value_price: Number(form.value_price) || 0,
        active: true,
      };
      onChange([...promos, newPromo]);
    } else {
      onChange(promos.map(p =>
        p.id === editing ? { ...p, name: form.name.trim(), price: Number(form.price) || 0, value_price: Number(form.value_price) || 0 } : p
      ));
    }
    setEditing(null);
  };

  const toggleActive = (id) => {
    onChange(promos.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const remove = (id) => {
    onChange(promos.filter(p => p.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Promotions</p>
        <button type="button" onClick={startAdd} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Promo
        </button>
      </div>

      {promos.length === 0 && editing === null && (
        <p className="text-xs text-gray-400 italic">No promotions configured</p>
      )}

      <div className="space-y-2">
        {promos.map(promo => (
          <div key={promo.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {editing === promo.id ? (
              <div className="flex-1 space-y-2">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm py-1.5" placeholder="Promo name" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="input-field text-sm py-1.5" placeholder="Promo $" step="0.01" min="0" />
                  <input type="number" value={form.value_price} onChange={e => setForm(f => ({ ...f, value_price: e.target.value }))} className="input-field text-sm py-1.5" placeholder="Value $" step="0.01" min="0" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditing(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                  <button type="button" onClick={handleSave} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className={`text-sm font-medium ${promo.active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 line-through'}`}>{promo.name}</p>
                    {promo.linked_ticket_id && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400">auto</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ${promo.price} <span className="text-gray-300 dark:text-gray-600">|</span> Value ${promo.value_price}
                  </p>
                </div>
                <button type="button" onClick={() => toggleActive(promo.id)} className="text-gray-400 hover:text-blue-500">
                  {promo.active ? <ToggleRight className="w-5 h-5 text-blue-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button type="button" onClick={() => startEdit(promo)} className="p-1 hover:text-blue-500 text-gray-400">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => remove(promo.id)} className="p-1 hover:text-red-500 text-gray-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}

        {editing === 'new' && (
          <div className="p-2.5 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 space-y-2">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm py-1.5" placeholder="Promo name" autoFocus />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="input-field text-sm py-1.5" placeholder="Promo $" step="0.01" min="0" />
              <input type="number" value={form.value_price} onChange={e => setForm(f => ({ ...f, value_price: e.target.value }))} className="input-field text-sm py-1.5" placeholder="Value $" step="0.01" min="0" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
              <button type="button" onClick={handleSave} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
