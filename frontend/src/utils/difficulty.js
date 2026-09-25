// Konfigurasi tingkat kesulitan provinsi.
//
// Dipisah dari `pages/Games/MapPage.jsx` supaya file halaman hanya mengekspor
// komponen (aturan react-refresh/only-export-components) dan konstanta ini bisa
// dipakai bersama oleh halaman & komponen peta.

export const DIFFICULTY_CONFIG = {
  mudah:  { unlockCost: 1, keyReward: 2, label: 'Mudah',  color: '#40916C' },
  sedang: { unlockCost: 2, keyReward: 3, label: 'Sedang', color: '#C9A84C' },
  susah:  { unlockCost: 3, keyReward: 4, label: 'Susah',  color: '#e74c3c' },
};

export const REGION_DIFFICULTY = {
  'aceh': 'mudah', 'sumatera-utara': 'mudah', 'dki-jakarta': 'mudah',
  'jawa-barat': 'mudah', 'jawa-timur': 'mudah', 'bali': 'mudah',
  'yogyakarta': 'mudah', 'riau': 'mudah', 'jawa-tengah': 'mudah',
  'sumatera-barat': 'sedang', 'sumatera-selatan': 'sedang', 'bengkulu': 'sedang',
  'lampung': 'sedang', 'jambi': 'sedang', 'banten': 'sedang',
  'bangka-belitung': 'sedang', 'kepulauan-riau': 'sedang',
  'nusa-tenggara-barat': 'sedang', 'nusa-tenggara-timur': 'sedang',
  'kalimantan-barat': 'sedang', 'kalimantan-selatan': 'sedang',
  'sulawesi-utara': 'sedang', 'sulawesi-tengah': 'sedang',
  'sulawesi-selatan': 'sedang', 'sulawesi-tenggara': 'sedang',
  'sulawesi-barat': 'sedang', 'maluku': 'sedang',
  'kalimantan-tengah': 'susah', 'kalimantan-timur': 'susah',
  'kalimantan-utara': 'susah', 'maluku-utara': 'susah',
  'gorontalo': 'susah', 'papua-barat': 'susah', 'papua-barat-daya': 'susah',
  'papua-tengah': 'susah', 'papua-selatan': 'susah',
  'papua-pegunungan': 'susah', 'papua': 'susah',
};

/** Info kesulitan (unlockCost, keyReward, label, color) untuk sebuah provinsi */
export const getDifficultyInfo = (regionId) => {
  const diff = REGION_DIFFICULTY[regionId] || 'sedang';
  return { difficulty: diff, ...DIFFICULTY_CONFIG[diff] };
};
