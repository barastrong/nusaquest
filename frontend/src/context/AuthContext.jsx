import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, userApi, guestApi } from '../services/api';
import { getDeviceId } from '../utils/device';
import {
  EMPTY_PROGRESS,
  EMPTY_PROVINCE_STAT,
  GUEST_MAX_PROVINCES,
  canClaimReward as canClaimRewardFor,
  countCompletedProvinces,
  getCompletedGameTypes,
  getProvinceStat,
  hasClaimedReward as hasClaimedRewardFor,
  mapProgressFromApi,
} from '../utils/progress';

const AuthContext = createContext(null);

const TOKEN_KEY = 'nusaquest_token';

// Key localStorage lama yang sudah tidak dipakai lagi. Dibaca sekali lalu dihapus
// supaya data tamu yang tersangkut di browser ikut dipindahkan ke database.
const LEGACY_PROGRESS_KEY = 'nusaquest_user_data';
const LEGACY_WARNING_KEY = 'nusaquest_guest_warning_seen';

const readLegacyLocalData = () => {
  try {
    const raw = localStorage.getItem(LEGACY_PROGRESS_KEY);
    return {
      progress: raw ? JSON.parse(raw) : null,
      warningSeen: localStorage.getItem(LEGACY_WARNING_KEY) === 'true',
    };
  } catch {
    return { progress: null, warningSeen: false };
  }
};

