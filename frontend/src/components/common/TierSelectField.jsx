import { useState } from 'react';
import { TIER_DEFINITIONS } from '../../utils/constants';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Client-facing tier selector showing full treatment step descriptions.
 * Used in the public onboarding form.
 * Props: value (number|null), onChange(tierNumber), disabled, tiers (optional custom tier config)
 */
export default function TierSelectField({ value, onChange, disabled = false, tiers = null }) {
  const [expanded, setExpanded] = useState(null);
  const tierData = tiers || TIER_DEFINITIONS;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">Select the facial protocol that best describes your services:</p>
      {Object.entries(tierData).map(([num, def]) => {
        const tier = Number(num);
        const selected = value === tier;
        const isExpanded = expanded === tier;

        return (
          <div
            key={tier}
            className={`rounded-xl border-2 transition-all overflow-hidden ${
              selected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
          >
            {/* Header - clickable to select */}
            <button
              type="button"
              onClick={() => onChange(selected ? null : tier)}
              className="w-full text-left p-4 flex items-start gap-3"
            >
              {/* Radio-style circle */}
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                selected
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {selected && <Check className="w-3 h-3 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: def.hex }}
                  >
                    {tier}
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{def.label}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">— {def.subtitle}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{def.description}</p>
              </div>
            </button>

            {/* Expand/collapse toggle for steps */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpanded(isExpanded ? null : tier); }}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 border-t border-gray-100 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/30"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {isExpanded ? 'Hide' : 'View'} treatment steps ({def.steps.length})
            </button>

            {/* Steps list (expandable) */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700/50">
                <ol className="space-y-2.5">
                  {def.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium mt-0.5"
                        style={{ backgroundColor: def.hex }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{step.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{step.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
