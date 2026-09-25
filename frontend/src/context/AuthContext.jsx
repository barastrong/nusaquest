import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, userApi } from '../services/api';
import { getDeviceId, getUserData, updateUserData, syncFromBackend, resetUserData, getProvinceQuizProgress } from '../utils/localStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('nusaquest_token'));
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState(() => getUserData());
  const [gameHistory, setGameHistory] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Sync progress with backend
  const syncProgressWithBackend = useCallback(async () => {
    if (!localStorage.getItem('nusaquest_token')) {
      return getUserData();
    }
    try {
      const deviceId = getDeviceId();
      const localData = getUserData();
      const res = await userApi.syncProgress({ deviceId, localProgress: localData });
      if (res?.success && res?.data) {
        const synced = syncFromBackend(res.data);
        setUserProgress(synced);
        return synced;
      }
    } catch (err) {
      console.error('Failed to sync user progress:', err.message);
    }
    return getUserData();
  }, []);

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
          await syncProgressWithBackend();
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
  }, [fetchHistory, syncProgressWithBackend]);

  const login = async (identifier, password) => {
    const deviceId = getDeviceId();
    const res = await authApi.login({ identifier, password, deviceId });
    if (res.success && res.token) {
      localStorage.setItem('nusaquest_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);
      await syncProgressWithBackend();
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
      await syncProgressWithBackend();
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
    resetUserData();
    setUserProgress(getUserData());
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

  const getProvinceProgress = useCallback((provinceSlug, gameType = 'quiz') => {
    if (!provinceSlug) {
      return {
        isCompleted: false,
        attempts: 0,
        highScore: 0,
        lastScore: 0,
        hasAttempted: false,
        lastPlayedAt: null,
      };
    }
    const local = getProvinceQuizProgress(provinceSlug);
    const provHistory = (gameHistory || []).filter(
      (h) => h.province_slug === provinceSlug && (!gameType || h.game_type === gameType)
    );

    if (provHistory.length > 0) {
      const attempts = Math.max(local.attempts, provHistory.length);
      const highScore = Math.max(local.highScore, ...provHistory.map((h) => h.score || 0));
      const isCompleted = local.isCompleted || provHistory.some((h) => h.passed);
      const lastItem = provHistory[0];
      return {
        isCompleted,
        attempts,
        highScore,
        lastScore: lastItem?.score ?? local.lastScore,
        hasAttempted: attempts > 0,
        lastPlayedAt: lastItem?.played_at || local.lastPlayedAt,
      };
    }

    return local;
  }, [gameHistory, userProgress]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user),
    userProgress,
    setUserProgress,
    syncProgressWithBackend,
    gameHistory,
    fetchHistory,
    getProvinceProgress,
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
