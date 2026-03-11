export const DEPARTMENTS = ['Management', 'Marketing', 'IT', 'Accounting'];

// Workload management
export const WORK_HOURS_PER_DAY = 8;
export const BREAK_HOURS = 1;
export const EFFECTIVE_MINUTES_PER_DAY = (WORK_HOURS_PER_DAY - BREAK_HOURS) * 60; // 420 minutes

export const DEPT_COLORS = {
  Management: { bg: 'bg-management', text: 'text-management', hex: '#3B82F6', dot: 'bg-blue-500' },
  Marketing: { bg: 'bg-marketing', text: 'text-marketing', hex: '#10B981', dot: 'bg-emerald-500' },
  IT: { bg: 'bg-it', text: 'text-it', hex: '#8B5CF6', dot: 'bg-violet-500' },
  Accounting: { bg: 'bg-accounting', text: 'text-accounting', hex: '#F59E0B', dot: 'bg-amber-500' },
};

export const PRIORITY_COLORS = {
  Immediate: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  High: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export const TICKET_TYPE_COLORS = {
  'New Campaign': '#3B82F6',
  'New Spa': '#10B981',
  'Campaign Price Change': '#F59E0B',
  'Budget Change': '#EF4444',
  'Service Status Change': '#8B5CF6',
  'Availability Change': '#EC4899',
  'Spa Performance Issues': '#DC2626',
  'Ad Pause Request': '#6B7280',
  'Campaign GHL Migration': '#0EA5E9',
};

export const STATUS_COLORS = {
  'Not Started': 'bg-gray-400',
  'In Progress': 'bg-yellow-400',
  Done: 'bg-green-500',
};

export const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'tier_select', label: 'Facial Protocol (Tier)' },
];

export const TIER_DEFINITIONS = {
  1: {
    label: 'Tier 1',
    subtitle: 'Full Premium Treatment',
    description: 'Complete luxury experience: full cleansing, steaming, exfoliation, creams, serums, LED therapy, massage, and final cream application.',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    hex: '#8B5CF6',
    steps: [
      { name: 'Consultation', detail: 'Brief conversation to understand client\'s needs and skin goals.' },
      { name: 'Cleansing', detail: 'Thoroughly cleanse the skin to remove makeup, oil, and impurities.' },
      { name: 'Steam', detail: 'Use a steamer to open up pores and prepare the skin for further treatment.' },
      { name: 'Exfoliation', detail: 'Gently exfoliate to remove dead skin cells, improving skin texture and absorption of products.' },
      { name: 'Cream Application', detail: 'Apply a nourishing cream to hydrate and prepare the skin for LED therapy.' },
      { name: 'Serum Application', detail: 'Use a targeted serum to address specific skin concerns (e.g., firmness, hydration, radiance).' },
      { name: 'LED Therapy', detail: 'Apply LED light treatment to tighten and rejuvenate the skin, supporting collagen production.' },
      { name: 'Massage', detail: 'Perform a light facial massage to improve circulation, relax muscles, and enhance absorption of products.' },
      { name: 'Final Cream Application', detail: 'Finish with a high-quality cream or moisturizer to seal in all the benefits, leaving the skin smooth and nourished.' },
    ],
  },
  2: {
    label: 'Tier 2',
    subtitle: 'Simplified Treatment with LED Focus',
    description: 'Streamlined treatment centered around LED therapy with light cleansing and basic product application.',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    hex: '#3B82F6',
    steps: [
      { name: 'Consultation', detail: 'Discuss client\'s skin needs and expectations.' },
      { name: 'Light Cleansing', detail: 'A gentle cleanse to remove surface impurities.' },
      { name: 'LED Therapy', detail: 'Apply LED light treatment to promote skin tightening and rejuvenation.' },
      { name: 'Basic Product Application', detail: 'A simple cream or a light serum application for hydration and protection.' },
    ],
  },
  3: {
    label: 'Tier 3',
    subtitle: 'Basic LED & Consultation Only',
    description: 'Most basic form focusing on LED therapy and consultation only. No cleansing, no steam, no exfoliation, no massage, and no additional creams or serums.',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    hex: '#6B7280',
    steps: [
      { name: 'Consultation', detail: 'Understand client\'s goals and explain the LED treatment benefits.' },
      { name: 'LED Therapy', detail: 'Directly proceed with LED light treatment for skin tightening and rejuvenation.' },
    ],
  },
};
