import { supabase } from '../config/supabase.js';

export const getAllRegions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRegionById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: region, error: regionError } = await supabase
      .from('regions')
      .select('*')
      .eq('id', id)
      .single();

    if (regionError || !region) {
      return res.status(404).json({ success: false, message: 'Region not found' });
    }

    const { data: provinces, error: provError } = await supabase
      .from('provinces')
      .select('id, slug, name, capital, hero_image, difficulty, unlock_cost')
      .eq('region_id', id)
      .order('name');

    if (provError) throw provError;

    res.json({
      success: true,
      data: {
        ...region,
        provinces: provinces || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
