import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import MapPage from './pages/Map/MapPage';
import DetailMapPage from './pages/Map/DetailMapPage';
import Footer from './components/Footer';
import GamesPage from './pages/Games/GamesPage';
import MapsPage from './pages/Games/MapPage';
import MapsPageDetail from './pages/Games/DetailMapPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import { AuthProvider } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import GameHistoryModal from './components/GameHistoryModal';
import GuestKeyRewardModal from './components/GuestKeyRewardModal';
import { getUserData, getTheme, resetUserData } from './utils/localStorage';

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    getUserData();
    const theme = getTheme();
    document.documentElement.setAttribute('data-theme', theme);

    window.resetData = () => {
      resetUserData();
      window.location.reload();
    };
  }, []);

  const hideFooter =
    location.pathname === '/map' ||
    location.pathname.startsWith('/detailmap/') ||
    location.pathname === '/map-games' ||
    location.pathname.startsWith('/map-games-detail/') ||
    location.pathname.startsWith('/games/');

  const hideNavbar =
    location.pathname === '/map' ||
    location.pathname.startsWith('/detailmap/') ||
    location.pathname === '/map-games' ||
    location.pathname.startsWith('/map-games-detail/') ||
    location.pathname.startsWith('/games/');

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/detailmap/:name" element={<DetailMapPage />} />
        <Route path="/games/:slug" element={<GamesPage />} />
        <Route path="/map-games" element={<MapsPage />} />
        <Route path="/map-games-detail/:name" element={<MapsPageDetail />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
      {!hideFooter && <Footer />}

      {/* Global Modals for Auth, Game History & Guest Rewards */}
      <AuthModal />
      <GameHistoryModal />
      <GuestKeyRewardModal />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
