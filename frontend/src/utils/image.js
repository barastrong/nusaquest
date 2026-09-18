/**
 * Mengubah path gambar relatif (seperti /images/provinces/...)
 * menjadi URL lengkap ke server backend jika di production.
 */
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const serverHost = apiBase.replace(/\/api\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return serverHost ? `${serverHost}${cleanPath}` : cleanPath;
};
