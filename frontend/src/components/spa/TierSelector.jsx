import { TIER_DEFINITIONS } from '../../utils/constants';
import { Check } from 'lucide-react';

/**
 * 3 clickable cards showing tier info. Selected tier is highlighted.
 * Props: value (number|null), onChange(tierNumber)
 */
export default function TierSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {Object.entries(TIER_DEFINITIONS).map(([num, def]) => {
        const tier = Number(num);
        const selected = value === tier;
        return (
          <button
            key={tier}
            type="button"
            onClick={() => onChange(selected ? null : tier)}
            className={`relative text-left p-4 rounded-xl border-2 transition-all ${
              selected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {selected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: def.hex }}>
                {tier}
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{def.label}</span>
            </div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{def.subtitle}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{def.description}</p>
          </button>
        );
      })}
    </div>
  );
}
