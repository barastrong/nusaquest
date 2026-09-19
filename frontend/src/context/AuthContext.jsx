import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, userApi } from '../services/api';
import { getDeviceId, getUserData, updateUserData } from '../utils/localStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('nusaquest_token'));
  const [loading, setLoading] = useState(true);
  const [gameHistory, setGameHistory] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Fetch game history
  const fetchHistory = useCallback(async () => {
    if (!localStorage.getItem('nusaquest_token')) {
      setGameHistory([]);
      return;
    }
    try {
      const res = await userApi.getHistory();
      if (res.success) {
        setGameHistory(res.data || []);
      }
    } catch {
      // Ignored if not authenticated or error
    }
  }, []);

  // Validate existing token on mount
  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      const savedToken = localStorage.getItem('nusaquest_token');
      if (!savedToken) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const res = await authApi.getMe();
        if (mounted && res.success && res.user) {
          setUser(res.user);
          fetchHistory();
        } else {
          localStorage.removeItem('nusaquest_token');
          if (mounted) {
            setToken(null);
            setUser(null);
          }
        }
      } catch {
        localStorage.removeItem('nusaquest_token');
        if (mounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, [fetchHistory]);

  const login = async (identifier, password) => {
    const deviceId = getDeviceId();
    const res = await authApi.login({ identifier, password, deviceId });
    if (res.success && res.token) {
      localStorage.setItem('nusaquest_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);
      fetchHistory();
      return res.user;
    }
    throw new Error(res.message || 'Login gagal.');
  };

  const register = async ({ username, email, password, displayName }) => {
    const deviceId = getDeviceId();
    const res = await authApi.register({
      username,
      email,
      password,
      displayName,
      deviceId,
    });
    if (res.success && res.token) {
      localStorage.setItem('nusaquest_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);
      const currentData = getUserData();
      if ((currentData.keys || 0) < 1) {
        updateUserData({ keys: 1 });
      }
      fetchHistory();
      return res.user;
    }
    throw new Error(res.message || 'Registrasi gagal.');
  };

  const logout = () => {
    localStorage.removeItem('nusaquest_token');
    setToken(null);
    setUser(null);
    setGameHistory([]);
    setIsHistoryModalOpen(false);
  };

  const openAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const openHistoryModal = () => {
    fetchHistory();
    setIsHistoryModalOpen(true);
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user),
    gameHistory,
    fetchHistory,
    login,
    register,
    logout,
    isAuthModalOpen,
    authModalTab,
    setAuthModalTab,
    openAuthModal,
    closeAuthModal,
    isHistoryModalOpen,
    openHistoryModal,
    closeHistoryModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
