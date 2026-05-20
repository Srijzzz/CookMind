/**
 * CookMind – Complete Firebase + Firestore + Gemini AI
 * Modal is hidden until triggered, close button fully working
 */

import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase globals (already initialised in index.html)
const auth = window.auth;
const db = window.db;
const provider = window.provider;

// ---------- DOM Helpers ----------
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function sanitise(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ---------- State ----------
let currentUser = null;
let unsubscribeFirestore = null;
let state = {
  ingredients: [],
  favorites: [],
  planner: {},
  grocery: []
};

// Fallback mock recipes (used if JSON fails)
const MOCK_RECIPES = [
  { id: 'm1', emoji: '🍗', title: 'Lemon Garlic Chicken', time: '30 min', servings: 4, difficulty: 'Easy', tags: ['chicken','garlic','lemon'], ingredients: ['500g chicken','4 garlic cloves','1 lemon','2 tbsp oil'], steps: ['Marinate','Sear','Serve'] },
  { id: 'm2', emoji: '🍝', title: 'Tomato Basil Pasta', time: '20 min', servings: 2, difficulty: 'Easy', tags: ['pasta','tomato','basil'], ingredients: ['200g pasta','400g tomatoes','basil'], steps: ['Cook pasta','Make sauce','Combine'] }
];

// ---------- Firestore Sync ----------
async function saveUserData() {
  if (!currentUser) return;
  const userRef = doc(db, 'users', currentUser.uid);
  await setDoc(userRef, {
    ingredients: state.ingredients,
    favorites: state.favorites,
    planner: state.planner,
    grocery: state.grocery
  }, { merge: true });
}

function startFirestoreSync() {
  if (!currentUser) return;
  const userRef = doc(db, 'users', currentUser.uid);
  if (unsubscribeFirestore) unsubscribeFirestore();
  unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      state.ingredients = data.ingredients || [];
      state.favorites = data.favorites || [];
      state.planner = data.planner || {};
      state.grocery = data.grocery || [];
      refreshAllUI();
    } else {
      saveUserData();
    }
  });
}

function refreshAllUI() {
  renderIngredientTags();
  renderPlanner();
  renderGrocery();
  renderFavorites();
}

