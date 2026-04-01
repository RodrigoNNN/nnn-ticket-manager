import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardList, KanbanSquare, Building2, BarChart3,
  ChevronRight, ChevronLeft, X, Sparkles,
} from 'lucide-react';

const STEPS = [
  {
    icon: Sparkles,
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    title: 'Welcome to NNN Tickets!',
    description: 'Your team\'s central hub for managing tasks, tickets, and client work. Let\'s take a quick look around.',
    image: null,
  },
  {
    icon: ClipboardList,
    color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    title: 'My Tasks',
    description: 'This is your home base. See all your assigned tasks for the day, week, or everything at once. Toggle tasks as done when you finish them. The workload bar at the top shows how packed your week is.',
    tip: 'Click any task to open the full ticket details.',
  },
  {
    icon: KanbanSquare,
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    title: 'All Tickets',
    description: 'View every ticket across the team — filter by status, department, or spa. Drag tickets between columns to update their status (Open → In Progress → Done).',
    tip: 'Use the search bar to quickly find any ticket.',
  },
  {
    icon: Building2,
    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    title: 'Clients (Spas)',
    description: 'See all your spa clients in one place. Click any spa to view their full history — tickets, onboarding status, and assigned team members.',
    tip: 'Each spa card shows how many open tickets they have.',
  },
  {
    icon: BarChart3,
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    title: 'You\'re all set!',
    description: 'That\'s the essentials. If you ever need to change your password, find it in the sidebar menu. Questions? Reach out to your admin.',
    tip: 'Pro tip: Bookmark the app so it\'s always one click away.',
  },
];

export default function WelcomeWalkthrough() {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  // Check if user has already seen the walkthrough
  const storageKey = `nnn_walkthrough_${user?.id}`;
  const alreadySeen = localStorage.getItem(storageKey) === 'done';

  if (!visible || alreadySeen) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const Icon = current.icon;

  const finish = () => {
    localStorage.setItem(storageKey, 'done');
    setVisible(false);
  };

  const skip = () => {
    finish();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Skip button */}
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={skip}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
          >
            Skip tour <X className="w-3 h-3" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-2 text-center">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl ${current.color} flex items-center justify-center mx-auto mb-5`}>
            <Icon className="w-8 h-8" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {current.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
            {current.description}
          </p>

          {/* Tip */}
          {current.tip && (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                💡 {current.tip}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-5 mt-2">
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-blue-600'
                    : i < step
                    ? 'w-1.5 bg-blue-300 dark:bg-blue-700'
                    : 'w-1.5 bg-gray-200 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            <button
              onClick={() => isLast ? finish() : setStep(s => s + 1)}
              className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
