import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChangePasswordModal from '../common/ChangePasswordModal';
import WelcomeWalkthrough from '../common/WelcomeWalkthrough';
import { useAuth } from '../../context/AuthContext';
import { Menu } from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const { user } = useAuth();

  const forcedChange = user?.must_change_password === true;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onChangePassword={() => setShowChangePw(true)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-3 text-lg font-bold text-gray-900 dark:text-white">NNN Tickets</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Forced password change on first login */}
      {forcedChange && (
        <ChangePasswordModal open forced onClose={() => {}} />
      )}

      {/* Voluntary password change */}
      {showChangePw && !forcedChange && (
        <ChangePasswordModal open onClose={() => setShowChangePw(false)} />
      )}

      {/* Welcome walkthrough for first-time users (after password is set) */}
      {!forcedChange && <WelcomeWalkthrough />}
    </div>
  );
}
