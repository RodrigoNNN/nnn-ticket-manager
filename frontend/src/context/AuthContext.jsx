import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loginUser, fetchUsers } from '../utils/api-service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('nnn_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
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
    localStorage.setItem('nnn_user', JSON.stringify(userData));
    return userData;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('nnn_user');
  }, []);

  // Switch user (for demo/testing — works like quick login)
  const switchUser = useCallback((userId) => {
    const found = allUsers.find(u => u.id === userId);
    if (found) {
      setUser(found);
      localStorage.setItem('nnn_user', JSON.stringify(found));
    }
  }, [allUsers]);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, allUsers, login, logout, switchUser, loading, isAdmin, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
