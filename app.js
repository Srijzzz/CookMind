/**
 * CookMind — app.js
 * All core features using IIFE module pattern.
 * ES6+, no external libraries, localStorage persistence.
 */

const CookMind = (() => {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const STORAGE_KEY_INGREDIENTS = 'cookmind_ingredients';
  const STORAGE_KEY_FAVORITES   = 'cookmind_favorites';
  const STORAGE_KEY_PLANNER     = 'cookmind_planner';
  const STORAGE_KEY_GROCERY     = 'cookmind_grocery';
  const MAX_INGREDIENT_LENGTH   = 60;
  const DAYS_OF_WEEK = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const MEAL_SLOTS   = ['Breakfast','Lunch','Dinner'];

  // ── Sample recipe data (used as fallback / mock) ───────────
  const MOCK_RECIPES = [
    {
      id: 'r001',
      emoji: '🍗',
      title: 'Lemon Garlic Chicken',
      time: '30 min',
      servings: 4,
      difficulty: 'Easy',
      tags: ['chicken', 'garlic', 'lemon'],
      ingredients: ['500g chicken breast', '4 cloves garlic', '1 lemon (juice & zest)', '2 tbsp olive oil', 'Salt & pepper', 'Fresh parsley'],
      steps: ['Mince garlic and mix with lemon juice, zest, and olive oil.', 'Marinate chicken for 15 minutes.', 'Sear chicken in a hot pan for 6–7 min each side.', 'Rest for 5 minutes, garnish with parsley, and serve.']
    },
    {
      id: 'r002',
      emoji: '🍝',
      title: 'Tomato Basil Pasta',
      time: '20 min',
      servings: 2,
      difficulty: 'Easy',
      tags: ['pasta', 'tomato', 'basil', 'garlic'],
      ingredients: ['200g spaghetti', '400g canned tomatoes', '3 garlic cloves', 'Handful fresh basil', '3 tbsp olive oil', 'Parmesan to serve'],
      steps: ['Boil salted water and cook pasta al dente.', 'Sauté garlic in olive oil until golden.', 'Add tomatoes, simmer 10 min, season.', 'Toss pasta in sauce, top with basil and parmesan.']
    },
    {
      id: 'r003',
      emoji: '🥗',
      title: 'Chickpea & Spinach Bowl',
      time: '15 min',
      servings: 2,
      difficulty: 'Easy',
      tags: ['chickpea', 'spinach', 'healthy'],
      ingredients: ['1 can chickpeas', '2 cups spinach', '1 tsp cumin', '1 tsp paprika', '2 tbsp olive oil', 'Lemon juice'],
      steps: ['Drain and rinse chickpeas.', 'Sauté chickpeas in olive oil with spices for 5 min.', 'Add spinach and wilt for 2 min.', 'Finish with lemon juice and serve.']
    },
    {
      id: 'r004',
      emoji: '🍳',
      title: 'Spanish Omelette',
      time: '25 min',
      servings: 3,
      difficulty: 'Medium',
      tags: ['egg', 'potato', 'onion'],
      ingredients: ['4 eggs', '2 medium potatoes', '1 onion', '3 tbsp olive oil', 'Salt & pepper'],
      steps: ['Slice potatoes and onion thinly.', 'Cook in olive oil on low heat until soft (~15 min).', 'Beat eggs, season, pour over potatoes.', 'Cook until edges set, flip carefully, cook 2 min more.']
    },
    {
      id: 'r005',
      emoji: '🍲',
      title: 'Red Lentil Soup',
      time: '35 min',
      servings: 4,
      difficulty: 'Easy',
      tags: ['lentil', 'onion', 'tomato', 'cumin'],
      ingredients: ['1 cup red lentils', '1 onion', '2 tomatoes', '1 tsp cumin', '1 tsp turmeric', '4 cups vegetable broth'],
      steps: ['Sauté diced onion until soft.', 'Add tomatoes and spices, cook 3 min.', 'Add lentils and broth, bring to boil.', 'Simmer 20 min until lentils dissolve. Blend if desired.']
    },
    {
      id: 'r006',
      emoji: '🥘',
      title: 'Vegetable Stir-Fry',
      time: '15 min',
      servings: 2,
      difficulty: 'Easy',
      tags: ['carrot', 'broccoli', 'soy sauce', 'ginger'],
      ingredients: ['1 carrot', '1 cup broccoli florets', '1 bell pepper', '2 tbsp soy sauce', '1 tsp sesame oil', '1 tsp fresh ginger'],
      steps: ['Heat a wok over high heat with oil.', 'Add vegetables in order of firmness (carrot first).', 'Stir-fry 5–6 min until tender-crisp.', 'Add soy sauce, sesame oil, and ginger. Toss and serve.']
    }
  ];

  // ── State ──────────────────────────────────────────────────
  let state = {
    ingredients: loadFromStorage(STORAGE_KEY_INGREDIENTS) || [],
    favorites:   loadFromStorage(STORAGE_KEY_FAVORITES)   || [],
    planner:     loadFromStorage(STORAGE_KEY_PLANNER)     || {},
    grocery:     loadFromStorage(STORAGE_KEY_GROCERY)     || []
  };

  // ═══════════════════════════════════════════════════════════
  // STORAGE UTILITIES
  // ═══════════════════════════════════════════════════════════

  /**
   * Save a value to localStorage under a given key.
   * @param {string} key - Storage key.
   * @param {*} value    - Data to serialise.
   */
  function saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('Storage write failed:', err);
    }
  }

  /**
   * Load and parse a value from localStorage.
   * @param {string} key - Storage key.
   * @returns {*} Parsed data or null.
   */
  function loadFromStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear a single storage key.
   * @param {string} key - Storage key to remove.
   */
  function clearStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn('Storage clear failed:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UI UTILITIES
  // ═══════════════════════════════════════════════════════════

  /**
   * Show a toast notification.
   * @param {string} message - Message text.
   * @param {'success'|'error'|'info'} type - Toast variant.
   */
  function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3200);
  }

  /**
   * Show or hide the loading spinner overlay.
   * @param {boolean} visible
   */
  function setSpinner(visible) {
    document.getElementById('spinner').hidden = !visible;
  }

  /**
   * Display an inline error message.
   * @param {string} elementId - ID of error element.
   * @param {string} message   - Error text.
   */
  function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  /**
   * Hide an inline error message.
   * @param {string} elementId - ID of error element.
   */
  function hideError(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.hidden = true;
  }

  /**
   * Sanitise a string to prevent XSS in innerHTML.
   * @param {string} str - Raw string.
   * @returns {string} Sanitised string.
   */
  function sanitise(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Switch the visible app section and update nav state.
   * @param {string} sectionName - Section identifier.
   */
  function navigateTo(sectionName) {
    document.querySelectorAll('.app-section').forEach(sec => {
      sec.hidden = !sec.id.endsWith(sectionName);
      if (!sec.hidden) sec.classList.add('active');
      else sec.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === sectionName);
      btn.setAttribute('aria-current', btn.dataset.section === sectionName ? 'page' : 'false');
    });
    if (sectionName === 'favorites') renderFavorites();
    if (sectionName === 'planner')   renderPlanner();
    if (sectionName === 'grocery')   renderGrocery();
  }

  // ═══════════════════════════════════════════════════════════
  // INGREDIENTS
  // ═══════════════════════════════════════════════════════════

  /**
   * Validate an ingredient string.
   * @param {string} value - Raw input.
   * @returns {{ valid: boolean, message: string }}
   */
  function validateIngredient(value) {
    if (!value || !value.trim()) return { valid: false, message: 'Please enter an ingredient.' };
    if (value.trim().length > MAX_INGREDIENT_LENGTH) return { valid: false, message: 'Ingredient name is too long.' };
    if (/[<>"'`]/.test(value)) return { valid: false, message: 'Invalid characters in ingredient.' };
    return { valid: true, message: '' };
  }

  /**
   * Add an ingredient to the state and re-render tags.
   */
  function addIngredient() {
    const input = document.getElementById('ingredientInput');
    const value = input.value.trim().toLowerCase();
    const { valid, message } = validateIngredient(value);

    if (!valid) { showError('ingredientError', message); return; }
    hideError('ingredientError');

    if (state.ingredients.includes(value)) {
      showError('ingredientError', `"${value}" is already added.`);
      return;
    }

    state.ingredients.push(value);
    saveToStorage(STORAGE_KEY_INGREDIENTS, state.ingredients);
    input.value = '';
    renderIngredientTags();
    input.focus();
  }

  /**
   * Remove an ingredient by its value.
   * @param {string} ingredient - Ingredient to remove.
   */
  function removeIngredient(ingredient) {
    state.ingredients = state.ingredients.filter(i => i !== ingredient);
    saveToStorage(STORAGE_KEY_INGREDIENTS, state.ingredients);
    renderIngredientTags();
  }

  /**
   * Render ingredient tag pills.
   */
  function renderIngredientTags() {
    const container = document.getElementById('ingredientTags');
    container.innerHTML = state.ingredients.map(ing => `
      <span class="tag">
        ${sanitise(ing)}
        <button onclick="CookMind.removeIngredient('${sanitise(ing)}')" aria-label="Remove ${sanitise(ing)}">✕</button>
      </span>
    `).join('');
  }

  /**
   * Clear all ingredients from state and UI.
   */
  function clearIngredients() {
    state.ingredients = [];
    saveToStorage(STORAGE_KEY_INGREDIENTS, state.ingredients);
    renderIngredientTags();
    document.getElementById('recipeResults').innerHTML = '';
    document.getElementById('aiPanel').hidden = true;
    showToast('Ingredients cleared.', 'info');
  }

  // ═══════════════════════════════════════════════════════════
  // RECIPE SEARCH
  // ═══════════════════════════════════════════════════════════

  /**
   * Score a recipe by how many of its tags match current ingredients.
   * @param {Object} recipe - Recipe object.
   * @returns {number} Match count.
   */
  function scoreRecipe(recipe) {
    const ingredientSet = new Set(state.ingredients.map(i => i.toLowerCase()));
    return recipe.tags.filter(tag => ingredientSet.has(tag.toLowerCase())).length;
  }

  /**
   * Search recipes based on current ingredients.
   * Filters and sorts mock data; uses AI for enrichment if available.
   */
  async function searchRecipes() {
    if (state.ingredients.length === 0) {
      showError('ingredientError', 'Add at least one ingredient before searching.');
      return;
    }
    hideError('ingredientError');
    setSpinner(true);

    try {
      // Score and sort mock recipes
      const scored = MOCK_RECIPES
        .map(r => ({ ...r, score: scoreRecipe(r) }))
        .sort((a, b) => b.score - a.score);

      const results = scored.length > 0 ? scored : MOCK_RECIPES;
      renderRecipeCards(results, 'recipeResults');
      showToast(`Found ${results.length} recipes!`, 'success');
    } catch (err) {
      showToast('Error searching recipes. Please try again.', 'error');
      console.error(err);
    } finally {
      setSpinner(false);
    }
  }

  /**
   * Render recipe cards into a target container.
   * @param {Array} recipes       - Array of recipe objects.
   * @param {string} containerId  - Target element ID.
   */
  function renderRecipeCards(recipes, containerId) {
    const container = document.getElementById(containerId);
    if (!recipes.length) {
      container.innerHTML = '<p class="empty-state">No recipes found. Try different ingredients!</p>';
      return;
    }
    container.innerHTML = recipes.map(recipe => buildRecipeCard(recipe)).join('');
  }

  /**
   * Build HTML string for a single recipe card.
   * @param {Object} recipe - Recipe data.
   * @returns {string} HTML string.
   */
  function buildRecipeCard(recipe) {
    const isFav = state.favorites.some(f => f.id === recipe.id);
    return `
      <article class="recipe-card" aria-label="${sanitise(recipe.title)}">
        <div class="recipe-card-img" role="img" aria-label="${sanitise(recipe.title)} illustration">${recipe.emoji || '🍽️'}</div>
        <div class="recipe-card-body">
          <h3 class="recipe-card-title">${sanitise(recipe.title)}</h3>
          <div class="recipe-card-meta">
            <span>⏱ ${sanitise(recipe.time)}</span>
            <span>👥 ${sanitise(String(recipe.servings))}</span>
            <span>📊 ${sanitise(recipe.difficulty)}</span>
          </div>
        </div>
        <div class="recipe-card-footer">
          <button class="btn-fav" onclick="CookMind.toggleFavorite('${recipe.id}')" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}" title="${isFav ? 'Saved' : 'Save recipe'}">${isFav ? '❤️' : '🤍'}</button>
          <button class="btn-view" onclick="CookMind.openRecipeModal('${recipe.id}')" aria-label="View ${sanitise(recipe.title)}">View Recipe →</button>
        </div>
      </article>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // RECIPE MODAL
  // ═══════════════════════════════════════════════════════════

  /**
   * Open the recipe detail modal for a given recipe ID.
   * @param {string} recipeId - ID of recipe to display.
   */
  function openRecipeModal(recipeId) {
    const recipe = MOCK_RECIPES.find(r => r.id === recipeId)
      || state.favorites.find(r => r.id === recipeId);
    if (!recipe) return;

    const isFav = state.favorites.some(f => f.id === recipeId);
    const content = `
      <p style="font-size:3rem;margin-bottom:0.5rem">${recipe.emoji || '🍽️'}</p>
      <h2 class="modal-recipe-title">${sanitise(recipe.title)}</h2>
      <div class="modal-recipe-meta">
        <span>⏱ ${sanitise(recipe.time)}</span>
        <span>👥 Serves ${sanitise(String(recipe.servings))}</span>
        <span>📊 ${sanitise(recipe.difficulty)}</span>
      </div>
      <h3 class="modal-section-title">Ingredients</h3>
      <ul class="modal-ingredients">${recipe.ingredients.map(i => `<li>${sanitise(i)}</li>`).join('')}</ul>
      <h3 class="modal-section-title">Method</h3>
      <ol class="modal-steps">${recipe.steps.map(s => `<li>${sanitise(s)}</li>`).join('')}</ol>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="CookMind.toggleFavorite('${recipe.id}'); document.getElementById('recipeModal').hidden=true;">
          ${isFav ? '💔 Remove Favourite' : '❤️ Save to Favourites'}
        </button>
        <button class="btn btn-secondary" onclick="CookMind.addToPlanner('${sanitise(recipe.title)}')">📅 Add to Planner</button>
      </div>
    `;
    document.getElementById('modalContent').innerHTML = content;
    document.getElementById('recipeModal').hidden = false;
    document.getElementById('modalClose').focus();
  }

  /**
   * Close the recipe detail modal.
   */
  function closeRecipeModal() {
    document.getElementById('recipeModal').hidden = true;
  }

  // ═══════════════════════════════════════════════════════════
  // FAVORITES
  // ═══════════════════════════════════════════════════════════

  /**
   * Toggle a recipe's favourite status.
   * @param {string} recipeId - Recipe ID.
   */
  function toggleFavorite(recipeId) {
    const recipe = MOCK_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;

    const index = state.favorites.findIndex(f => f.id === recipeId);
    if (index > -1) {
      state.favorites.splice(index, 1);
      showToast('Removed from favourites.', 'info');
    } else {
      state.favorites.push(recipe);
      showToast('Saved to favourites! ❤️', 'success');
    }
    saveToStorage(STORAGE_KEY_FAVORITES, state.favorites);

    // Refresh both views
    const searchContainer = document.getElementById('recipeResults');
    if (searchContainer.innerHTML) {
      const scored = MOCK_RECIPES.map(r => ({ ...r, score: scoreRecipe(r) })).sort((a, b) => b.score - a.score);
      renderRecipeCards(scored, 'recipeResults');
    }
    if (!document.getElementById('section-favorites').hidden) renderFavorites();
  }

  /**
   * Render saved favourite recipes.
   */
  function renderFavorites() {
    const container = document.getElementById('favoritesList');
    const empty     = document.getElementById('favEmpty');
    if (state.favorites.length === 0) {
      container.innerHTML = '';
      empty.hidden = false;
    } else {
      empty.hidden = true;
      renderRecipeCards(state.favorites, 'favoritesList');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // MEAL PLANNER
  // ═══════════════════════════════════════════════════════════

  /**
   * Validate planner form inputs.
   * @param {string} meal - Meal name.
   * @param {string} day  - Day of week.
   * @param {string} slot - Meal slot.
   * @returns {{ valid: boolean, message: string }}
   */
  function validatePlannerEntry(meal, day, slot) {
    if (!meal || !meal.trim()) return { valid: false, message: 'Please enter a meal name.' };
    if (!day) return { valid: false, message: 'Please select a day.' };
    if (!slot) return { valid: false, message: 'Please select a meal slot (Breakfast/Lunch/Dinner).' };
    if (meal.trim().length > 100) return { valid: false, message: 'Meal name is too long.' };
    return { valid: true, message: '' };
  }

  /**
   * Add a meal to the planner.
   */
  function addMealToPlanner() {
    const meal = document.getElementById('mealInput').value.trim();
    const day  = document.getElementById('mealDay').value;
    const slot = document.getElementById('mealSlot').value;
    const { valid, message } = validatePlannerEntry(meal, day, slot);

    if (!valid) { showError('mealError', message); return; }
    hideError('mealError');

    if (!state.planner[day]) state.planner[day] = {};
    if (!state.planner[day][slot]) state.planner[day][slot] = [];

    state.planner[day][slot].push(meal);
    saveToStorage(STORAGE_KEY_PLANNER, state.planner);

    document.getElementById('mealInput').value = '';
    document.getElementById('mealDay').value = '';
    document.getElementById('mealSlot').value = '';
    renderPlanner();
    showToast(`${meal} added to ${day} ${slot}!`, 'success');
  }

  /**
   * Convenience method for adding a recipe title to planner from the modal.
   * @param {string} mealName - Meal name to pre-fill.
   */
  function addToPlanner(mealName) {
    closeRecipeModal();
    navigateTo('planner');
    document.getElementById('mealInput').value = mealName;
    document.getElementById('mealInput').focus();
    showToast('Choose a day and slot, then click + Add Meal.', 'info');
  }

  /**
   * Remove a specific meal from the planner.
   * @param {string} day   - Day of week.
   * @param {string} slot  - Meal slot.
   * @param {number} index - Index in the slot array.
   */
  function removeMealFromPlanner(day, slot, index) {
    if (state.planner[day] && state.planner[day][slot]) {
      state.planner[day][slot].splice(index, 1);
      if (state.planner[day][slot].length === 0) delete state.planner[day][slot];
      if (Object.keys(state.planner[day]).length === 0) delete state.planner[day];
    }
    saveToStorage(STORAGE_KEY_PLANNER, state.planner);
    renderPlanner();
  }

  /**
   * Render the weekly planner grid.
   */
  function renderPlanner() {
    const grid = document.getElementById('plannerGrid');
    grid.innerHTML = DAYS_OF_WEEK.map(day => {
      const dayData = state.planner[day] || {};
      const mealsHtml = MEAL_SLOTS.map(slot => {
        const meals = dayData[slot] || [];
        return meals.map((meal, idx) => `
          <div class="meal-entry">
            <span><span class="meal-slot-label">${slot[0]}</span>${sanitise(meal)}</span>
            <button class="remove-meal" onclick="CookMind.removeMealFromPlanner('${day}','${slot}',${idx})" aria-label="Remove ${sanitise(meal)}">✕</button>
          </div>
        `).join('');
      }).join('');

      return `
        <div class="day-card">
          <div class="day-card-header">${day}</div>
          <div class="day-card-body">${mealsHtml || '<span style="font-size:0.78rem;color:var(--clr-text-soft)">Empty</span>'}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Clear the entire meal planner.
   */
  function clearPlanner() {
    state.planner = {};
    saveToStorage(STORAGE_KEY_PLANNER, state.planner);
    renderPlanner();
    showToast('Planner cleared.', 'info');
  }

  /**
   * Generate a grocery list from the current planner meals.
   * Collects all meal names and suggests them as grocery items.
   */
  function plannerToGrocery() {
    const allMeals = [];
    Object.values(state.planner).forEach(dayData => {
      Object.values(dayData).forEach(meals => {
        allMeals.push(...meals);
      });
    });

    if (allMeals.length === 0) {
      showToast('Your planner is empty! Add some meals first.', 'error');
      return;
    }

    // Find matching recipes and add their ingredients
    let added = 0;
    allMeals.forEach(mealName => {
      const recipe = MOCK_RECIPES.find(r => r.title.toLowerCase() === mealName.toLowerCase());
      if (recipe) {
        recipe.ingredients.forEach(ingredient => {
          const clean = ingredient.split(',')[0].replace(/^\d+[\s\w]*/,'').trim() || ingredient;
          if (!state.grocery.some(g => g.name.toLowerCase() === clean.toLowerCase())) {
            state.grocery.push({ id: Date.now() + Math.random(), name: clean, category: 'Pantry', checked: false });
            added++;
          }
        });
      } else {
        // Just add the meal as an item
        if (!state.grocery.some(g => g.name.toLowerCase() === mealName.toLowerCase())) {
          state.grocery.push({ id: Date.now() + Math.random(), name: mealName, category: 'Other', checked: false });
          added++;
        }
      }
    });

    saveToStorage(STORAGE_KEY_GROCERY, state.grocery);
    showToast(`Added ${added} item${added !== 1 ? 's' : ''} to your grocery list!`, 'success');
    navigateTo('grocery');
  }

  // ═══════════════════════════════════════════════════════════
  // GROCERY LIST
  // ═══════════════════════════════════════════════════════════

  /**
   * Validate a grocery item input.
   * @param {string} name - Item name.
   * @returns {{ valid: boolean, message: string }}
   */
  function validateGroceryItem(name) {
    if (!name || !name.trim()) return { valid: false, message: 'Please enter an item name.' };
    if (name.trim().length > 100) return { valid: false, message: 'Item name is too long.' };
    if (/[<>"'`]/.test(name)) return { valid: false, message: 'Invalid characters in item name.' };
    return { valid: true, message: '' };
  }

  /**
   * Add a grocery item manually.
   */
  function addGroceryItem() {
    const nameInput = document.getElementById('groceryInput');
    const name      = nameInput.value.trim();
    const category  = document.getElementById('groceryCategory').value;
    const { valid, message } = validateGroceryItem(name);

    if (!valid) { showError('groceryError', message); return; }
    hideError('groceryError');

    state.grocery.push({ id: Date.now(), name, category, checked: false });
    saveToStorage(STORAGE_KEY_GROCERY, state.grocery);
    nameInput.value = '';
    renderGrocery();
    showToast('Item added to grocery list!', 'success');
    nameInput.focus();
  }

  /**
   * Toggle a grocery item's checked status.
   * @param {number} itemId - Item ID.
   */
  function toggleGroceryItem(itemId) {
    const item = state.grocery.find(g => g.id === itemId);
    if (item) {
      item.checked = !item.checked;
      saveToStorage(STORAGE_KEY_GROCERY, state.grocery);
      renderGrocery();
    }
  }

  /**
   * Remove a grocery item by ID.
   * @param {number} itemId - Item ID to remove.
   */
  function removeGroceryItem(itemId) {
    state.grocery = state.grocery.filter(g => g.id !== itemId);
    saveToStorage(STORAGE_KEY_GROCERY, state.grocery);
    renderGrocery();
  }

  /**
   * Render the grocery list grouped by category.
   */
  function renderGrocery() {
    const container = document.getElementById('groceryList');
    if (state.grocery.length === 0) {
      container.innerHTML = '<p class="empty-state">Your grocery list is empty.</p>';
      return;
    }

    // Group by category
    const grouped = {};
    state.grocery.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    container.innerHTML = Object.entries(grouped).map(([category, items]) => `
      <div class="grocery-category-group">
        <div class="grocery-category-title">${sanitise(category)}</div>
        ${items.map(item => `
          <div class="grocery-item ${item.checked ? 'checked' : ''}">
            <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="CookMind.toggleGroceryItem(${item.id})" aria-label="Mark ${sanitise(item.name)} as ${item.checked ? 'unchecked' : 'checked'}" />
            <span class="grocery-item-name">${sanitise(item.name)}</span>
            <button class="remove-grocery" onclick="CookMind.removeGroceryItem(${item.id})" aria-label="Remove ${sanitise(item.name)}">✕</button>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  /**
   * Clear the entire grocery list.
   */
  function clearGroceryList() {
    state.grocery = [];
    saveToStorage(STORAGE_KEY_GROCERY, state.grocery);
    renderGrocery();
    showToast('Grocery list cleared.', 'info');
  }

  /**
   * Export the grocery list to clipboard as plain text.
   */
  async function exportGroceryToClipboard() {
    if (state.grocery.length === 0) {
      showToast('Your grocery list is empty.', 'error');
      return;
    }
    const text = state.grocery.map(g => `[${g.category}] ${g.name}${g.checked ? ' ✓' : ''}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast('Grocery list copied to clipboard! 📋', 'success');
    } catch {
      showToast('Could not copy. Please copy manually.', 'error');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // AI RECOMMENDATIONS (calls google-cloud.js)
  // ═══════════════════════════════════════════════════════════

  /**
   * Request AI recipe recommendations for current ingredients.
   * Delegates to the GeminiAPI module.
   */
  async function getAIRecommendations() {
    if (state.ingredients.length === 0) {
      showError('ingredientError', 'Add at least one ingredient to get AI suggestions.');
      return;
    }
    hideError('ingredientError');
    setSpinner(true);

    try {
      const result = await GeminiAPI.getRecipeRecommendations(state.ingredients);
      const panel = document.getElementById('aiPanel');
      document.getElementById('aiContent').textContent = result;
      panel.hidden = false;
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      showToast('AI recommendations ready! ✨', 'success');
    } catch (err) {
      showToast('AI suggestion failed. Showing demo response.', 'error');
      console.error(err);
    } finally {
      setSpinner(false);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // THEME TOGGLE
  // ═══════════════════════════════════════════════════════════

  /**
   * Toggle between light and dark themes.
   */
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.getElementById('themeToggle').textContent = next === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('cookmind_theme', next);
  }

  /**
   * Apply saved theme on page load.
   */
  function applySavedTheme() {
    const saved = localStorage.getItem('cookmind_theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      document.getElementById('themeToggle').textContent = saved === 'dark' ? '🌙' : '☀️';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════

  /**
   * Bind all event listeners to UI elements.
   */
  function bindEvents() {
    // Nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.section));
    });

    // Ingredient input — Enter key
    document.getElementById('ingredientInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') addIngredient();
    });
    document.getElementById('addIngredientBtn').addEventListener('click', addIngredient);
    document.getElementById('searchRecipesBtn').addEventListener('click', searchRecipes);
    document.getElementById('aiRecommendBtn').addEventListener('click', getAIRecommendations);
    document.getElementById('clearIngredientsBtn').addEventListener('click', clearIngredients);

    // Planner
    document.getElementById('addMealBtn').addEventListener('click', addMealToPlanner);
    document.getElementById('mealInput').addEventListener('keydown', e => { if (e.key === 'Enter') addMealToPlanner(); });
    document.getElementById('clearPlannerBtn').addEventListener('click', clearPlanner);
    document.getElementById('plannerToGroceryBtn').addEventListener('click', plannerToGrocery);

    // Grocery
    document.getElementById('addGroceryBtn').addEventListener('click', addGroceryItem);
    document.getElementById('groceryInput').addEventListener('keydown', e => { if (e.key === 'Enter') addGroceryItem(); });
    document.getElementById('clearGroceryBtn').addEventListener('click', clearGroceryList);
    document.getElementById('exportGroceryBtn').addEventListener('click', exportGroceryToClipboard);

    // Modal
    document.getElementById('modalClose').addEventListener('click', closeRecipeModal);
    document.getElementById('recipeModal').addEventListener('click', e => {
      if (e.target === document.getElementById('recipeModal')) closeRecipeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeRecipeModal();
    });

    // Theme
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  }

  /**
   * Initialise the application.
   */
  function init() {
    applySavedTheme();
    bindEvents();
    renderIngredientTags();
    renderPlanner();
    renderGrocery();
    renderFavorites();
  }

  document.addEventListener('DOMContentLoaded', init);

  // Expose public API for inline event handlers and test.js
  return {
    addIngredient,
    removeIngredient,
    clearIngredients,
    validateIngredient,
    searchRecipes,
    openRecipeModal,
    closeRecipeModal,
    toggleFavorite,
    addMealToPlanner,
    addToPlanner,
    removeMealFromPlanner,
    clearPlanner,
    plannerToGrocery,
    validatePlannerEntry,
    addGroceryItem,
    toggleGroceryItem,
    removeGroceryItem,
    clearGroceryList,
    exportGroceryToClipboard,
    validateGroceryItem,
    getAIRecommendations,
    navigateTo,
    scoreRecipe,
    sanitise,
    saveToStorage,
    loadFromStorage,
    clearStorage,
    toggleTheme,
    _state: state
  };
})();
