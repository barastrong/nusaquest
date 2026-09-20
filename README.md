# NusaQuest 🗺️✨

Platform interaktif edukasi kebudayaan 38 provinsi di Indonesia melalui eksplorasi visual, mini-game edukatif, serta gamifikasi berbasis kunci dan progres lintas perangkat.

---

## 🎯 Tujuan Proyek

1. **Preservasi & Edukasi Budaya**: Mengenalkan identitas daerah, rumah adat, kesenian, kuliner khas, destinasi wisata, dan fakta unik nusantara dalam satu platform modern yang interaktif.
2. **Gamifikasi Pembelajaran**: Mengubah proses belajar kebudayaan menjadi pengalaman eksplorasi wilayah (Map Games), kuis wawasan daerah, dan puzzle visual nusantara.
3. **Penyelarasan Data Dinamis**: Pengelolaan bank data provinsi, konten budaya, dan pertanyaan kuis secara terpusat melalui REST API dan Dashboard Admin.

---

## ✨ Fitur Utama

- **Peta Eksplorasi Interaktif**:
  - Penjelajahan wilayah 38 provinsi Indonesia via SVG map interaktif.
  - Detail komprehensif: ibu kota, luas wilayah, populasi, bahasa daerah, budaya, kuliner, wisata, dan fun facts.
- **Map Games (Gamified Unlock System)**:
  - Pembukaan provinsi menggunakan sistem kunci (Key Economy).
  - Skema kesulitan berjenjang: Mudah (2 Kunci), Sedang (3 Kunci), Susah (4 Kunci).
  - Bonus 1 kunci otomatis untuk akun baru yang mendaftar.
- **Mini-Games**:
  - **Quiz Budaya**: Menguji pemahaman pengguna seputar kebudayaan dan fakta provinsi terkait.
  - **Puzzle Nusantara**: Permainan susun kepingan gambar 3×3 berbasis kanvas HTML5 yang bersumber langsung dari foto budaya, wisata, dan hero image provinsi.
- **Autentikasi & Sinkronisasi Cloud**:
  - Dukungan akun (Login/Register) dengan sinkronisasi otomatis ke Supabase (`user_progress`, `user_scores`).
  - Pencegahan race condition sesi saat refresh halaman.
  - Riwayat skor dan riwayat provinsi yang telah diselesaikan.
- **Kuis Interaktif Berbasis AI (AI Question Generation)**:
  - Integrasi Google Gemini 3.6 Flash untuk pembuatan bank soal kuis otomatis di Admin Panel.
  - **Strict Database Grounding**: AI dilarang keras mengarang fakta; pertanyaan dan pilihan pengecoh dibuat mutlak berdasarkan data resmi yang tersimpan di Supabase (ibukota, budaya, kuliner, wisata, dan fun facts).
- **Dashboard Admin**:
  - Manajemen konten provinsi & kekayaan budaya (Culture, Tourism, Culinary).
  - Manajemen bank soal kuis budaya & fitur *Generate Soal AI*.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite 8
- **Routing**: React Router DOM v7
- **Styling**: Vanilla CSS (Desain dark & aksen emas khas Nusantara)
- **Icons**: React Icons (Feather, Heroicons)

### Backend
- **Runtime**: Node.js (ES Module)
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: Google Gemini 3.6 Flash API (`@google/generative-ai` / REST integration via strict grounding prompt)
- **Realtime / Sockets**: WebSocket (`ws`)

---

## 🚀 Panduan Menjalankan Proyek

### 1. Prasyarat
- Node.js versi 18+ atau lebih baru
- Akun / Proyek Supabase aktif

### 2. Konfigurasi Environment Backend
Salin file environment atau buat file `.env` di dalam direktori `backend/`:
```env
PORT=5000
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ADMIN_SECRET_KEY=<your-admin-key>
JWT_SECRET=<your-jwt-secret>
GEMINI_API_KEY=<your-gemini-api-key>
```

### 3. Menjalankan Backend
```bash
cd backend
npm install
npm run dev
```
Backend akan berjalan di `http://localhost:5000`.

### 4. Menjalankan Frontend
Buka terminal baru:
```bash
cd frontend
npm install
npm run dev
```
Frontend akan berjalan di `http://localhost:5173`.

---

## 📁 Struktur Direktori

```text
infinitera/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Logika controller (provinsi, game, user, auth)
│   │   ├── routes/           # Endpoint routing Express
│   │   ├── services/         # Integrasi Supabase client & DB queries
│   │   └── server.js         # Entry point Express & WebSocket server
│   └── test/                 # Health check & integration tests
├── frontend/
│   ├── public/               # Asset statis (Logo, favicon, icons)
│   └── src/
│       ├── components/       # Komponen global (Navbar, Footer, Hero, MapSVG)
│       ├── context/          # State management (AuthContext)
│       ├── pages/            # Halaman utama (HomePage, Map, Games, Admin)
│       ├── services/         # Central API client
│       ├── styles/           # Stylesheet modular
│       └── utils/            # LocalStorage sync, auth helper, image resolver
└── README.md
```

---

## 📄 Lisensi

Proyek ini dikembangkan untuk kebutuhan edukasi dan pelestarian kebudayaan Nusantara.
