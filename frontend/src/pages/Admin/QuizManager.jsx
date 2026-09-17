import React, { useState, useEffect } from 'react';
import { gameApi, provinceApi } from '../../services/api';

export default function QuizManager() {
  const [quizzes, setQuizzes] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);

  const [formData, setFormData] = useState({
    province_slug: 'general',
    question: '',
    options: ['', '', '', ''],
    answer_index: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [quizRes, provRes] = await Promise.all([
        gameApi.getQuizzes(selectedProvince),
        provinceApi.getAll(),
      ]);
      setQuizzes(quizRes.data || []);
      setProvinces(provRes.data || []);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProvince]);

  const handleOpenAdd = () => {
    setFormData({
      province_slug: selectedProvince || 'general',
      question: '',
      options: ['', '', '', ''],
      answer_index: 0,
    });
    setEditingQuiz(null);
    setActiveModal(true);
  };

  const handleOpenEdit = (q) => {
    setFormData({
      province_slug: q.province_slug,
      question: q.question,
      options: [...q.options],
      answer_index: q.answer_index,
    });
    setEditingQuiz(q);
    setActiveModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus soal ini?')) return;
    try {
      await gameApi.deleteQuiz(id);
      loadData();
    } catch (err) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingQuiz) {
        await gameApi.updateQuiz(editingQuiz.id, formData);
      } else {
        await gameApi.createQuiz(formData);
      }
      setActiveModal(false);
      loadData();
    } catch (err) {
      alert(`Gagal menyimpan: ${err.message}`);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-toolbar">
        <div>
          <h2>Bank Soal Quiz ({quizzes.length})</h2>
          <div style={{ marginTop: '8px' }}>
            <select
              className="admin-select"
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="">Semua Provinsi</option>
              <option value="general">General / Umum</option>
              {provinces.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="admin-btn" onClick={handleOpenAdd}>+ Tambah Soal Quiz</button>
      </div>

      {loading ? (
        <p>Memuat bank quiz...</p>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Provinsi</th>
                <th>Pertanyaan</th>
                <th>Kunci Jawaban</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((q) => (
                <tr key={q.id}>
                  <td><code>{q.province_slug}</code></td>
                  <td>{q.question}</td>
                  <td><span style={{ color: '#10b981', fontWeight: 'bold' }}>{q.options[q.answer_index]}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => handleOpenEdit(q)}>Edit</button>
                      <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleDelete(q.id)}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h2>{editingQuiz ? 'Edit Soal Quiz' : 'Tambah Soal Baru'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="admin-form-group">
                <label>Provinsi Terkait</label>
                <select
                  className="admin-select"
                  value={formData.province_slug}
                  onChange={(e) => setFormData({ ...formData, province_slug: e.target.value })}
                >
                  <option value="general">General (Semua)</option>
                  {provinces.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Teks Pertanyaan</label>
                <textarea
                  className="admin-textarea"
                  rows={2}
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                />
              </div>

              {formData.options.map((opt, idx) => (
                <div key={idx} className="admin-form-group">
                  <label>Pilihan {String.fromCharCode(65 + idx)}</label>
                  <input
                    className="admin-input"
                    required
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...formData.options];
                      newOpts[idx] = e.target.value;
                      setFormData({ ...formData, options: newOpts });
                    }}
                  />
                </div>
              ))}

              <div className="admin-form-group">
                <label>Indeks Jawaban Benar</label>
                <select
                  className="admin-select"
                  value={formData.answer_index}
                  onChange={(e) => setFormData({ ...formData, answer_index: Number(e.target.value) })}
                >
                  <option value={0}>Pilihan A</option>
                  <option value={1}>Pilihan B</option>
                  <option value={2}>Pilihan C</option>
                  <option value={3}>Pilihan D</option>
                </select>
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setActiveModal(false)}>Batal</button>
                <button type="submit" className="admin-btn">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
