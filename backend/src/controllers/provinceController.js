import { supabase } from '../config/supabase.js';

export const getAllProvinces = async (req, res) => {
  try {
    const { region } = req.query;
    let query = supabase.from('provinces').select('id, slug, region_id, name, capital, tagline, hero_image, difficulty, unlock_cost');

    if (region) {
      query = query.eq('region_id', region);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProvinceBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: province, error: provErr } = await supabase
      .from('provinces')
      .select('*, regions(name)')
      .eq('slug', slug)
      .single();

    if (provErr || !province) {
      return res.status(404).json({ success: false, message: 'Province not found' });
    }

    const regionName = province.regions?.name || province.region_id || '';

    const [culturesRes, tourismsRes, culinariesRes] = await Promise.all([
      supabase.from('cultures').select('*').eq('province_id', province.id),
      supabase.from('tourisms').select('*').eq('province_id', province.id),
      supabase.from('culinaries').select('*').eq('province_id', province.id),
    ]);

    if (culturesRes.error) throw culturesRes.error;
    if (tourismsRes.error) throw tourismsRes.error;
    if (culinariesRes.error) throw culinariesRes.error;

    res.json({
      success: true,
      data: {
        ...province,
        region: regionName,
        culture: culturesRes.data || [],
        tourism: tourismsRes.data || [],
        culinary: culinariesRes.data || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProvince = async (req, res) => {
  try {
    const { slug, region_id, name, capital, tagline, hero_image, description, facts, difficulty, unlock_cost } = req.body;

    if (!slug || !region_id || !name || !capital) {
      return res.status(400).json({ success: false, message: 'slug, region_id, name, and capital are required' });
    }

    const { data, error } = await supabase
      .from('provinces')
      .insert({
        slug,
        region_id,
        name,
        capital,
        tagline: tagline || '',
        hero_image: hero_image || '',
        description: description || '',
        facts: facts || [],
        difficulty: difficulty || 'sedang',
        unlock_cost: unlock_cost || 1,
      })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProvince = async (req, res) => {
  try {
    const { slug } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('provinces')
      .update(updates)
      .eq('slug', slug)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Province not found' });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProvince = async (req, res) => {
  try {
    const { slug } = req.params;
    const { error } = await supabase
      .from('provinces')
      .delete()
      .eq('slug', slug);

    if (error) throw error;
    res.json({ success: true, message: 'Province deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addCulture = async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, description, image } = req.body;

    const { data: prov } = await supabase.from('provinces').select('id').eq('slug', slug).single();
    if (!prov) return res.status(404).json({ success: false, message: 'Province not found' });

    const { data, error } = await supabase
      .from('cultures')
      .insert({ province_id: prov.id, title, description, image })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCulture = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('cultures').update(req.body).eq('id', id).select('*').single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCulture = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('cultures').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Culture deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addTourism = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, location, description, image } = req.body;

    const { data: prov } = await supabase.from('provinces').select('id').eq('slug', slug).single();
    if (!prov) return res.status(404).json({ success: false, message: 'Province not found' });

    const { data, error } = await supabase
      .from('tourisms')
      .insert({ province_id: prov.id, name, location, description, image })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTourism = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('tourisms').update(req.body).eq('id', id).select('*').single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTourism = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('tourisms').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Tourism deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addCulinary = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, description, image } = req.body;

    const { data: prov } = await supabase.from('provinces').select('id').eq('slug', slug).single();
    if (!prov) return res.status(404).json({ success: false, message: 'Province not found' });

    const { data, error } = await supabase
      .from('culinaries')
      .insert({ province_id: prov.id, name, description, image })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCulinary = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('culinaries').update(req.body).eq('id', id).select('*').single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCulinary = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('culinaries').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Culinary deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
