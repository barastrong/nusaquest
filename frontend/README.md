# NusaQuest - Platform Edukasi Budaya Indonesia

Platform interaktif untuk menjelajahi kekayaan budaya Indonesia dengan peta interaktif dan mini games edukatif.

## 🚀 Teknologi yang Digunakan

### Core Technologies
- **React** 19.2.4 - Library JavaScript untuk membangun user interface
- **React Router DOM** 7.13.1 - Routing dan navigasi halaman
- **Vite** 8.0.0 - Build tool dan development server

### UI & Styling
- **CSS3** - Custom styling dengan CSS Variables untuk theming
- **React Icons** - Icon library (Feather Icons)
- **React Spinners** - Loading animations

### State Management
- **LocalStorage API** - Menyimpan progress user, keys, dan unlocked regions

### Additional Libraries
- **Canvas API** - Untuk puzzle game dan particle effects
- **Intersection Observer API** - Scroll animations

## 📁 Struktur Project

```
src/
├── components/          # Komponen reusable
│   ├── Map/            # Komponen peta
│   │   ├── MapSVG.jsx
│   │   └── RegionPopup.jsx
│   ├── Navbar.jsx
│   ├── Hero.jsx
│   ├── Marquee.jsx
│   ├── CultureGrid.jsx
│   ├── Features.jsx
│   ├── Quote.jsx
│   ├── CTA.jsx
│   └── Footer.jsx
├── pages/              # Halaman utama
│   ├── HomePage.jsx
│   ├── Map/
│   │   ├── MapPage.jsx
│   │   └── DetailMapPage.jsx
│   └── Games/
│       ├── GamesPage.jsx
│       ├── MapPage.jsx          # Map Game dengan unlock system
│       ├── DetailMapPage.jsx   # Detail provinsi
│       ├── QuizGame.jsx
│       ├── PuzzleGame.jsx
│       └── Map/
│           ├── MapSVG.jsx
│           ├── LockedRegionPopup.jsx
│           ├── RegionPopup.jsx
│           └── UnlockAnimation.jsx
├── data/               # Data konten
│   ├── regionData.js
│   ├── provinceDetailData.js
│   ├── quizData.js
│   └── puzzleData.js
├── utils/              # Utility functions
│   └── localStorage.js
└── styles/             # CSS per komponen
    ├── theme.css
    ├── navbar.css
    ├── hero.css
    ├── marquee.css
    ├── culture.css
    ├── features.css
    ├── map.css
    ├── detailmap.css
    ├── games.css
    ├── quiz.css
    ├── puzzle.css
    ├── unlock-anim.css
    └── sections.css
```

## 🎨 Fitur Utama

### 1. **Peta Interaktif Indonesia**
   - Peta SVG Indonesia dengan 34 provinsi
   - Hover effect untuk melihat nama provinsi
   - Klik provinsi untuk melihat detail budaya
   - Responsive design untuk semua device

### 2. **Map Game dengan Unlock System**
   - System kunci untuk unlock provinsi
   - 3 tingkat kesulitan (Easy, Medium, Hard)
   - Progress tracking per provinsi
   - Reward system dengan kunci
   - Unlock animation yang menarik

### 3. **Mini Games Edukatif**
   - **Quiz Budaya**: 10 pertanyaan per provinsi dengan timer
   - **Puzzle Nusantara**: 3x3 puzzle drag & drop dengan gambar budaya
   - Reward kunci setelah menyelesaikan game

### 4. **Detail Provinsi**
   - Informasi lengkap (ibu kota, populasi, luas wilayah, bahasa)
   - Galeri budaya, wisata, dan kuliner
   - Fakta menarik tentang provinsi
   - Hero image dengan parallax effect

### 5. **Dark/Light Mode**
   - Toggle tema dengan smooth transition
   - Persistent theme dengan localStorage
   - Optimized color palette untuk kedua mode

### 6. **Responsive Design**
   - Mobile-first approach
   - Breakpoints: 480px, 640px, 768px, 968px, 1024px
   - Touch-friendly untuk mobile devices

## 🛠️ Instalasi

```bash
# Clone repository
git clone <repository-url>

# Masuk ke direktori project
cd NusaExplore

# Install dependencies
npm install

# Jalankan development server
npm run dev

# Build untuk production
npm run build

# Preview production build
npm run preview
```

## 🎯 Cara Penggunaan

### Halaman Beranda
1. Lihat overview platform NusaExplore
2. Scroll untuk melihat fitur-fitur
3. Klik "Mulai Jelajah" untuk ke peta atau "Main Games" untuk mini games

### Peta Interaktif
1. Hover pada provinsi untuk melihat nama
2. Klik provinsi untuk melihat popup informasi
3. Klik "Lihat Detail Provinsi" untuk informasi lengkap

### Map Game
1. Mulai dengan 1 kunci gratis
2. Klik provinsi yang terkunci untuk melihat requirement
3. Unlock provinsi dengan kunci sesuai tingkat kesulitan:
   - **Easy** (hijau): 1 kunci → reward 2 kunci
   - **Medium** (kuning): 2 kunci → reward 3 kunci
   - **Hard** (merah): 3 kunci → reward 5 kunci
4. Mainkan quiz atau puzzle untuk mendapatkan reward
5. Klaim reward setelah menyelesaikan game

### Quiz Game
1. Jawab 10 pertanyaan dalam waktu yang ditentukan
2. Setiap pertanyaan memiliki timer 30 detik
3. Lihat hasil dan skor akhir
4. Klaim reward kunci jika belum diklaim

### Puzzle Game
1. Susun 3 gambar puzzle (3x3 grid)
2. Drag & drop kepingan untuk menukar posisi
3. Gunakan hint untuk melihat gambar asli
4. Selesaikan semua puzzle untuk mendapatkan reward

### Theme Toggle
1. Klik icon bulan/matahari di navbar
2. Theme akan tersimpan otomatis

## 📸 Sumber Referensi

### Gambar & Media
- **Google Images** - Referensi gambar budaya, wisata, dan kuliner
- **Pinterest** - Inspirasi visual dan gambar ilustrasi

### SVG Peta Indonesia
- **GitHub Repository**: [rezkyyayang/maps](https://github.com/rezkyyayang/maps.git)
- SVG path untuk 34 provinsi Indonesia

## 📝 Catatan

### Data & Konten
- Data provinsi, budaya, wisata, dan kuliner adalah data demonstrasi
- Gambar menggunakan placeholder dan referensi dari internet
- Quiz questions dibuat untuk tujuan edukatif

### Browser Support
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

### Performance
- Lazy loading untuk gambar
- Code splitting dengan React Router
- Optimized CSS dengan CSS Variables
- Smooth animations dengan CSS transitions

### Accessibility
- Semantic HTML
- ARIA labels untuk interactive elements
- Keyboard navigation support
- Color contrast ratio sesuai WCAG guidelines

## 🐛 Known Issues

- Puzzle game mungkin lag pada device low-end
- SVG map scaling pada screen sangat kecil (<360px)

## 👨‍💻 Developer

**Bintang Bara Adyasta**  
SMK TELKOM SIDOARJO

---

**Dibuat dengan ❤️ oleh Bintang Bara Adyasta - SMK TELKOM SIDOARJO**