// ---------- Ingredients ----------
function validateIngredient(val) {
  if (!val || !val.trim()) return { valid: false, message: 'Enter an ingredient.' };
  if (val.length > 60) return { valid: false, message: 'Too long.' };
  if (/[<>"'`]/.test(val)) return { valid: false, message: 'Invalid characters.' };
  return { valid: true };
}

async function addIngredient() {
  const input = document.getElementById('ingredientInput');
  const val = input.value.trim().toLowerCase();
  const { valid, message } = validateIngredient(val);
  if (!valid) { showError('ingredientError', message); return; }
  if (state.ingredients.includes(val)) { showError('ingredientError', 'Already added'); return; }
  state.ingredients.push(val);
  await saveUserData();
  input.value = '';
  renderIngredientTags();
  hideError('ingredientError');
}

function removeIngredient(ing) {
  state.ingredients = state.ingredients.filter(i => i !== ing);
  saveUserData();
  renderIngredientTags();
}

function renderIngredientTags() {
  const container = document.getElementById('ingredientTags');
  container.innerHTML = state.ingredients.map(ing => `
    <span class="tag">${sanitise(ing)} <button onclick="CookMind.removeIngredient('${sanitise(ing)}')">✕</button></span>
  `).join('');
}

function showError(elId, msg) {
  const el = document.getElementById(elId);
  if (el) { el.textContent = msg; el.hidden = false; }
}
function hideError(elId) {
  const el = document.getElementById(elId);
  if (el) el.hidden = true;
}

// ---------- Recipe Search (Gemini or fallback) ----------
async function searchRecipes() {
  if (!state.ingredients.length) { showError('ingredientError', 'Add ingredients first'); return; }
  setInlineLoading(true);
  try {
    let recipes = await GeminiAPI.getRecipeRecommendationsFromAI(state.ingredients);
    if (!recipes.length) recipes = MOCK_RECIPES;
    renderRecipeCards(recipes, 'recipeResults');
    showToast(`Found ${recipes.length} recipes!`, 'success');
  } catch (err) {
    console.warn(err);
    renderRecipeCards(MOCK_RECIPES, 'recipeResults');
    showToast('Using demo recipes', 'info');
  } finally {
    setInlineLoading(false);
  }
}

function renderRecipeCards(recipes, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!recipes.length) { container.innerHTML = '<p class="empty-state">No recipes found.</p>'; return; }
  container.innerHTML = recipes.map(r => buildRecipeCard(r)).join('');
}

function buildRecipeCard(recipe) {
  const isFav = state.favorites.some(f => f.id === recipe.id);
  return `
    <div class="recipe-card">
      <div class="recipe-card-img">${recipe.emoji || '🍽️'}</div>
      <div class="recipe-card-body">
        <h3 class="recipe-card-title">${sanitise(recipe.title)}</h3>
        <div class="recipe-card-meta">
          <span>⏱ ${recipe.time}</span>
          <span>👥 ${recipe.servings}</span>
          <span>📊 ${recipe.difficulty}</span>
        </div>
      </div>
      <div class="recipe-card-footer">
        <button class="btn-fav" onclick="CookMind.toggleFavorite(${JSON.stringify(recipe).replace(/"/g, '&quot;')})">${isFav ? '❤️' : '🤍'}</button>
        <button class="btn-view" onclick="CookMind.openRecipeModal(${JSON.stringify(recipe).replace(/"/g, '&quot;')})">View Recipe →</button>
      </div>
    </div>
  `;
}

// ---------- Favorites ----------
async function toggleFavorite(recipe) {
  const exists = state.favorites.some(f => f.id === recipe.id);
  if (exists) {
    state.favorites = state.favorites.filter(f => f.id !== recipe.id);
    showToast('Removed from favourites', 'info');
  } else {
    state.favorites.push(recipe);
    showToast('Saved to favourites!', 'success');
  }
  await saveUserData();
  renderFavorites();
  // Refresh currently displayed recipe cards (optional)
  if (!document.getElementById('section-favorites').hidden) renderFavorites();
}

function renderFavorites() {
  const container = document.getElementById('favoritesList');
  const empty = document.getElementById('favEmpty');
  if (!container) return;
  if (!state.favorites.length) {
    container.innerHTML = '';
    if (empty) empty.hidden = false;
  } else {
    if (empty) empty.hidden = true;
    renderRecipeCards(state.favorites, 'favoritesList');
  }
}

// ---------- Planner ----------
async function addMealToPlanner() {
  const meal = document.getElementById('mealInput').value.trim();
  const day = document.getElementById('mealDay').value;
  const slot = document.getElementById('mealSlot').value;
  if (!meal || !day || !slot) { showError('mealError', 'Fill all fields'); return; }
  if (!state.planner[day]) state.planner[day] = {};
  if (!state.planner[day][slot]) state.planner[day][slot] = [];
  state.planner[day][slot].push(meal);
  await saveUserData();
  renderPlanner();
  document.getElementById('mealInput').value = '';
  showToast(`${meal} added to ${day} ${slot}`);
}

function renderPlanner() {
  const grid = document.getElementById('plannerGrid');
  if (!grid) return;
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const SLOTS = ['Breakfast','Lunch','Dinner'];
  grid.innerHTML = DAYS.map(day => {
    const dayData = state.planner[day] || {};
    const mealsHtml = SLOTS.map(slot => {
      const meals = dayData[slot] || [];
      return meals.map((meal, idx) => `
        <div class="meal-entry">
          <span><strong>${slot[0]}</strong> ${sanitise(meal)}</span>
          <button class="remove-meal" onclick="CookMind.removeMealFromPlanner('${day}','${slot}',${idx})">✕</button>
        </div>
      `).join('');
    }).join('');
    return `<div class="day-card"><div class="day-card-header">${day}</div><div class="day-card-body">${mealsHtml || '<em>Empty</em>'}</div></div>`;
  }).join('');
}

async function removeMealFromPlanner(day, slot, index) {
  if (state.planner[day]?.[slot]) {
    state.planner[day][slot].splice(index, 1);
    if (!state.planner[day][slot].length) delete state.planner[day][slot];
    if (!Object.keys(state.planner[day]).length) delete state.planner[day];
    await saveUserData();
    renderPlanner();
  }
}

async function plannerToGrocery() {
  const newItems = [];
  for (const day of Object.keys(state.planner)) {
    for (const slot of Object.keys(state.planner[day])) {
      for (const meal of state.planner[day][slot]) {
        const recipe = [...state.favorites, ...MOCK_RECIPES].find(r => r.title.toLowerCase() === meal.toLowerCase());
        if (recipe && recipe.ingredients) {
          for (const ing of recipe.ingredients) {
            const clean = ing.split(',')[0].trim();
            if (!state.grocery.some(g => g.name.toLowerCase() === clean.toLowerCase())) {
              newItems.push({ id: Date.now() + Math.random(), name: clean, category: 'Pantry', checked: false });
            }
          }
        } else {
          if (!state.grocery.some(g => g.name.toLowerCase() === meal.toLowerCase())) {
            newItems.push({ id: Date.now() + Math.random(), name: meal, category: 'Other', checked: false });
          }
        }
      }
    }
  }
  state.grocery.push(...newItems);
  await saveUserData();
  renderGrocery();
  showToast(`Added ${newItems.length} items to grocery list`);
  navigateTo('grocery');
}

// ---------- Grocery ----------
async function addGroceryItem() {
  const input = document.getElementById('groceryInput');
  const name = input.value.trim();
  const category = document.getElementById('groceryCategory').value;
  if (!name) { showError('groceryError', 'Enter an item'); return; }
  state.grocery.push({ id: Date.now(), name, category, checked: false });
  await saveUserData();
  input.value = '';
  renderGrocery();
  hideError('groceryError');
}

async function toggleGroceryItem(id) {
  const item = state.grocery.find(g => g.id === id);
  if (item) { item.checked = !item.checked; await saveUserData(); renderGrocery(); }
}

async function removeGroceryItem(id) {
  state.grocery = state.grocery.filter(g => g.id !== id);
  await saveUserData();
  renderGrocery();
}

function renderGrocery() {
  const container = document.getElementById('groceryList');
  if (!container) return;
  if (!state.grocery.length) { container.innerHTML = '<p class="empty-state">Grocery list empty.</p>'; return; }
  const grouped = {};
  state.grocery.forEach(g => { if (!grouped[g.category]) grouped[g.category] = []; grouped[g.category].push(g); });
  container.innerHTML = Object.entries(grouped).map(([cat, items]) => `
    <div class="grocery-category-group">
      <div class="grocery-category-title">${sanitise(cat)}</div>
      ${items.map(item => `
        <div class="grocery-item ${item.checked ? 'checked' : ''}">
          <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="CookMind.toggleGroceryItem(${item.id})" />
          <span class="grocery-item-name">${sanitise(item.name)}</span>
          <button class="remove-grocery" onclick="CookMind.removeGroceryItem(${item.id})">✕</button>
        </div>
      `).join('')}
    </div>
  `).join('');
}

async function clearGroceryList() { state.grocery = []; await saveUserData(); renderGrocery(); showToast('Grocery cleared'); }
async function exportGroceryToClipboard() {
  const text = state.grocery.map(g => `[${g.category}] ${g.name}${g.checked ? ' ✓' : ''}`).join('\n');
  try { await navigator.clipboard.writeText(text); showToast('Copied!', 'success'); } catch { showToast('Copy failed', 'error'); }
}

// ---------- Modal (fixed) ----------
function openRecipeModal(recipe) {
  const modal = document.getElementById('recipeModal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  const isFav = state.favorites.some(f => f.id === recipe.id);
  content.innerHTML = `
    <div style="text-align:center; font-size:3rem;">${recipe.emoji || '🍽️'}</div>
    <h2 class="modal-recipe-title">${sanitise(recipe.title)}</h2>
    <div class="modal-recipe-meta">
      <span>⏱ ${recipe.time}</span>
      <span>👥 Serves ${recipe.servings}</span>
      <span>📊 ${recipe.difficulty}</span>
    </div>
    <h3 class="modal-section-title">Ingredients</h3>
    <ul class="modal-ingredients">${recipe.ingredients.map(i => `<li>${sanitise(i)}</li>`).join('')}</ul>
    <h3 class="modal-section-title">Method</h3>
    <ol class="modal-steps">${recipe.steps.map(s => `<li>${sanitise(s)}</li>`).join('')}</ol>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="CookMind.toggleFavorite(${JSON.stringify(recipe).replace(/"/g, '&quot;')}); CookMind.closeRecipeModal();">
        ${isFav ? '💔 Remove' : '❤️ Save'}
      </button>
      <button class="btn btn-secondary" onclick="CookMind.addToPlanner('${sanitise(recipe.title)}'); CookMind.closeRecipeModal();">📅 Add to Planner</button>
    </div>
  `;
  modal.classList.add('active');
  modal.style.display = 'flex';
  document.getElementById('modalClose').focus();
}

function closeRecipeModal() {
  const modal = document.getElementById('recipeModal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

function addToPlanner(mealName) {
  closeRecipeModal();
  navigateTo('planner');
  document.getElementById('mealInput').value = mealName;
  document.getElementById('mealInput').focus();
  showToast('Choose day and slot, then click + Add Meal', 'info');
}

function bindModalEvents() {
  const modal = document.getElementById('recipeModal');
  const closeBtn = document.getElementById('modalClose');
  if (!modal || !closeBtn) return;
  closeBtn.addEventListener('click', closeRecipeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeRecipeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('active')) closeRecipeModal(); });
}

// ---------- Navigation & Auth ----------
function navigateTo(section) {
  document.querySelectorAll('.app-section').forEach(sec => sec.hidden = !sec.id.endsWith(section));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.section === section));
  if (section === 'favorites') renderFavorites();
  if (section === 'planner') renderPlanner();
  if (section === 'grocery') renderGrocery();
}

