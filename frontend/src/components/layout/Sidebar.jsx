import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { DEPARTMENTS, DEPT_COLORS } from '../../utils/constants';
import {
  LayoutDashboard, KanbanSquare, PlusCircle, Settings,
  Bell, LogOut, Sun, Moon, ClipboardList, X, Building2,
  ChevronDown, Check, ArrowLeftCircle, Lock, User,
} from 'lucide-react';

export default function Sidebar({ open, onClose, onChangePassword }) {
  const { user, logout, isAdmin, isViewingAsOther, switchUser, switchBackToAdmin, allUsers, adminUser } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showUserPicker, setShowUserPicker] = useState(false);
  const pickerRef = useRef(null);

  // Close user picker on outside click
  useEffect(() => {
    if (!showUserPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowUserPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserPicker]);

  const links = [
    { to: '/my-tasks', icon: ClipboardList, label: 'My Tasks' },
    { to: '/tickets', icon: KanbanSquare, label: 'All Tickets' },
    { to: '/clients', icon: Building2, label: 'Clients' },
    { to: '/create', icon: PlusCircle, label: 'Create Ticket' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    ...(!isViewingAsOther ? [{ to: '/profile', icon: User, label: 'My Profile' }] : []),
    ...(isAdmin ? [{ to: '/settings', icon: Settings, label: 'Settings' }] : []),
  ];

  const deptColor = {
    Management: 'bg-management',
    Marketing: 'bg-marketing',
    IT: 'bg-it',
    Accounting: 'bg-accounting',
  };

  const activeUsers = (allUsers || []).filter(u => u.is_active);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64
        bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-blue-600" />
            <span className="text-lg font-bold text-gray-900 dark:text-white">NNN Tickets</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Back to Admin banner — shown when viewing as another user */}
        {isViewingAsOther && (
          <button
            onClick={switchBackToAdmin}
            className="flex items-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
          >
            <ArrowLeftCircle className="w-4 h-4 flex-shrink-0" />
            <span>Back to {adminUser?.name}</span>
          </button>
        )}

        {/* User Info — Clickable to switch user (admin only) */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 relative" ref={pickerRef}>
          {isAdmin ? (
            <button
              onClick={() => setShowUserPicker(v => !v)}
              className="flex items-center gap-3 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-2 px-2 py-1 rounded-lg transition-colors"
            >
              <div className={`w-9 h-9 rounded-full ${deptColor[user?.department] || 'bg-gray-400'} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                {isViewingAsOther && <p className="text-[9px] text-blue-500 font-medium uppercase tracking-wide">Viewing as</p>}
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.department}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserPicker ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <div className="flex items-center gap-3 -mx-2 px-2 py-1">
              <div className={`w-9 h-9 rounded-full ${deptColor[user?.department] || 'bg-gray-400'} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.department}</p>
              </div>
            </div>
          )}

          {/* User Picker Dropdown (admin only) */}
          {isAdmin && showUserPicker && (
            <div className="absolute left-2 right-2 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">View as team member</p>
              </div>
              {DEPARTMENTS.map(dept => {
                const deptUsers = activeUsers.filter(u => u.department === dept);
                if (deptUsers.length === 0) return null;
                return (
                  <div key={dept}>
                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/30">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${DEPT_COLORS[dept]?.dot || 'bg-gray-400'}`} />
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{dept}</span>
                      </div>
                    </div>
                    {deptUsers.map(u => {
                      const isSelected = u.id === user?.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => { switchUser(u.id); setShowUserPicker(false); }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                        >
                          <div className={`w-6 h-6 rounded-full ${DEPT_COLORS[dept]?.dot || 'bg-gray-400'} flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0`}>
                            {u.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate block">{u.name}</span>
                            <span className="text-[10px] text-gray-400">{u.role}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }
              `}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 w-full transition-colors"
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
