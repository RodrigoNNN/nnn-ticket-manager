import { useState, useEffect, useCallback } from 'react';
import { fetchOnboardingForms, createOnboardingForm as apiCreateForm, updateOnboardingForm as apiUpdateForm, deleteOnboardingForm as apiDeleteForm, fetchTicketTypes } from '../../utils/api-service';
import { FIELD_TYPES, TIER_DEFINITIONS } from '../../utils/constants';
import DynamicFieldRenderer from '../common/DynamicFieldRenderer';
import { Plus, Trash2, X, Save, Eye, EyeOff, Link2, GripVertical, ChevronUp, ChevronDown, ArrowLeft, Pencil, Copy, FileText, Settings2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

function getDefaultTierConfig() {
  return {
    1: { label: 'Tier 1', subtitle: 'Basic', description: '', hex: '#3B82F6', steps: [] },
    2: { label: 'Tier 2', subtitle: 'Standard', description: '', hex: '#8B5CF6', steps: [] },
    3: { label: 'Tier 3', subtitle: 'Premium', description: '', hex: '#F59E0B', steps: [] },
  };
}

export default function OnboardingFormBuilder() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFormId, setEditingFormId] = useState(null);

  const refresh = useCallback(() => {
    fetchOnboardingForms().then(setForms).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreateForm = async () => {
    const form = await apiCreateForm({
      name: 'New Form',
      slug: `form-${Date.now()}`,
      ticket_type: 'New Spa',
      fields: [],
    });
    setEditingFormId(form.id);
    refresh();
  };

  const handleDeleteForm = async (id) => {
    if (forms.length <= 1) return toast.error('You must keep at least one form');
    await apiDeleteForm(id);
    toast.success('Form deleted');
    refresh();
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;

  // If editing a form, show the form editor
  if (editingFormId) {
    const form = forms.find(f => f.id === editingFormId);
    if (!form) {
      setEditingFormId(null);
      return null;
    }
    return (
      <FormEditor
        form={form}
        onBack={() => { setEditingFormId(null); refresh(); }}
      />
    );
  }

  // Form list view
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{forms.length} onboarding form{forms.length !== 1 ? 's' : ''}</p>
        <button onClick={handleCreateForm} className="btn-primary flex items-center gap-2 text-sm py-1.5">
          <Plus className="w-4 h-4" /> New Form
        </button>
      </div>

      <div className="space-y-3">
        {forms.map(form => (
          <div key={form.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{form.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {form.fields.length} fields · Ticket: {form.ticket_type} · Slug: /{form.slug}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/onboarding/${form.slug}`;
                    navigator.clipboard.writeText(url).then(
                      () => toast.success('Link copied!'),
                      () => toast('Link: ' + url)
                    );
                  }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-blue-500"
                  title="Copy link"
                >
                  <Link2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingFormId(form.id)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-blue-500"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    await apiCreateForm({
                      name: form.name + ' (Copy)',
                      slug: form.slug + '-copy',
                      ticket_type: form.ticket_type,
                      fields: JSON.parse(JSON.stringify(form.fields)),
                    });
                    toast.success('Form duplicated');
                    refresh();
                  }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-blue-500"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {forms.length > 1 && (
                  <button
                    onClick={() => handleDeleteForm(form.id)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full form editor — fields, settings, preview */
function FormEditor({ form, onBack }) {
  const [ticketTypes, setTicketTypes] = useState([]);
  useEffect(() => { fetchTicketTypes().then(setTicketTypes).catch(() => {}); }, []);
  const [name, setName] = useState(form.name);
  const [slug, setSlug] = useState(form.slug);
  const [ticketType, setTicketType] = useState(form.ticket_type);
  const [fields, setFields] = useState(() => JSON.parse(JSON.stringify(form.fields)));
  const [preview, setPreview] = useState(false);
  const [previewValues, setPreviewValues] = useState({});
  const [dirty, setDirty] = useState(false);

  const markDirty = () => setDirty(true);

  const updateField = (idx, key, value) => {
    setFields(prev => prev.map((f, i) => {
      if (i !== idx) return f;
      const updated = { ...f, [key]: value };
      // Auto-initialize tiers when switching to tier_select
      if (key === 'type' && value === 'tier_select' && !updated.tiers) {
        updated.tiers = getDefaultTierConfig();
      }
      return updated;
    }));
    markDirty();
  };

  const updateTier = (fieldIdx, tierNum, key, value) => {
    setFields(prev => prev.map((f, i) => {
      if (i !== fieldIdx) return f;
      const tiers = JSON.parse(JSON.stringify(f.tiers || getDefaultTierConfig()));
      tiers[tierNum] = { ...tiers[tierNum], [key]: value };
      return { ...f, tiers };
    }));
    markDirty();
  };

  const addTierStep = (fieldIdx, tierNum) => {
    setFields(prev => prev.map((f, i) => {
      if (i !== fieldIdx) return f;
      const tiers = JSON.parse(JSON.stringify(f.tiers || getDefaultTierConfig()));
      tiers[tierNum].steps.push({ name: '', detail: '' });
      return { ...f, tiers };
    }));
    markDirty();
  };

  const updateTierStep = (fieldIdx, tierNum, stepIdx, key, value) => {
    setFields(prev => prev.map((f, i) => {
      if (i !== fieldIdx) return f;
      const tiers = JSON.parse(JSON.stringify(f.tiers || getDefaultTierConfig()));
      tiers[tierNum].steps[stepIdx] = { ...tiers[tierNum].steps[stepIdx], [key]: value };
      return { ...f, tiers };
    }));
    markDirty();
  };

  const removeTierStep = (fieldIdx, tierNum, stepIdx) => {
    setFields(prev => prev.map((f, i) => {
      if (i !== fieldIdx) return f;
      const tiers = JSON.parse(JSON.stringify(f.tiers || getDefaultTierConfig()));
      tiers[tierNum].steps = tiers[tierNum].steps.filter((_, j) => j !== stepIdx);
      return { ...f, tiers };
    }));
    markDirty();
  };

  const addField = () => {
    setFields(prev => [...prev, {
      id: `ob-${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      options: [],
    }]);
    markDirty();
  };

  const removeField = (idx) => {
    setFields(prev => prev.filter((_, i) => i !== idx));
    markDirty();
  };

  const moveField = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= fields.length) return;
    setFields(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
    markDirty();
  };

  const addFieldOption = (idx) => {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, options: [...f.options, ''] } : f));
    markDirty();
  };

  const updateFieldOption = (fieldIdx, optIdx, value) => {
    setFields(prev => prev.map((f, i) =>
      i === fieldIdx ? { ...f, options: f.options.map((o, j) => j === optIdx ? value : o) } : f
    ));
    markDirty();
  };

  const removeFieldOption = (fieldIdx, optIdx) => {
    setFields(prev => prev.map((f, i) =>
      i === fieldIdx ? { ...f, options: f.options.filter((_, j) => j !== optIdx) } : f
    ));
    markDirty();
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Please enter a form name');
    if (!slug.trim()) return toast.error('Please enter a URL slug');
    const invalid = fields.find(f => !f.label.trim());
    if (invalid) return toast.error('All fields must have a label');

    await apiUpdateForm(form.id, {
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      ticket_type: ticketType,
      fields: JSON.parse(JSON.stringify(fields)),
    });
    setDirty(false);
    toast.success('Form saved');
  };

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <ArrowLeft className="w-4 h-4" /> Back to Forms
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreview(p => !p)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
            {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button onClick={handleSave} disabled={!dirty} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>

      {/* Form settings */}
      {!preview && (
        <div className="card p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Form Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Form Name</label>
              <input value={name} onChange={e => { setName(e.target.value); markDirty(); }} className="input-field text-sm py-1.5" placeholder="e.g., Spa Onboarding" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">URL Slug</label>
              <div className="flex items-center">
                <span className="text-xs text-gray-400 mr-1">/onboarding/</span>
                <input value={slug} onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); markDirty(); }} className="input-field text-sm py-1.5 flex-1" placeholder="spa" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Auto-create Ticket Type</label>
              <select value={ticketType} onChange={e => { setTicketType(e.target.value); markDirty(); }} className="input-field text-sm py-1.5">
                {ticketTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Preview mode */}
      {preview ? (
        <div className="card p-6 max-w-xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Preview — this is how your clients will see the form</p>
          </div>
          <div className="space-y-4">
            {fields.map(field => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {field.label || 'Untitled'}{field.required ? ' *' : ''}
                </label>
                <DynamicFieldRenderer
                  field={field}
                  value={previewValues[field.id] || ''}
                  onChange={val => setPreviewValues(prev => ({ ...prev, [field.id]: val }))}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Edit mode - field list */
        <div className="space-y-3">
          {fields.map((field, idx) => (
            <div key={field.id} className="card p-3 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-start gap-2">
                {/* Move controls */}
                <div className="flex flex-col items-center gap-0.5 pt-1">
                  <button type="button" onClick={() => moveField(idx, -1)} disabled={idx === 0} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  <button type="button" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Field config */}
                <div className="flex-1">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                    <input
                      value={field.label}
                      onChange={e => updateField(idx, 'label', e.target.value)}
                      className="input-field text-sm py-1.5"
                      placeholder="Field label..."
                    />
                    <select
                      value={field.type}
                      onChange={e => updateField(idx, 'type', e.target.value)}
                      className="input-field text-sm py-1.5 w-40"
                    >
                      {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={e => updateField(idx, 'required', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      Required
                    </label>
                  </div>

                  {/* Tier config editor for tier_select */}
                  {field.type === 'tier_select' && (
                    <TierConfigEditor
                      tiers={field.tiers || getDefaultTierConfig()}
                      onUpdateTier={(tierNum, key, val) => updateTier(idx, tierNum, key, val)}
                      onAddStep={(tierNum) => addTierStep(idx, tierNum)}
                      onUpdateStep={(tierNum, stepIdx, key, val) => updateTierStep(idx, tierNum, stepIdx, key, val)}
                      onRemoveStep={(tierNum, stepIdx) => removeTierStep(idx, tierNum, stepIdx)}
                    />
                  )}

                  {/* Options for select type */}
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

                {/* Delete */}
                <button type="button" onClick={() => removeField(idx)} className="p-1 hover:text-red-500 text-gray-400 mt-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <button onClick={addField} className="w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add Field
          </button>
        </div>
      )}
    </div>
  );
}

/** Inline tier config editor — shown when a field is tier_select */
function TierConfigEditor({ tiers, onUpdateTier, onAddStep, onUpdateStep, onRemoveStep }) {
  const [openTier, setOpenTier] = useState(null);

  return (
    <div className="mt-2 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20">
        <Settings2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Tier Configuration</span>
        <span className="text-xs text-blue-500 dark:text-blue-400 ml-auto">Click a tier to edit</span>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
        {Object.entries(tiers).map(([num, def]) => {
          const isOpen = openTier === num;
          return (
            <div key={num} className="bg-white dark:bg-gray-800/30">
              {/* Tier header - click to expand */}
              <button
                type="button"
                onClick={() => setOpenTier(isOpen ? null : num)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: def.hex }}
                >
                  {num}
                </div>
                <span className="text-xs font-medium text-gray-900 dark:text-white">{def.label}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">— {def.subtitle}</span>
                <span className="text-xs text-gray-400 ml-auto">{def.steps.length} steps</span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
              </button>

              {/* Tier edit panel */}
              {isOpen && (
                <div className="px-3 pb-3 space-y-3">
                  {/* Tier info fields */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Label</label>
                      <input
                        value={def.label}
                        onChange={e => onUpdateTier(num, 'label', e.target.value)}
                        className="input-field text-xs py-1"
                        placeholder="e.g., Premium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Subtitle</label>
                      <input
                        value={def.subtitle}
                        onChange={e => onUpdateTier(num, 'subtitle', e.target.value)}
                        className="input-field text-xs py-1"
                        placeholder="e.g., Full Service"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
                    <textarea
                      value={def.description}
                      onChange={e => onUpdateTier(num, 'description', e.target.value)}
                      className="input-field text-xs py-1 min-h-[50px] resize-y"
                      placeholder="Describe this tier..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Color (hex)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={def.hex}
                        onChange={e => onUpdateTier(num, 'hex', e.target.value)}
                        className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer p-0"
                      />
                      <input
                        value={def.hex}
                        onChange={e => onUpdateTier(num, 'hex', e.target.value)}
                        className="input-field text-xs py-1 w-28"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>

                  {/* Treatment steps */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Treatment Steps</label>
                      <button
                        type="button"
                        onClick={() => onAddStep(num)}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        + Add Step
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {def.steps.map((step, stepIdx) => (
                        <div key={stepIdx} className="flex items-start gap-1.5 group">
                          <span
                            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium mt-1"
                            style={{ backgroundColor: def.hex }}
                          >
                            {stepIdx + 1}
                          </span>
                          <div className="flex-1 grid grid-cols-[1fr_1fr] gap-1">
                            <input
                              value={step.name}
                              onChange={e => onUpdateStep(num, stepIdx, 'name', e.target.value)}
                              className="input-field text-xs py-1"
                              placeholder="Step name..."
                            />
                            <input
                              value={step.detail}
                              onChange={e => onUpdateStep(num, stepIdx, 'detail', e.target.value)}
                              className="input-field text-xs py-1"
                              placeholder="Description..."
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveStep(num, stepIdx)}
                            className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {def.steps.length === 0 && (
                        <p className="text-xs text-gray-400 italic py-1">No steps yet. Click "+ Add Step" to begin.</p>
                      )}
                    </div>
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