async function signInWithGoogle() { try { await signInWithPopup(auth, provider); } catch(e) { showToast(e.message, 'error'); } }
async function signOutUser() { await signOut(auth); }

function updateAuthUI(user) {
  const signInBtn = document.getElementById('signInBtn');
  const userInfo = document.getElementById('userInfo');
  if (user) {
    signInBtn.classList.add('hidden');
    userInfo.classList.remove('hidden');
    document.getElementById('userName').textContent = user.displayName || user.email;
    document.getElementById('userAvatar').src = user.photoURL || 'https://via.placeholder.com/32';
    currentUser = user;
    startFirestoreSync();
  } else {
    signInBtn.classList.remove('hidden');
    userInfo.classList.add('hidden');
    currentUser = null;
    if (unsubscribeFirestore) unsubscribeFirestore();
    state = { ingredients: [], favorites: [], planner: {}, grocery: [] };
    refreshAllUI();
  }
}

// ---------- Theme & Loading ----------
function setInlineLoading(show) {
  const btn = document.getElementById('searchRecipesBtn');
  if (show) { btn.disabled = true; btn.innerHTML = '<span class="loading-inline"></span> Searching...'; }
  else { btn.disabled = false; btn.innerHTML = '🔍 Find Recipes'; }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  document.getElementById('themeToggle').textContent = next === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('cookmind_theme', next);
}
function applySavedTheme() {
  const saved = localStorage.getItem('cookmind_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('themeToggle').textContent = saved === 'dark' ? '🌙' : '☀️';
}

// ---------- Initialisation ----------
function bindEvents() {
  document.getElementById('signInBtn').addEventListener('click', signInWithGoogle);
  document.getElementById('signOutBtn').addEventListener('click', signOutUser);
  document.getElementById('addIngredientBtn').addEventListener('click', addIngredient);
  document.getElementById('searchRecipesBtn').addEventListener('click', searchRecipes);
  document.getElementById('clearIngredientsBtn').addEventListener('click', async () => { state.ingredients = []; await saveUserData(); renderIngredientTags(); });
  document.getElementById('aiRecommendBtn').addEventListener('click', searchRecipes);
  document.getElementById('addMealBtn').addEventListener('click', addMealToPlanner);
  document.getElementById('clearPlannerBtn').addEventListener('click', async () => { state.planner = {}; await saveUserData(); renderPlanner(); });
  document.getElementById('plannerToGroceryBtn').addEventListener('click', plannerToGrocery);
  document.getElementById('addGroceryBtn').addEventListener('click', addGroceryItem);
  document.getElementById('clearGroceryBtn').addEventListener('click', clearGroceryList);
  document.getElementById('exportGroceryBtn').addEventListener('click', exportGroceryToClipboard);
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => navigateTo(btn.dataset.section)));
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  bindModalEvents();
}

onAuthStateChanged(auth, (user) => {
  updateAuthUI(user);
  bindEvents();
  applySavedTheme();
  if (!user) refreshAllUI();
});

// Expose public API for inline onclick
window.CookMind = {
  removeIngredient, toggleFavorite, openRecipeModal, closeRecipeModal, addToPlanner,
  removeMealFromPlanner, toggleGroceryItem, removeGroceryItem
};