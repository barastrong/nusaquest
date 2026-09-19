import React, { useState, useEffect } from 'react';
import { provinceApi, regionApi } from '../../services/api';
import { getImageUrl } from '../../utils/image';

export default function ProvinceManager() {
  const [provinces, setProvinces] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null); // 'form' | 'content'
  const [selectedProvince, setSelectedProvince] = useState(null);

  // Form data for province metadata
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
    factsText: '',
  });

  // Content sub-manager state
  const [contentProv, setContentProv] = useState(null);
  const [contentData, setContentData] = useState({ culture: [], tourism: [], culinary: [], facts: [] });
  const [contentLoading, setContentLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('culture'); // 'culture' | 'tourism' | 'culinary' | 'facts'

  // Sub-item edit/add modal state
  const [subItemModal, setSubItemModal] = useState(null); // null | { type: 'culture'|'tourism'|'culinary', item?: any }
  const [subFormData, setSubFormData] = useState({ title: '', name: '', location: '', image: '', description: '' });
  const [newFactInput, setNewFactInput] = useState('');

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
      factsText: '',
    });
    setSelectedProvince(null);
    setActiveModal('form');
  };

  const handleOpenEdit = (prov) => {
    setFormData({
      ...prov,
      factsText: Array.isArray(prov.facts) ? prov.facts.join('\n') : '',
    });
    setSelectedProvince(prov);
    setActiveModal('form');
  };

  const handleDelete = async (slug) => {
    if (!window.confirm(`Hapus provinsi ${slug}? Semua konten budaya, wisata, dan kuliner terkait akan ikut terhapus.`)) return;
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
      const payload = {
        ...formData,
        facts: formData.factsText
          ? formData.factsText.split('\n').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      delete payload.factsText;

      if (selectedProvince) {
        await provinceApi.update(selectedProvince.slug, payload);
      } else {
        await provinceApi.create(payload);
      }
      setActiveModal(null);
      loadData();
    } catch (err) {
      alert(`Gagal menyimpan: ${err.message}`);
    }
  };

  // ==================== CONTENT SUB-MANAGER ====================
  const loadProvinceContent = async (slug) => {
    try {
      setContentLoading(true);
      const res = await provinceApi.getBySlug(slug);
      if (res?.data) {
        setContentData({
          culture: res.data.culture || [],
          tourism: res.data.tourism || [],
          culinary: res.data.culinary || [],
          facts: Array.isArray(res.data.facts) ? res.data.facts : [],
        });
      }
    } catch (err) {
      alert(`Gagal memuat konten provinsi: ${err.message}`);
    } finally {
      setContentLoading(false);
    }
  };

  const handleOpenContent = (prov) => {
    setContentProv(prov);
    setActiveModal('content');
    setActiveSubTab('culture');
    loadProvinceContent(prov.slug);
  };

  // Sub-item Modal Handlers
  const handleOpenSubItemModal = (type, item = null) => {
    setSubItemModal({ type, item });
    if (item) {
      setSubFormData({
        title: item.title || '',
        name: item.name || '',
        location: item.location || '',
        image: item.image || '',
        description: item.description || '',
      });
    } else {
      setSubFormData({ title: '', name: '', location: '', image: '', description: '' });
    }
  };

  const handleSaveSubItem = async (e) => {
    e.preventDefault();
    if (!contentProv || !subItemModal) return;
    const { type, item } = subItemModal;
    const isEdit = !!item;

    try {
      if (type === 'culture') {
        const payload = {
          title: subFormData.title,
          image: subFormData.image,
          description: subFormData.description,
        };
        if (isEdit) {
          await provinceApi.updateCulture(item.id, payload);
        } else {
          await provinceApi.addCulture(contentProv.slug, payload);
        }
      } else if (type === 'tourism') {
        const payload = {
          name: subFormData.name,
          location: subFormData.location,
          image: subFormData.image,
          description: subFormData.description,
        };
        if (isEdit) {
          await provinceApi.updateTourism(item.id, payload);
        } else {
          await provinceApi.addTourism(contentProv.slug, payload);
        }
      } else if (type === 'culinary') {
        const payload = {
          name: subFormData.name,
          image: subFormData.image,
          description: subFormData.description,
        };
        if (isEdit) {
          await provinceApi.updateCulinary(item.id, payload);
        } else {
          await provinceApi.addCulinary(contentProv.slug, payload);
        }
      }

      setSubItemModal(null);
      await loadProvinceContent(contentProv.slug);
    } catch (err) {
      alert(`Gagal menyimpan ${type}: ${err.message}`);
    }
  };

  const handleDeleteSubItem = async (type, id, name) => {
    if (!window.confirm(`Hapus ${type} "${name}"?`)) return;
    try {
      if (type === 'culture') await provinceApi.deleteCulture(id);
      if (type === 'tourism') await provinceApi.deleteTourism(id);
      if (type === 'culinary') await provinceApi.deleteCulinary(id);
      await loadProvinceContent(contentProv.slug);
    } catch (err) {
      alert(`Gagal menghapus ${type}: ${err.message}`);
    }
  };

  // Facts Handlers
  const handleAddFact = async () => {
    if (!newFactInput.trim() || !contentProv) return;
    const updatedFacts = [...contentData.facts, newFactInput.trim()];
    try {
      await provinceApi.update(contentProv.slug, { facts: updatedFacts });
      setContentData((prev) => ({ ...prev, facts: updatedFacts }));
      setNewFactInput('');
    } catch (err) {
      alert(`Gagal menambah fakta: ${err.message}`);
    }
  };

  const handleDeleteFact = async (index) => {
    if (!contentProv) return;
    const updatedFacts = contentData.facts.filter((_, i) => i !== index);
    try {
      await provinceApi.update(contentProv.slug, { facts: updatedFacts });
      setContentData((prev) => ({ ...prev, facts: updatedFacts }));
    } catch (err) {
      alert(`Gagal menghapus fakta: ${err.message}`);
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
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="admin-btn admin-btn-sm"
                        style={{ background: '#3b82f6', color: '#fff' }}
                        onClick={() => handleOpenContent(p)}
                        title="Kelola Budaya, Wisata, Kuliner, dan Fakta"
                      >
                        Kelola Konten
                      </button>
                      <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => handleOpenEdit(p)}>
                        Edit
                      </button>
                      <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleDelete(p.slug)}>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: EDIT/TAMBAH PROVINSI */}
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
                  placeholder="/images/provinces/contoh-hero.jpg"
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
              <div className="admin-form-group">
                <label>Fakta Menarik (1 fakta per baris)</label>
                <textarea
                  className="admin-textarea"
                  rows={4}
                  placeholder="Ketik setiap fakta menarik di baris baru..."
                  value={formData.factsText || ''}
                  onChange={(e) => setFormData({ ...formData, factsText: e.target.value })}
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

      {/* MODAL 2: SUB-CONTENT MANAGER (BUDAYA, WISATA, KULINER, FAKTA) */}
      {activeModal === 'content' && contentProv && (
        <div className="admin-modal-overlay">
          <div className="admin-modal admin-modal-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2>Kelola Konten: {contentProv.name}</h2>
                <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>
                  Kelola item budaya, destinasi wisata, makanan khas, dan fakta menarik.
                </p>
              </div>
              <button
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => { setActiveModal(null); setContentProv(null); }}
              >
                Tutup
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="admin-subtabs">
              <button
                className={`admin-subtab-btn ${activeSubTab === 'culture' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('culture')}
              >
                Budaya
                <span className="admin-subtab-badge">{contentData.culture.length}</span>
              </button>
              <button
                className={`admin-subtab-btn ${activeSubTab === 'tourism' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('tourism')}
              >
                Wisata
                <span className="admin-subtab-badge">{contentData.tourism.length}</span>
              </button>
              <button
                className={`admin-subtab-btn ${activeSubTab === 'culinary' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('culinary')}
              >
                Kuliner
                <span className="admin-subtab-badge">{contentData.culinary.length}</span>
              </button>
              <button
                className={`admin-subtab-btn ${activeSubTab === 'facts' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('facts')}
              >
                Fakta Menarik
                <span className="admin-subtab-badge">{contentData.facts.length}</span>
              </button>
            </div>

            {contentLoading ? (
              <p style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af' }}>Memuat konten...</p>
            ) : (
              <div>
                {/* SUBTAB 1: BUDAYA */}
                {activeSubTab === 'culture' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Daftar Warisan Budaya</h3>
                      <button className="admin-btn admin-btn-sm" onClick={() => handleOpenSubItemModal('culture')}>
                        + Tambah Budaya
                      </button>
                    </div>
                    {contentData.culture.length === 0 ? (
                      <p style={{ color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic' }}>Belum ada data budaya untuk provinsi ini.</p>
                    ) : (
                      contentData.culture.map((item) => (
                        <div key={item.id} className="admin-item-row">
                          <div className="admin-item-info">
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.title}
                              className="admin-item-thumb"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="admin-item-text">
                              <div className="admin-item-title">{item.title}</div>
                              <div className="admin-item-desc">{item.description}</div>
                            </div>
                          </div>
                          <div className="admin-item-actions">
                            <button
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              onClick={() => handleOpenSubItemModal('culture', item)}
                            >
                              Edit
                            </button>
                            <button
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              onClick={() => handleDeleteSubItem('culture', item.id, item.title)}
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* SUBTAB 2: WISATA */}
                {activeSubTab === 'tourism' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Daftar Destinasi Wisata</h3>
                      <button className="admin-btn admin-btn-sm" onClick={() => handleOpenSubItemModal('tourism')}>
                        + Tambah Wisata
                      </button>
                    </div>
                    {contentData.tourism.length === 0 ? (
                      <p style={{ color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic' }}>Belum ada data destinasi wisata untuk provinsi ini.</p>
                    ) : (
                      contentData.tourism.map((item) => (
                        <div key={item.id} className="admin-item-row">
                          <div className="admin-item-info">
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              className="admin-item-thumb"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="admin-item-text">
                              <div className="admin-item-title">{item.name} <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'normal' }}>({item.location})</span></div>
                              <div className="admin-item-desc">{item.description}</div>
                            </div>
                          </div>
                          <div className="admin-item-actions">
                            <button
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              onClick={() => handleOpenSubItemModal('tourism', item)}
                            >
                              Edit
                            </button>
                            <button
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              onClick={() => handleDeleteSubItem('tourism', item.id, item.name)}
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* SUBTAB 3: KULINER */}
                {activeSubTab === 'culinary' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Daftar Kuliner Khas</h3>
                      <button className="admin-btn admin-btn-sm" onClick={() => handleOpenSubItemModal('culinary')}>
                        + Tambah Kuliner
                      </button>
                    </div>
                    {contentData.culinary.length === 0 ? (
                      <p style={{ color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic' }}>Belum ada data kuliner untuk provinsi ini.</p>
                    ) : (
                      contentData.culinary.map((item) => (
                        <div key={item.id} className="admin-item-row">
                          <div className="admin-item-info">
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              className="admin-item-thumb"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="admin-item-text">
                              <div className="admin-item-title">{item.name}</div>
                              <div className="admin-item-desc">{item.description}</div>
                            </div>
                          </div>
                          <div className="admin-item-actions">
                            <button
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              onClick={() => handleOpenSubItemModal('culinary', item)}
                            >
                              Edit
                            </button>
                            <button
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              onClick={() => handleDeleteSubItem('culinary', item.id, item.name)}
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* SUBTAB 4: FAKTA MENARIK */}
                {activeSubTab === 'facts' && (
                  <div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                      <input
                        className="admin-input"
                        placeholder="Tulis fakta unik atau menarik baru..."
                        value={newFactInput}
                        onChange={(e) => setNewFactInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFact(); } }}
                      />
                      <button className="admin-btn" style={{ whiteSpace: 'nowrap' }} onClick={handleAddFact}>
                        + Tambah Fakta
                      </button>
                    </div>

                    <div className="admin-facts-list">
                      {contentData.facts.length === 0 ? (
                        <p style={{ color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic' }}>Belum ada fakta menarik yang tersimpan.</p>
                      ) : (
                        contentData.facts.map((fact, index) => (
                          <div key={index} className="admin-fact-item">
                            <span style={{ color: '#f59e0b', fontWeight: 'bold', minWidth: '24px' }}>#{index + 1}</span>
                            <span>{fact}</span>
                            <button
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              onClick={() => handleDeleteFact(index)}
                              title="Hapus fakta ini"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: ADD/EDIT SUB-ITEM DIALOG */}
      {subItemModal && (
        <div className="admin-modal-overlay" style={{ zIndex: 1000 }}>
          <div className="admin-modal" style={{ maxWidth: '520px' }}>
            <h2>
              {subItemModal.item ? 'Edit' : 'Tambah'}{' '}
              {subItemModal.type === 'culture' ? 'Budaya' : subItemModal.type === 'tourism' ? 'Wisata' : 'Kuliner'}
            </h2>
            <form onSubmit={handleSaveSubItem}>
              {subItemModal.type === 'culture' ? (
                <div className="admin-form-group">
                  <label>Judul Warisan Budaya</label>
                  <input
                    className="admin-input"
                    required
                    placeholder="Contoh: Tari Saman, Rumah Gadang"
                    value={subFormData.title}
                    onChange={(e) => setSubFormData({ ...subFormData, title: e.target.value })}
                  />
                </div>
              ) : (
                <div className="admin-form-group">
                  <label>Nama {subItemModal.type === 'tourism' ? 'Destinasi Wisata' : 'Kuliner Khas'}</label>
                  <input
                    className="admin-input"
                    required
                    placeholder={subItemModal.type === 'tourism' ? 'Contoh: Pantai Lampuuk' : 'Contoh: Mie Aceh'}
                    value={subFormData.name}
                    onChange={(e) => setSubFormData({ ...subFormData, name: e.target.value })}
                  />
                </div>
              )}

              {subItemModal.type === 'tourism' && (
                <div className="admin-form-group">
                  <label>Lokasi Destinasi</label>
                  <input
                    className="admin-input"
                    required
                    placeholder="Contoh: Aceh Besar, Banda Aceh"
                    value={subFormData.location}
                    onChange={(e) => setSubFormData({ ...subFormData, location: e.target.value })}
                  />
                </div>
              )}

              <div className="admin-form-group">
                <label>URL Gambar</label>
                <input
                  className="admin-input"
                  placeholder="/images/culture/Aceh/aceh-1.jpg atau https://..."
                  value={subFormData.image}
                  onChange={(e) => setSubFormData({ ...subFormData, image: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label>Deskripsi / Penjelasan Singkat</label>
                <textarea
                  className="admin-textarea"
                  rows={4}
                  required
                  placeholder="Tuliskan deskripsi lengkap atau sejarah singkat..."
                  value={subFormData.description}
                  onChange={(e) => setSubFormData({ ...subFormData, description: e.target.value })}
                />
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setSubItemModal(null)}
                >
                  Batal
                </button>
                <button type="submit" className="admin-btn">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
