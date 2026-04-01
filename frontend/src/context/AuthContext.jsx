import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loginUser, fetchUsers } from '../utils/api-service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null); // original admin who logged in
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('nnn_user');
    const storedAdmin = localStorage.getItem('nnn_admin_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // If no admin stored yet but current user is admin, set them as admin
        if (storedAdmin) {
          try { setAdminUser(JSON.parse(storedAdmin)); } catch {}
        } else if (parsed.role === 'admin') {
          setAdminUser(parsed);
          localStorage.setItem('nnn_admin_user', JSON.stringify(parsed));
        }
      } catch {}
    }
    setLoading(false);
  }, []);

  // Load all users for the user switcher (team member list)
  const refreshUsers = useCallback(() => {
    return fetchUsers({ active: true })
      .then(users => setAllUsers(users))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const login = useCallback(async (email, password) => {
    const userData = await loginUser(email, password);
    setUser(userData);
    setAdminUser(userData.role === 'admin' ? userData : null);
    localStorage.setItem('nnn_user', JSON.stringify(userData));
    if (userData.role === 'admin') {
      localStorage.setItem('nnn_admin_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('nnn_admin_user');
    }
    return userData;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAdminUser(null);
    localStorage.removeItem('nnn_user');
    localStorage.removeItem('nnn_admin_user');
  }, []);

  // Switch to view another user's profile (admin only)
  const switchUser = useCallback((userId) => {
    const found = allUsers.find(u => u.id === userId);
    if (found) {
      setUser(found);
      localStorage.setItem('nnn_user', JSON.stringify(found));
    }
  }, [allUsers]);

  // Return to original admin profile
  const switchBackToAdmin = useCallback(() => {
    if (adminUser) {
      setUser(adminUser);
      localStorage.setItem('nnn_user', JSON.stringify(adminUser));
    }
  }, [adminUser]);

  // Update user object in state + localStorage (e.g. after password change)
  const updateUser = useCallback((updatedFields) => {
    setUser(prev => {
      const merged = { ...prev, ...updatedFields };
      localStorage.setItem('nnn_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  const isAdmin = adminUser?.role === 'admin';
  const isViewingAsOther = adminUser && user && adminUser.id !== user.id;

  return (
    <AuthContext.Provider value={{
      user, allUsers, adminUser, login, logout,
      switchUser, switchBackToAdmin, loading,
      isAdmin, isViewingAsOther, refreshUsers, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
