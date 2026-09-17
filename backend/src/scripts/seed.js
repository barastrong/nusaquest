import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { regionData, regionToIslandMap } from '../../../frontend/src/data/regionData.js';
import { provinceDetailData } from '../../../frontend/src/data/provinceDetailData.js';
import { quizData } from '../../../frontend/src/data/quizData.js';
import { puzzleData } from '../../../frontend/src/data/puzzleData.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const regionsPayload = Object.entries(regionData).map(([id, item]) => ({
    id,
    name: item.name,
    emoji: item.emoji,
    color: item.color,
    desc: item.desc,
    tags: item.tags,
    cards: item.cards,
  }));

  const { error: regionErr } = await supabase.from('regions').upsert(regionsPayload, { onConflict: 'id' });
  if (regionErr) throw regionErr;

  const regionNameToId = {
    'Sumatera': 'sumatera',
    'Jawa': 'jawa',
    'Kalimantan': 'kalimantan',
    'Sulawesi': 'sulawesi',
    'Bali': 'bali',
    'Bali & Nusa Tenggara': 'bali',
    'Nusa Tenggara': 'bali',
    'Maluku': 'maluku',
    'Maluku & Papua': 'maluku',
    'Papua': 'papua',
  };

  for (const prov of provinceDetailData) {
    const regionId = regionToIslandMap[prov.slug] || regionNameToId[prov.region] || 'jawa';

    const { data: insertedProv, error: provErr } = await supabase
      .from('provinces')
      .upsert({
        slug: prov.slug,
        region_id: regionId,
        name: prov.name,
        tagline: prov.tagline,
        capital: prov.capital,
        population: prov.population,
        area: prov.area,
        language: prov.language,
        hero_image: prov.heroImage,
        description: prov.description,
        facts: prov.facts,
      }, { onConflict: 'slug' })
      .select('id')
      .single();

    if (provErr) {
      console.error(`Failed ${prov.name}:`, provErr.message);
      continue;
    }

    const provinceId = insertedProv.id;

    if (prov.culture?.length) {
      await supabase.from('cultures').delete().eq('province_id', provinceId);
      await supabase.from('cultures').insert(
        prov.culture.map(c => ({
          province_id: provinceId,
          title: c.title,
          description: c.description,
          image: c.image,
        }))
      );
    }

    if (prov.tourism?.length) {
      await supabase.from('tourisms').delete().eq('province_id', provinceId);
      await supabase.from('tourisms').insert(
        prov.tourism.map(t => ({
          province_id: provinceId,
          name: t.name,
          location: t.location,
          description: t.description,
          image: t.image,
        }))
      );
    }

    if (prov.culinary?.length) {
      await supabase.from('culinaries').delete().eq('province_id', provinceId);
      await supabase.from('culinaries').insert(
        prov.culinary.map(cul => ({
          province_id: provinceId,
          name: cul.name,
          description: cul.description,
          image: cul.image,
        }))
      );
    }
  }

  await supabase.from('quizzes').delete().neq('id', 0);
  await supabase.from('quizzes').insert(
    quizData.map(q => ({
      province_slug: q.province,
      question: q.q,
      options: q.opts,
      answer_index: q.ans,
    }))
  );

  await supabase.from('puzzles').delete().neq('id', 0);
  await supabase.from('puzzles').insert(
    puzzleData.map(p => ({
      title: p.title,
      emoji_grid: p.emoji,
      correct_grid: p.correct,
    }))
  );

  console.log('Seeding completed');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
