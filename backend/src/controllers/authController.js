export const verifyAdminKey = async (req, res) => {
  try {
    const { key } = req.body;
    const adminKey = process.env.ADMIN_SECRET_KEY || 'nusaquest2026';

    if (!key || key !== adminKey) {
      return res.status(401).json({ success: false, message: 'Kode akses admin tidak valid' });
    }

    res.json({ success: true, message: 'Akses disetujui' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
