/**
 * google-cloud.js — CookMind
 * Google Gemini API integration for AI-powered recipe recommendations.
 *
 * SETUP: Replace GEMINI_API_KEY with your key from https://aistudio.google.com/app/apikey
 * If left as the placeholder, the module automatically falls back to demo mode.
 */

const GeminiAPI = (() => {
  'use strict';

  // ── Configuration ──────────────────────────────────────────
  const GEMINI_API_KEY   = 'YOUR_GEMINI_API_KEY_HERE';
  const GEMINI_MODEL     = 'gemini-2.0-flash';
  const GEMINI_ENDPOINT  = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const REQUEST_TIMEOUT_MS = 15000;

  const IS_DEMO_MODE = !GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE';

  // ── Demo fallback responses ────────────────────────────────
  const DEMO_RECOMMENDATIONS = `✨ AI Recipe Suggestions (Demo Mode)

Based on your ingredients, here are some smart ideas:

🍽️ Quick Wins
• Turn any leftover protein + vegetables into a stir-fry with soy sauce and sesame oil.
• Blend soft vegetables with stock for a 10-minute blender soup.
• Toss roasted veggies with pasta, olive oil, and parmesan for an instant weeknight dinner.

🥗 Healthy Upgrades
• Add chickpeas or lentils to bulk out salads with plant protein.
• Swap white rice for cauliflower rice to cut carbs.
• Use Greek yoghurt instead of cream to lighten sauces.

🛒 Smart Pantry Tips
• Keep canned tomatoes, garlic, and dried pasta on hand — they unlock dozens of recipes.
• A jar of tahini turns almost any vegetable dish into a satisfying meal.
• Stock cubes + any leftover grains = instant risotto or pilaf.

💡 Tip: Add your API key to google-cloud.js to unlock personalised Gemini recommendations!`;

  const DEMO_NUTRITION = `📊 Nutrition Insights (Demo Mode)

General guidance for balanced cooking:

• Aim for half your plate to be colourful vegetables.
• Include a palm-sized portion of protein at each meal.
• Choose whole grains over refined where possible.
• Healthy fats (olive oil, avocado, nuts) support absorption of fat-soluble vitamins.
• Season with herbs and spices — they add flavour without calories.

💡 Connect the Gemini API for ingredient-specific nutrition analysis.`;

  // ── Helpers ────────────────────────────────────────────────

  /**
   * Build a Gemini API request body for a plain text prompt.
   * @param {string} prompt - The prompt text.
   * @returns {Object} Request body object.
   */
  function buildRequestBody(prompt) {
    return {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 600,
        topP: 0.9
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    };
  }

  /**
   * Send a prompt to the Gemini API with a timeout guard.
   * @param {string} prompt     - Text prompt for the model.
   * @returns {Promise<string>} Model's text response.
   * @throws {Error} On network failure, timeout, or API error.
   */
  async function callGemini(prompt) {
    const controller   = new AbortController();
    const timeoutId    = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildRequestBody(prompt)),
        signal:  controller.signal
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const apiMessage = errorBody?.error?.message || response.statusText;
        throw new Error(`Gemini API error ${response.status}: ${apiMessage}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Gemini returned an empty response. Please try again.');
      }

      return text.trim();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── Public API ─────────────────────────────────────────────

  /**
   * Get AI-powered recipe recommendations for a list of ingredients.
   * Falls back to a demo response if no API key is configured.
   *
   * @param {string[]} ingredients - Array of ingredient names.
   * @returns {Promise<string>}    Formatted recipe suggestion text.
   */
  async function getRecipeRecommendations(ingredients) {
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new Error('Please provide at least one ingredient.');
    }

    if (IS_DEMO_MODE) {
      await simulateDelay(600);
      return DEMO_RECOMMENDATIONS;
    }

    const ingredientList = ingredients.map(i => `• ${i}`).join('\n');
    const prompt = `You are a creative, friendly chef assistant.

A user has these ingredients at home:
${ingredientList}

Please provide:
1. Three recipe ideas they can make (title + 1-sentence description each).
2. Two healthy cooking tips relevant to these ingredients.
3. One smart ingredient substitution suggestion.

Keep your response concise, practical, and encouraging. Use emoji sparingly for readability.`;

    try {
      return await callGemini(prompt);
    } catch (err) {
      console.error('[GeminiAPI] getRecipeRecommendations failed:', err.message);
      throw new Error(`Could not reach Gemini: ${err.message}`);
    }
  }

  /**
   * Get nutrition and health insights for a list of ingredients.
   * Falls back to a demo response if no API key is configured.
   *
   * @param {string[]} ingredients - Array of ingredient names.
   * @returns {Promise<string>}    Formatted nutrition insights text.
   */
  async function getNutritionInsights(ingredients) {
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new Error('Please provide at least one ingredient.');
    }

    if (IS_DEMO_MODE) {
      await simulateDelay(500);
      return DEMO_NUTRITION;
    }

    const ingredientList = ingredients.join(', ');
    const prompt = `You are a registered nutritionist assistant.

Provide a brief, friendly nutrition overview for a meal containing: ${ingredientList}.

Include:
• Key vitamins or minerals present
• Rough calorie range for one serving
• One health benefit of the combination
• One simple tip to make the meal more nutritious

Keep it under 150 words. Be encouraging and practical.`;

    try {
      return await callGemini(prompt);
    } catch (err) {
      console.error('[GeminiAPI] getNutritionInsights failed:', err.message);
      throw new Error(`Nutrition insight unavailable: ${err.message}`);
    }
  }

  /**
   * Generate a structured weekly meal plan using AI based on dietary preferences.
   * Falls back to a demo response if no API key is configured.
   *
   * @param {string}   dietaryPreference - e.g. "vegetarian", "high-protein", "low-carb".
   * @param {string[]} availableIngredients - Ingredients the user already has.
   * @returns {Promise<string>} Formatted weekly meal plan text.
   */
  async function generateMealPlan(dietaryPreference, availableIngredients) {
    const preference  = dietaryPreference || 'balanced';
    const ingredients = Array.isArray(availableIngredients) ? availableIngredients : [];

    if (IS_DEMO_MODE) {
      await simulateDelay(700);
      return `📅 Weekly Meal Plan — ${preference} (Demo Mode)\n\nMonday: Overnight oats / Lentil soup / Grilled chicken salad\nTuesday: Scrambled eggs / Veggie wrap / Pasta primavera\nWednesday: Smoothie bowl / Hummus & pita / Stir-fried tofu\nThursday: Avocado toast / Greek salad / Baked salmon\nFriday: Banana pancakes / Minestrone / Homemade pizza\nSaturday: French toast / Caesar salad / Beef tacos\nSunday: Shakshuka / Tomato soup / Roast vegetables\n\n💡 Connect the Gemini API for a personalised plan using your pantry ingredients!`;
    }

    const pantryNote = ingredients.length > 0
      ? `The user already has: ${ingredients.slice(0, 10).join(', ')}.`
      : '';

    const prompt = `Create a concise 7-day ${preference} meal plan (Breakfast / Lunch / Dinner per day).
${pantryNote}
Format each day as:  Day: Breakfast | Lunch | Dinner
Keep meal names brief (2–5 words). End with one practical prep tip.`;

    try {
      return await callGemini(prompt);
    } catch (err) {
      console.error('[GeminiAPI] generateMealPlan failed:', err.message);
      throw new Error(`Meal plan generation failed: ${err.message}`);
    }
  }

  // ── Internal helpers ───────────────────────────────────────

  /**
   * Simulate an async delay (used in demo mode to mimic network latency).
   * @param {number} ms - Milliseconds to wait.
   * @returns {Promise<void>}
   */
  function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Expose public methods ──────────────────────────────────
  return {
    getRecipeRecommendations,
    getNutritionInsights,
    generateMealPlan,
    isDemoMode: IS_DEMO_MODE
  };
})();
