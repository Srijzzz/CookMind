/**
 * google-cloud.js – CookMind Gemini API with external JSON fallback
 */

const GeminiAPI = (() => {
  const API_KEY = 'AIzaSyALYSAoMsT6MZWCH9613yK0T4i4o5pE4v8'; // Replace with real key
  const MODEL = 'gemini-2.0-flash';
  const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const IS_DEMO_MODE = !API_KEY || API_KEY === 'AIzaSyALYSAoMsT6MZWCH9613yK0T4i4o5pE4v8';

  // Cache for fallback recipes
  let fallbackRecipes = null;

  async function loadFallbackRecipes() {
    if (fallbackRecipes) return fallbackRecipes;
    try {
      const response = await fetch('./fallback-recipes.json');
      if (!response.ok) throw new Error('Network error');
      fallbackRecipes = await response.json();
      return fallbackRecipes;
    } catch (err) {
      console.warn('Could not load fallback JSON, using inline mock');
      // Inline minimal fallback if file missing
      return [
        { id: 'mock1', title: 'Simple Pasta', time: '15 min', servings: 2, difficulty: 'Easy',
          ingredients: ['pasta', 'tomato sauce'], steps: ['Cook pasta', 'Heat sauce', 'Mix'] }
      ];
    }
  }

  async function callGemini(prompt) {
    if (IS_DEMO_MODE) throw new Error('DEMO_MODE');
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
      })
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async function getRecipeRecommendationsFromAI(ingredients) {
    if (!ingredients.length) throw new Error('No ingredients provided');
    try {
      const prompt = `You are a chef. Based on these ingredients: ${ingredients.join(', ')}.
Generate 3 original recipes. Return ONLY a valid JSON array of objects with fields: title, time, servings, difficulty, ingredients (array), steps (array). No extra text. Example: [{"title":"Lemon Chicken","time":"30 min","servings":4,"difficulty":"Easy","ingredients":["chicken","lemon"],"steps":["Marinate","Cook"]}]`;
      const raw = await callGemini(prompt);
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
      throw new Error('Invalid AI response');
    } catch (err) {
      console.warn('Gemini failed, loading fallback JSON:', err.message);
      const fallback = await loadFallbackRecipes();
      // Filter fallback recipes that match at least one ingredient (simple)
      const lowerIngredients = ingredients.map(i => i.toLowerCase());
      let matched = fallback.filter(recipe =>
        recipe.tags.some(tag => lowerIngredients.includes(tag.toLowerCase()))
      );
      if (matched.length === 0) matched = fallback.slice(0, 3);
      return matched;
    }
  }

  return { getRecipeRecommendationsFromAI, isDemoMode: IS_DEMO_MODE };
})();