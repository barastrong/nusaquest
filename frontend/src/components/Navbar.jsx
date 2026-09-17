import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTheme, saveTheme } from '../utils/localStorage';
import '../styles/navbar.css';

export default function Navbar() {
  const [theme, setTheme] = useState(() => getTheme());
  const [activeLink, setActiveLink] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setIsMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    saveTheme(newTheme);
  };
  const toggleMenu  = () => setIsMenuOpen(v => !v);

  // Scroll ke section di landing page
  const scrollToSection = (sectionId, linkName) => {
    setActiveLink(linkName);
    setIsMenuOpen(false);
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigation = (page, link) => {
    setActiveLink(link);
    setIsMenuOpen(false);
    navigate(page);
  };

  return (
    <div className={`nav-wrapper ${scrolled ? 'scrolled' : ''}`}>
      <nav className={`${scrolled ? 'scrolled' : ''} ${isMenuOpen ? 'menu-open' : ''}`}>

        <div className="nav-logo" onClick={() => handleNavigation('/', 'home')}>
          Nusa<span>Explore</span>
        </div>

        <div className="nav-divider" />

        <div className={`nav-links ${isMenuOpen ? 'nav-links-open' : ''}`}>
          <button
            className={`nav-btn ${activeLink === 'home' ? 'active' : ''}`}
            onClick={() => scrollToSection('home', 'home')}
          >
            Beranda
          </button>
          <button
            className={`nav-btn ${activeLink === 'budaya' ? 'active' : ''}`}
            onClick={() => scrollToSection('culture', 'budaya')}
          >
            Budaya
          </button>
          <button
            className={`nav-btn ${activeLink === 'fitur' ? 'active' : ''}`}
            onClick={() => scrollToSection('features', 'fitur')}
          >
            Fitur
          </button>
          <button
            className={`nav-btn ${activeLink === 'games' ? 'active' : ''}`}
            onClick={() => handleNavigation('/map-games', 'games')}
          >
            Games
          </button>
          <button
            className="nav-btn primary"
            onClick={() => handleNavigation('/map', 'map')}
          >
            Mulai Jelajah
          </button>
          <button
            className="nav-btn theme-btn-mobile"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? '🌙 Mode Terang' : '☀️ Mode Gelap'}
          </button>
        </div>

        <button
          className="theme-toggle theme-toggle-desktop"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>

        <button
          className={`nav-hamburger ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <span /><span /><span />
        </button>

      </nav>
    </div>
  );
}