import { supabase } from '../config/supabase.js';

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
