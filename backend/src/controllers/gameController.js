import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { supabase } from '../config/supabase.js';

/**
 * HTTP CONNECT proxy tunnel tanpa dependency eksternal (kompatibel penuh dengan Node 18, 20, 22+)
 */
const requestHttpsViaProxy = (targetUrl, options, proxyUrl) => {
  return new Promise((resolve, reject) => {
    const target = new URL(targetUrl);
    const proxy = new URL(proxyUrl);

    const connectReq = http.request({
      host: proxy.hostname,
      port: proxy.port,
      method: 'CONNECT',
      path: `${target.hostname}:${target.port || 443}`,
      headers: {
        'Host': `${target.hostname}:${target.port || 443}`,
        'Proxy-Authorization': 'Basic ' + Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64'),
      },
    });

    connectReq.setTimeout(12000, () => {
      connectReq.destroy(new Error('Proxy CONNECT timeout'));
    });

    connectReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Proxy CONNECT error: ${res.statusCode} ${res.statusMessage}`));
      }

      const agent = new https.Agent({ socket });
      const req = https.request({
        host: target.hostname,
        port: target.port || 443,
        method: options.method || 'GET',
        path: target.pathname + target.search,
        headers: {
          ...options.headers,
          'Host': target.hostname,
        },
        agent,
      }, (response) => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
            text: async () => body,
            json: async () => JSON.parse(body),
          });
        });
      });

      req.on('error', reject);
      if (options.body) req.write(options.body);
      req.end();
    });

    connectReq.on('error', reject);
    connectReq.end();
  });
};

/**
 * Helper untuk request AI dengan dukungan multi-proxy dan fallback otomatis ke native fetch
 */
const fetchAiWithProxy = async (url, options) => {
  const proxyConfig = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  const proxies = proxyConfig.split(',').map(p => p.trim()).filter(Boolean);

  if (proxies.length === 0) {
    return await fetch(url, options);
  }

  let lastError;
  for (const proxy of proxies) {
    try {
      return await requestHttpsViaProxy(url, options, proxy);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
};

export const getQuizzesByProvince = async (req, res) => {
  try {
    const { province } = req.query;

    let query = supabase.from('quizzes').select('id, province_slug, question, options, answer_index');

    if (province) {
      query = query.eq('province_slug', province);
    }

    let { data: quizzes, error } = await query;
    if (error) throw error;

    if (province && (!quizzes || quizzes.length === 0)) {
      const { data: generalQuizzes, error: genError } = await supabase
        .from('quizzes')
        .select('id, province_slug, question, options, answer_index')
        .eq('province_slug', 'general');

      if (genError) throw genError;
      quizzes = generalQuizzes || [];
    }

    res.json({ success: true, data: quizzes || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createQuiz = async (req, res) => {
  try {
    const { province_slug, question, options, answer_index } = req.body;

    if (!province_slug || !question || !options || answer_index === undefined) {
      return res.status(400).json({ success: false, message: 'province_slug, question, options, and answer_index are required' });
    }

    const { data, error } = await supabase
      .from('quizzes')
      .insert({ province_slug, question, options, answer_index })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('quizzes')
      .update(req.body)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Generate quiz questions using AI grounded ONLY on database content of the province
 */
export const generateAiQuizzes = async (req, res) => {
  try {
    const { province_slug, count = 3 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'Kunci API kecerdasan buatan belum dikonfigurasi di server backend' });
    }

    if (!province_slug) {
      return res.status(400).json({ success: false, message: 'province_slug wajib diisi' });
    }

    // 1. Ambil data asli dari database Supabase (Strict Grounding)
    const { data: province, error: provErr } = await supabase
      .from('provinces')
      .select('id, name, capital, tagline, description, language, population, area, facts')
      .eq('slug', province_slug)
      .single();

    if (provErr || !province) {
      return res.status(404).json({ success: false, message: 'Data provinsi tidak ditemukan di database' });
    }

    const [culturesRes, tourismsRes, culinariesRes] = await Promise.all([
      supabase.from('cultures').select('title, description').eq('province_id', province.id),
      supabase.from('tourisms').select('name, location').eq('province_id', province.id),
      supabase.from('culinaries').select('name, description').eq('province_id', province.id),
    ]);

    const contextData = {
      nama_provinsi: province.name,
      ibu_kota: province.capital,
      tagline: province.tagline,
      deskripsi: province.description,
      bahasa_daerah: province.language,
      luas_wilayah: province.area,
      populasi: province.population,
      fakta_unik: province.facts || [],
      kebudayaan: (culturesRes.data || []).map(c => `${c.title}: ${c.description}`),
      destinasi_wisata: (tourismsRes.data || []).map(t => `${t.name} (${t.location || ''})`),
      kuliner_khas: (culinariesRes.data || []).map(c => `${c.name}: ${c.description || ''}`),
    };

    // 2. Susun prompt sistem yang ketat agar tidak mengambil informasi di luar DB
    const systemPrompt = `Kamu adalah sistem generator bank soal edukasi kebudayaan NusaQuest.
ATURAN SANGAT KETAT:
1. Buat ${count} butir soal pilihan ganda (4 opsi jawaban A, B, C, D) HANYA dan MUTLAK bersumber dari DATA RESMI DATABASE yang diberikan di bawah ini.
2. DILARANG KERAS mengarang fakta atau mengambil informasi di luar data konteks yang disediakan.
3. answer_index adalah angka indeks jawaban yang benar (0 untuk opsi pertama, 1 untuk opsi kedua, 2 untuk opsi ketiga, 3 untuk opsi keempat).
4. Opsi pengecoh (distractor) harus tetap realistis dan berkaitan dengan topik budaya nusantara.
5. Format output WAJIB HANYA berupa JSON Array valid tanpa pembungkus markdown apapun.

DATA RESMI PROVINSI DARI DATABASE:
${JSON.stringify(contextData, null, 2)}`;

    const aiEndpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const aiResponse = await fetchAiWithProxy(aiEndpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return res.status(500).json({ success: false, message: `Gagal memproses soal AI: ${errText}` });
    }

    const aiData = await aiResponse.json();
    const rawJson = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) {
      return res.status(500).json({ success: false, message: 'Tidak mendapatkan respons teks dari AI' });
    }

    const parsedQuizzes = JSON.parse(rawJson);
    const formatted = (Array.isArray(parsedQuizzes) ? parsedQuizzes : [parsedQuizzes]).map(q => ({
      province_slug,
      question: q.question,
      options: q.options,
      answer_index: q.answer_index,
    }));

    res.json({
      success: true,
      message: `Berhasil generate ${formatted.length} soal kuis dengan AI dari data database`,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllPuzzles = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('puzzles')
      .select('id, title, emoji_grid, correct_grid');

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPuzzle = async (req, res) => {
  try {
    const { title, emoji_grid, correct_grid } = req.body;
    if (!title || !emoji_grid || !correct_grid) {
      return res.status(400).json({ success: false, message: 'title, emoji_grid, and correct_grid are required' });
    }

    const { data, error } = await supabase
      .from('puzzles')
      .insert({ title, emoji_grid, correct_grid })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePuzzle = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('puzzles')
      .update(req.body)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePuzzle = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('puzzles').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Puzzle deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
