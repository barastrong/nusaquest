import { supabase } from '../config/supabase.js';

export const getQuizzesByProvince = async (req, res) => {
  try {
    const { province } = req.query;
    const targetSlug = province || 'general';

    let { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('id, province_slug, question, options, answer_index')
      .eq('province_slug', targetSlug);

    if (error) throw error;

    if (!quizzes || quizzes.length === 0) {
      const { data: generalQuizzes, error: genError } = await supabase
        .from('quizzes')
        .select('id, province_slug, question, options, answer_index')
        .eq('province_slug', 'general');

      if (genError) throw genError;
      quizzes = generalQuizzes || [];
    }

    res.json({ success: true, data: quizzes });
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