const clearLegacyLocalData = () => {
  try {
    localStorage.removeItem(LEGACY_PROGRESS_KEY);
    localStorage.removeItem(LEGACY_WARNING_KEY);
  } catch {
    // ignore
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState(EMPTY_PROGRESS);
  const [progressLoading, setProgressLoading] = useState(true);
  const [gameHistory, setGameHistory] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [guestRewardInfo, setGuestRewardInfo] = useState(null);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);

  const isAuthenticated = Boolean(user);

  // ---------------------------------------------------------------------------
  // Progres: selalu dibaca dari database (user_progress / guest_progress)
  // ---------------------------------------------------------------------------

  /** Ambil progres milik akun yang sedang login */
  const fetchUserProgress = useCallback(async () => {
    try {
      const res = await userApi.syncProgress({});
      if (res?.success && res.data) {
        const mapped = mapProgressFromApi(res.data);
        setUserProgress(mapped);
        return mapped;
      }
    } catch (err) {
      console.error('Failed to load user progress:', err.message);
    }
    return null;
  }, []);

  /**
   * Ambil progres Mode Tamu dari database untuk perangkat ini.
   * `localData` (opsional) adalah sisa data localStorage lama: dikirim satu kali
   * agar ikut dipindahkan ke database, lalu key localStorage-nya dihapus.
   */
  const fetchGuestProgress = useCallback(async () => {
    const deviceId = getDeviceId();
    const legacy = readLegacyLocalData();
    const hasLegacy = Boolean(
      legacy.warningSeen ||
        (legacy.progress && Object.keys(legacy.progress).length > 0)
    );

    try {
      const res = await guestApi.sync({
        deviceId,
        legacyProgress: hasLegacy ? legacy.progress : undefined,
        legacyWarningSeen: hasLegacy ? legacy.warningSeen : undefined,
      });

      if (res?.success && res.data) {
        const mapped = mapProgressFromApi(res.data);
        setUserProgress(mapped);
        if (hasLegacy) clearLegacyLocalData();
        return mapped;
      }
    } catch (err) {
      console.error('Failed to load guest progress:', err.message);
    }
    return null;
  }, []);

  /** Sinkronkan progres (otomatis memilih jalur tamu atau akun) */
  const syncProgressWithBackend = useCallback(async () => {
    setProgressLoading(true);
    try {
      return user ? await fetchUserProgress() : await fetchGuestProgress();
    } finally {
      setProgressLoading(false);
    }
  }, [user, fetchUserProgress, fetchGuestProgress]);

  // Fetch game history
  const fetchHistory = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
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

  // Validasi token & muat progres awal (akun bila ada token, atau Mode Tamu)
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const savedToken = localStorage.getItem(TOKEN_KEY);

      if (!savedToken) {
        // Mode Tamu: progres diambil dari database berdasarkan device id
        await fetchGuestProgress();
        if (mounted) {
          setProgressLoading(false);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await authApi.getMe();
        if (mounted && res.success && res.user) {
          setUser(res.user);
          // Data localStorage lama tidak boleh bocor ke akun: hapus saja.
          // Progres akun selalu dibaca dari database.
          clearLegacyLocalData();
          await fetchUserProgress();
          if (mounted) fetchHistory();
        } else {
          localStorage.removeItem(TOKEN_KEY);
          if (mounted) {
            setToken(null);
            setUser(null);
          }
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        if (mounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setProgressLoading(false);
          setLoading(false);
        }
      }
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, [fetchHistory, fetchGuestProgress, fetchUserProgress]);

  const login = async (identifier, password) => {
    const res = await authApi.login({ identifier, password });
    if (res.success && res.token) {
      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);

      // Progres milik akun sendiri (progres tamu di perangkat ini sengaja
      // TIDAK diambil — transfer hanya terjadi saat register).
      clearLegacyLocalData();
      await fetchUserProgress();
      fetchHistory();
      return res.user;
    }
    throw new Error(res.message || 'Login gagal.');
  };

  const requestRegister = async ({ username, email, password, displayName }) => {
    const deviceId = getDeviceId();
    const res = await authApi.registerRequest({
      username,
      email,
      password,
      displayName,
      deviceId,
    });
    return res;
  };

  const verifyRegistrationOtp = async ({ email, otp }) => {
    const res = await authApi.verifyOtp({ email, otp });

    if (res.success && res.token) {
      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);
      clearLegacyLocalData();

      // Server sudah memindahkan data tamu ke akun dan menghitung bonus kunci.
      const synced = await fetchUserProgress();
      const transfer = res.guestTransfer || {};
      const completedCount = transfer.completedCount || 0;

      if (completedCount > 0) {
        setGuestRewardInfo({
          keysEarned: transfer.bonusKeys || completedCount,
          completedCount,
          totalKeys: synced?.keys,
        });
        setIsRewardModalOpen(true);
      }

      fetchHistory();
      return res.user;
    }
    throw new Error(res.message || 'Verifikasi OTP gagal.');
  };

  const resendRegistrationOtp = async (email) => {
    const res = await authApi.resendOtp({ email });
    return res;
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
      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);
      clearLegacyLocalData();

      const synced = await fetchUserProgress();
      const transfer = res.guestTransfer || {};
      const completedCount = transfer.completedCount || 0;

      if (completedCount > 0) {
        setGuestRewardInfo({
          keysEarned: transfer.bonusKeys || completedCount,
          completedCount,
          totalKeys: synced?.keys,
        });
        setIsRewardModalOpen(true);
      }

      fetchHistory();
      return res.user;
    }
    throw new Error(res.message || 'Registrasi gagal.');
  };

  const closeRewardModal = () => {
    setIsRewardModalOpen(false);
    setGuestRewardInfo(null);
  };

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setGameHistory([]);
    setIsHistoryModalOpen(false);

    // Progres Mode Tamu tetap milik perangkat ini (per-device), jadi cukup
    // dimuat ulang dari database — bukan direset dari sisi client.
    // Catatan: sengaja memanggil fetchGuestProgress, BUKAN syncProgressWithBackend,
    // karena state `user` di closure ini masih bernilai user yang baru logout.
    setProgressLoading(true);
    try {
      await fetchGuestProgress();
    } finally {
      setProgressLoading(false);
    }
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
    if (!provinceSlug) return { ...EMPTY_PROVINCE_STAT };

    const base = getProvinceStat(userProgress, provinceSlug, gameType);
    const provHistory = (gameHistory || []).filter(
      (h) => h.province_slug === provinceSlug && (!gameType || h.game_type === gameType)
    );

    if (provHistory.length === 0) return base;

    const attempts = Math.max(base.attempts, provHistory.length);
    const highScore = Math.max(base.highScore, ...provHistory.map((h) => h.score || 0));
    const lastItem = provHistory[0];

    return {
      isCompleted: base.isCompleted || provHistory.some((h) => h.passed),
      attempts,
      highScore,
      lastScore: lastItem?.score ?? base.lastScore,
      hasAttempted: attempts > 0,
      lastPlayedAt: lastItem?.played_at || base.lastPlayedAt,
    };
  }, [gameHistory, userProgress]);

  const getCompletedGameTypesFor = useCallback(
    (provinceSlug) => getCompletedGameTypes(userProgress, provinceSlug),
    [userProgress]
  );

  const hasClaimedReward = useCallback(
    (provinceSlug) => hasClaimedRewardFor(userProgress, provinceSlug),
    [userProgress]
  );

  const canClaimReward = useCallback(
    (provinceSlug) => canClaimRewardFor(userProgress, provinceSlug),
    [userProgress]
  );

  const isRegionUnlocked = useCallback(
    (provinceSlug) => (userProgress.unlockedRegions || []).includes(provinceSlug),
    [userProgress]
  );

  /** Jumlah provinsi tuntas versi client (server tetap menghitung ulang saat transfer) */
  const getGuestCompletedProvincesCount = useCallback(
    () => countCompletedProvinces(userProgress),
    [userProgress]
  );

  // ---------------------------------------------------------------------------
  // Aksi progres. Tamu dan akun memakai endpoint berbeda, tapi hasilnya selalu
  // dikembalikan sebagai progres dari database.
  // ---------------------------------------------------------------------------

  const applyProgress = (row) => {
    const mapped = mapProgressFromApi(row);
    setUserProgress(mapped);
    return mapped;
  };

  /** Buka provinsi. Tamu gratis (maks GUEST_MAX_PROVINCES), akun memakai kunci. */
  const unlockRegion = useCallback(async (provinceSlug, keyCost = 1) => {
    if (!provinceSlug) return { success: false, message: 'Provinsi tidak valid.' };
    try {
      const res = user
        ? await userApi.unlockProvince({ provinceSlug, keyCost })
        : await guestApi.unlockProvince({ deviceId: getDeviceId(), provinceSlug });

      if (res?.success && res.data) {
        return { success: true, progress: applyProgress(res.data) };
      }
      return { success: false, message: res?.message || 'Gagal membuka provinsi.' };
    } catch (err) {
      return { success: false, message: err.message, code: err.code };
    }
  }, [user]);

  /** Klaim reward provinsi. Reward tamu selalu +1 kunci (dipaksa di server). */
  const claimProvinceReward = useCallback(async (provinceSlug, keyReward = 1) => {
    if (!provinceSlug) return { success: false, message: 'Provinsi tidak valid.' };
    try {
      const res = user
        ? await userApi.claimReward({ provinceSlug, keyReward })
        : await guestApi.claimReward({ deviceId: getDeviceId(), provinceSlug });

      if (res?.success && res.data) {
        return { success: true, progress: applyProgress(res.data) };
      }
      return { success: false, message: res?.message || 'Gagal mengklaim reward.' };
    } catch (err) {
      return { success: false, message: err.message, code: err.code };
    }
  }, [user]);

  /**
   * Catat percobaan game (quiz/puzzle) ke database.
   * Sebelumnya pencatatan tamu selalu gagal (endpoint butuh login) sehingga
   * statistik tamu tidak pernah tersimpan.
   */
  const recordGameScore = useCallback(async ({ provinceSlug, gameType, score = 0, passed = false }) => {
    if (!provinceSlug || !gameType) {
      return { success: false, message: 'Data game tidak lengkap.' };
    }
    try {
      const payload = { provinceSlug, gameType, score, passed };
      const res = user
        ? await userApi.recordScore(payload)
        : await guestApi.recordScore({ ...payload, deviceId: getDeviceId() });

      if (res?.success && res.data) {
        const mapped = applyProgress(res.data);
        if (user) fetchHistory();
        return { success: true, progress: mapped, provinceStats: res.data.province_stats };
      }
      return { success: false, message: res?.message || 'Gagal menyimpan skor.' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, [user, fetchHistory]);

  /** Tandai modal peringatan Mode Tamu sudah dilihat (tersimpan per perangkat di DB) */
  const markGuestWarningSeen = useCallback(async () => {
    if (user) return;
    setUserProgress((prev) => ({ ...prev, guestWarningSeen: true }));
    try {
      await guestApi.markWarningSeen({ deviceId: getDeviceId() });
    } catch (err) {
      console.error('Failed to mark guest warning as seen:', err.message);
    }
  }, [user]);

  /** Reset total progres Mode Tamu untuk perangkat ini */
  const resetProgress = useCallback(async () => {
    if (user) return false;
    try {
      await guestApi.reset(getDeviceId());
    } catch (err) {
      console.error('Failed to reset guest progress:', err.message);
    }
    await fetchGuestProgress();
    return true;
  }, [user, fetchGuestProgress]);

  const guestWarningSeen = Boolean(userProgress.guestWarningSeen);

  const value = {
    user,
    token,
    loading,
    progressLoading,
    isAuthenticated,
    isGuest: !isAuthenticated,
    userProgress,
    setUserProgress,
    syncProgressWithBackend,
    guestWarningSeen,
    guestLimit: GUEST_MAX_PROVINCES,
    getProvinceProgress,
    getCompletedGameTypes: getCompletedGameTypesFor,
    hasClaimedReward,
    canClaimReward,
    isRegionUnlocked,
    getGuestCompletedProvincesCount,
    unlockRegion,
    claimProvinceReward,
    recordGameScore,
    markGuestWarningSeen,
    resetProgress,
    gameHistory,
    fetchHistory,
    login,
    register,
    requestRegister,
    verifyRegistrationOtp,
    resendRegistrationOtp,
    logout,
    isAuthModalOpen,
    authModalTab,
    setAuthModalTab,
    openAuthModal,
    closeAuthModal,
    isHistoryModalOpen,
    openHistoryModal,
    closeHistoryModal,
    guestRewardInfo,
    isRewardModalOpen,
    closeRewardModal,
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
