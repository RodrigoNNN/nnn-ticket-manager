import TierSelectField from './TierSelectField';

/**
 * Shared component that renders the correct input based on field type.
 * Used by: OnboardingForm, CreateTicket, ClientHistory (edit mode)
 */
export default function DynamicFieldRenderer({ field, value, onChange, disabled = false }) {
  const baseInput = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={baseInput}
          disabled={disabled}
          placeholder={field.placeholder || ''}
        />
      );

    case 'textarea':
      return (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={`${baseInput} min-h-[80px] resize-y`}
          disabled={disabled}
          placeholder={field.placeholder || ''}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className={baseInput}
          disabled={disabled}
          placeholder={field.placeholder || ''}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={baseInput}
          disabled={disabled}
        />
      );

    case 'select':
      return (
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={baseInput}
          disabled={disabled}
        >
          <option value="">Select...</option>
          {(field.options || []).map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={disabled}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
        </label>
      );

    case 'tier_select':
      return (
        <TierSelectField
          value={value || null}
          onChange={onChange}
          disabled={disabled}
          tiers={field.tiers || null}
        />
      );

    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={baseInput}
          disabled={disabled}
        />
      );
  }
}
