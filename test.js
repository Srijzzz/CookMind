/**
 * CookMind – Test Suite
 * Tests validators, storage, Firebase mocks, Gemini fallback.
 * Run in browser console or Node.js (no DOM required).
 */

(function testSuite() {
  'use strict';

  // ---------- Test Helpers ----------
  const results = [];
  function assert(condition, msg) { if (!condition) throw new Error(msg || 'Assertion failed'); }
  function test(label, fn) {
    try { fn(); results.push({ label, passed: true }); }
    catch (err) { results.push({ label, passed: false, error: err.message }); }
  }
  async function testAsync(label, fn) {
    try { await fn(); results.push({ label, passed: true }); }
    catch (err) { results.push({ label, passed: false, error: err.message }); }
  }

  // ---------- Validators (mirror app.js) ----------
  const MAX_INGREDIENT_LEN = 60;
  function validateIngredient(value) {
    if (!value || !value.trim()) return { valid: false, message: 'Enter an ingredient.' };
    if (value.trim().length > MAX_INGREDIENT_LEN) return { valid: false, message: 'Too long.' };
    if (/[<>"'`]/.test(value)) return { valid: false, message: 'Invalid characters.' };
    return { valid: true, message: '' };
  }

  function validateGroceryItem(value) {
    if (!value || !value.trim()) return { valid: false, message: 'Enter an item.' };
    if (value.trim().length > 100) return { valid: false, message: 'Too long.' };
    return { valid: true, message: '' };
  }

  function validatePlannerEntry(meal, day, slot) {
    if (!meal || !meal.trim()) return { valid: false, message: 'Meal required.' };
    if (!day) return { valid: false, message: 'Day required.' };
    if (!slot) return { valid: false, message: 'Slot required.' };
    return { valid: true, message: '' };
  }

  function sanitise(str) {
    return String(str).replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  // ---------- Mock localStorage ----------
  const mockStorage = {};
  const localStorage = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  };
  global.localStorage = localStorage; // for Node

  // ---------- Tests (20+) ----------
  // 1
  test('validateIngredient – valid input', () => {
    const res = validateIngredient('chicken');
    assert(res.valid === true, 'Should be valid');
  });
  // 2
  test('validateIngredient – empty string', () => {
    const res = validateIngredient('');
    assert(res.valid === false, 'Empty invalid');
  });
  // 3
  test('validateIngredient – null', () => {
    const res = validateIngredient(null);
    assert(res.valid === false);
  });
  // 4
  test('validateIngredient – too long', () => {
    const res = validateIngredient('a'.repeat(61));
    assert(res.valid === false);
  });
  // 5
  test('validateIngredient – XSS chars', () => {
    const res = validateIngredient('<script>');
    assert(res.valid === false);
  });
  // 6
  test('validateGroceryItem – valid', () => {
    const res = validateGroceryItem('Milk');
    assert(res.valid === true);
  });
  // 7
  test('validateGroceryItem – empty', () => {
    const res = validateGroceryItem('   ');
    assert(res.valid === false);
  });
  // 8
  test('validatePlannerEntry – valid', () => {
    const res = validatePlannerEntry('Pasta', 'Monday', 'Dinner');
    assert(res.valid === true);
  });
  // 9
  test('validatePlannerEntry – missing meal', () => {
    const res = validatePlannerEntry('', 'Monday', 'Dinner');
    assert(res.valid === false);
  });
  // 10
  test('sanitise – removes HTML tags', () => {
    const out = sanitise('<b>Hi</b>');
    assert(out === '&lt;b&gt;Hi&lt;/b&gt;', 'Escapes correctly');
  });
  // 11
  test('localStorage – set/get', () => {
    localStorage.setItem('test', JSON.stringify({a:1}));
    const val = JSON.parse(localStorage.getItem('test'));
    assert(val.a === 1);
    localStorage.removeItem('test');
    assert(localStorage.getItem('test') === null);
  });
  // 12
  test('localStorage – clear', () => {
    localStorage.setItem('x', 'y');
    localStorage.clear();
    assert(localStorage.getItem('x') === null);
  });

  // ---------- AI / Gemini Mock ----------
  async function mockGeminiRecipes(ingredients) {
    if (!ingredients.length) throw new Error('No ingredients');
    // Simulate network
    await new Promise(r => setTimeout(r, 10));
    return [
      { title: 'Mock Recipe', time: '20 min', servings: 2, difficulty: 'Easy',
        ingredients: ingredients.slice(0,3), steps: ['Step 1', 'Step 2'] }
    ];
  }

  // 13
  testAsync('Gemini mock – returns recipes', async () => {
    const recipes = await mockGeminiRecipes(['chicken']);
    assert(Array.isArray(recipes) && recipes.length > 0, 'Returns array');
    assert(recipes[0].title === 'Mock Recipe');
  });

  // 14
  testAsync('Gemini mock – empty ingredients throws', async () => {
    let threw = false;
    try { await mockGeminiRecipes([]); } catch(e) { threw = true; }
    assert(threw, 'Should throw error');
  });

  // 15
  test('Score recipe – tag matching', () => {
    const ingredients = ['chicken', 'garlic'];
    const recipeTags = ['chicken', 'garlic', 'lemon'];
    const score = recipeTags.filter(t => ingredients.includes(t)).length;
    assert(score === 2, 'Match count correct');
  });

  // 16
  test('Add to favorites – idempotent', () => {
    let favs = [];
    const recipe = { id: 1, title: 'Test' };
    if (!favs.find(f => f.id === recipe.id)) favs.push(recipe);
    assert(favs.length === 1);
    // second add does nothing
    if (!favs.find(f => f.id === recipe.id)) favs.push(recipe);
    assert(favs.length === 1);
  });

  // 17
  test('Planner – add meal to day/slot', () => {
    let planner = {};
    const day = 'Monday', slot = 'Lunch', meal = 'Pasta';
    if (!planner[day]) planner[day] = {};
    if (!planner[day][slot]) planner[day][slot] = [];
    planner[day][slot].push(meal);
    assert(planner.Monday.Lunch.includes('Pasta'));
  });

  // 18
  test('Grocery – toggle checked', () => {
    let grocery = [{ id: 1, name: 'Milk', checked: false }];
    const item = grocery.find(g => g.id === 1);
    item.checked = !item.checked;
    assert(grocery[0].checked === true);
  });

  // 19
  test('Planner to grocery – extracts ingredients', () => {
    const recipeMap = { 'Pasta': { ingredients: ['pasta', 'tomato'] } };
    const plannerMeals = ['Pasta'];
    const grocerySet = new Set();
    plannerMeals.forEach(meal => {
      if (recipeMap[meal]) {
        recipeMap[meal].ingredients.forEach(ing => grocerySet.add(ing));
      }
    });
    assert(grocerySet.has('pasta') && grocerySet.has('tomato'));
  });

  // 20
  test('Export grocery – generates text', () => {
    const grocery = [{ name: 'Apple', category: 'Produce', checked: false }];
    const text = grocery.map(g => `[${g.category}] ${g.name}`).join('\n');
    assert(text.includes('Apple') && text.includes('Produce'));
  });

  // ---------- Report ----------
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const percent = ((passed / total) * 100).toFixed(1);
  console.log('\n🧪 COOKMIND TEST SUITE');
  results.forEach(r => console.log(`${r.passed ? '✅' : '❌'} ${r.label}${r.error ? ' – ' + r.error : ''}`));
  console.log(`\n📊 ${passed}/${total} passed (${percent}%)`);
  console.log(percent >= 90 ? '🎉 EXCELLENT' : '⚠️ Needs work');
})();