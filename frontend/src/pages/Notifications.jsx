import { Bell } from 'lucide-react';

export default function Notifications() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Notifications</h1>
      <div className="text-center py-16">
        <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
        <p className="text-xs text-gray-400 mt-2">WhatsApp notifications will appear here once the backend and Twilio are connected.</p>
      </div>
    </div>
  );
}
