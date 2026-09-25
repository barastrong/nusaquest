// Identitas perangkat untuk Mode Tamu.
//
// CATATAN PENTING:
// Ini SATU-SATUNYA nilai yang masih disimpan di localStorage selain token auth
// dan preferensi tema. Progres Mode Tamu (kunci, provinsi terbuka, statistik)
// TIDAK lagi disimpan di browser — semuanya tersimpan di tabel `guest_progress`
// pada database, di-key oleh device id ini.

const DEVICE_ID_KEY = 'nusaquest_device_id';

let memoryDeviceId = null;

const generateDeviceId = () =>
  'dev_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

// Get or generate persistent guest device ID
export const getDeviceId = () => {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // Fallback bila localStorage tidak tersedia (mode privat/kebijakan browser)
    if (!memoryDeviceId) memoryDeviceId = generateDeviceId();
    return memoryDeviceId;
  }
};
