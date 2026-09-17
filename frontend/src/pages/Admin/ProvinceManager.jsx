import React, { useState, useEffect } from 'react';
import { provinceApi, regionApi } from '../../services/api';

export default function ProvinceManager() {
  const [provinces, setProvinces] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [formData, setFormData] = useState({
    slug: '',
    region_id: 'jawa',
    name: '',
    capital: '',
    tagline: '',
    hero_image: '',
    difficulty: 'sedang',
    unlock_cost: 1,
    description: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [provRes, regRes] = await Promise.all([
        provinceApi.getAll(),
        regionApi.getAll(),
      ]);
      setProvinces(provRes.data || []);
      setRegions(regRes.data || []);
    } catch (err) {
      alert(`Error loading: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      slug: '',
      region_id: regions[0]?.id || 'jawa',
      name: '',
      capital: '',
      tagline: '',
      hero_image: '',
      difficulty: 'sedang',
      unlock_cost: 1,
      description: '',
    });
    setSelectedProvince(null);
    setActiveModal('form');
  };

  const handleOpenEdit = (prov) => {
    setFormData({ ...prov });
    setSelectedProvince(prov);
    setActiveModal('form');
  };

  const handleDelete = async (slug) => {
    if (!window.confirm(`Hapus provinsi ${slug}?`)) return;
    try {
      await provinceApi.delete(slug);
      loadData();
    } catch (err) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedProvince) {
        await provinceApi.update(selectedProvince.slug, formData);
      } else {
        await provinceApi.create(formData);
      }
      setActiveModal(null);
      loadData();
    } catch (err) {
      alert(`Gagal menyimpan: ${err.message}`);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-toolbar">
        <h2>Daftar Provinsi ({provinces.length})</h2>
        <button className="admin-btn" onClick={handleOpenAdd}>+ Tambah Provinsi</button>
      </div>

      {loading ? (
        <p>Memuat data provinsi...</p>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Slug</th>
                <th>Region</th>
                <th>Ibukota</th>
                <th>Kesulitan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {provinces.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td><code>{p.slug}</code></td>
                  <td>{p.region_id}</td>
                  <td>{p.capital}</td>
                  <td>{p.difficulty}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => handleOpenEdit(p)}>Edit</button>
                      <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleDelete(p.slug)}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeModal === 'form' && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h2>{selectedProvince ? 'Edit Provinsi' : 'Tambah Provinsi Baru'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="admin-form-group">
                <label>Nama Provinsi</label>
                <input
                  className="admin-input"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label>Slug (URL key)</label>
                <input
                  className="admin-input"
                  required
                  disabled={!!selectedProvince}
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label>Wilayah / Region</label>
                <select
                  className="admin-select"
                  value={formData.region_id}
                  onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Ibukota</label>
                <input
                  className="admin-input"
                  required
                  value={formData.capital}
                  onChange={(e) => setFormData({ ...formData, capital: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label>Tagline</label>
                <input
                  className="admin-input"
                  value={formData.tagline || ''}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label>Hero Image URL</label>
                <input
                  className="admin-input"
                  value={formData.hero_image || ''}
                  onChange={(e) => setFormData({ ...formData, hero_image: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label>Deskripsi</label>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setActiveModal(null)}>Batal</button>
                <button type="submit" className="admin-btn">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
