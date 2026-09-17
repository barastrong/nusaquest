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
      .select('*')
      .eq('slug', slug)
      .single();

    if (provErr || !province) {
      return res.status(404).json({ success: false, message: 'Province not found' });
    }

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
        culture: culturesRes.data || [],
        tourism: tourismsRes.data || [],
        culinary: culinariesRes.data || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
