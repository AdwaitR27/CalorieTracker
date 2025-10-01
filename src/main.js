import './CalorieTrackerStyles.css';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Get today's date at midnight
function getTodayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split('T')[0];
}

// State
let currentWeekOffset = 0;
let allFoodData = JSON.parse(localStorage.getItem('allFoodData')) || {};
let apiKey = localStorage.getItem('groqApiKey') || '';

const today = getTodayDate();
if (!allFoodData[today]) {
  allFoodData[today] = [];
}

// Helper to always use the correct date (handles crossing midnight without reload)
function getTodayKey() {
  return getTodayDate();
}

function ensureDateArray(dateKey) {
  if (!allFoodData[dateKey]) {
    allFoodData[dateKey] = [];
  }
  return allFoodData[dateKey];
}

const apiSetup = document.getElementById('api-setup');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key');
const apiStatus = document.getElementById('api-status');

const aiChatForm = document.getElementById('ai-chat-form');
const foodDescription = document.getElementById('food-description');
const chatContainer = document.getElementById('chat-container');
const sendBtn = document.getElementById('send-btn');
const sendText = document.getElementById('send-text');
const loadingSpinner = document.getElementById('loading-spinner');

const foodForm = document.getElementById('food-form');
const foodList = document.getElementById('food-list');
const totalCaloriesEl = document.getElementById('total-calories');
const totalProteinEl = document.getElementById('total-protein');
const totalCarbsEl = document.getElementById('total-carbs');
const clearTodayBtn = document.getElementById('clear-today');
const weekDaysEl = document.getElementById('week-days');
const weekRangeEl = document.getElementById('week-range');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');

// Auth/UI wiring
const appContainer = document.getElementById('app-container');
const authContainer = document.getElementById('auth-container');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const googleSignInBtn = document.getElementById('google-signin-btn');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');
const userEmailEl = document.getElementById('user-email');

let currentUser = null;

function initAppUIAfterDataLoad() {
  const todayKey = getTodayKey();
  ensureDateArray(todayKey);
  renderWeekView();
  renderFoodList();
  updateDailySummary();

  if (apiKey) {
    apiSetup.style.display = 'none';
    apiKeyInput.value = '••••••••';
  } else {
    apiSetup.style.display = 'block';
    apiKeyInput.value = '';
  }
}

async function loadUserData() {
  if (!currentUser) return;
  try {
    const ref = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      allFoodData = data.allFoodData || {};
      apiKey = data.groqApiKey || '';
      // cache per user
      localStorage.setItem(`allFoodData_${currentUser.uid}`, JSON.stringify(allFoodData));
      if (apiKey) localStorage.setItem(`groqApiKey_${currentUser.uid}`, apiKey);
    } else {
      // migrate from legacy localStorage if available
      const legacyData = JSON.parse(localStorage.getItem('allFoodData') || '{}');
      const legacyKey = localStorage.getItem('groqApiKey') || '';
      allFoodData = legacyData;
      apiKey = legacyKey;
      await setDoc(ref, { allFoodData, groqApiKey: apiKey });
    }
  } catch (e) {
    console.error('Error loading user data', e);
    // fallback to cached per-user storage
    allFoodData = JSON.parse(localStorage.getItem(`allFoodData_${currentUser.uid}`) || '{}');
    apiKey = localStorage.getItem(`groqApiKey_${currentUser.uid}`) || '';
  }
}

// Auth handlers
if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.textContent = '';
    try {
      await signInWithEmailAndPassword(auth, authEmail.value, authPassword.value);
    } catch (err) {
      authError.textContent = err.message;
    }
  });
}

if (signupBtn) {
  signupBtn.addEventListener('click', async () => {
    authError.textContent = '';
    try {
      await createUserWithEmailAndPassword(auth, authEmail.value, authPassword.value);
    } catch (err) {
      authError.textContent = err.message;
    }
  });
}

if (googleSignInBtn) {
  googleSignInBtn.addEventListener('click', async () => {
    authError.textContent = '';
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      authError.textContent = err.message;
      console.error('Google sign-in failed', err);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    userEmailEl.textContent = user.email || '';
    logoutBtn.style.display = 'inline-block';
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';
    await loadUserData();
    initAppUIAfterDataLoad();
  } else {
    currentUser = null;
    userEmailEl.textContent = '';
    logoutBtn.style.display = 'none';
    appContainer.style.display = 'none';
    authContainer.style.display = 'block';
  }
});

saveApiKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (key && key !== '••••••••') {
    apiKey = key;
    // legacy cache
    localStorage.setItem('groqApiKey', apiKey);
    // user-scoped cache
    if (currentUser) {
      localStorage.setItem(`groqApiKey_${currentUser.uid}`, apiKey);
      try {
        await setDoc(doc(db, 'users', currentUser.uid), { groqApiKey: apiKey }, { merge: true });
      } catch (e) {
        console.error('Failed to save API key to cloud', e);
      }
    }
    apiStatus.textContent = '✅ API Key saved successfully!';
    apiStatus.style.color = 'green';
    setTimeout(() => {
      apiSetup.style.display = 'none';
    }, 1500);
  } else {
    apiStatus.textContent = '❌ Please enter a valid API key';
    apiStatus.style.color = 'red';
  }
});

window.toggleManualEntry = function() {
  const content = document.getElementById('manual-entry-content');
  const icon = document.getElementById('toggle-icon');
  if (content.style.display === 'none') {
    content.style.display = 'grid';
    icon.textContent = '▲';
  } else {
    content.style.display = 'none';
    icon.textContent = '▼';
  }
};

// Week navigation
prevWeekBtn.addEventListener('click', () => {
  currentWeekOffset -= 7;
  renderWeekView();
});

nextWeekBtn.addEventListener('click', () => {
  currentWeekOffset += 7;
  renderWeekView();
});

// Render week view
function renderWeekView() {
  const weekDays = [];
  const todayDate = new Date();
  todayDate.setDate(todayDate.getDate() + currentWeekOffset);
  
  // Get start of week (Monday)
  const dayOfWeek = todayDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() + diff);
  
  // Generate 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateString = date.toISOString().split('T')[0];
    const dayData = allFoodData[dateString] || [];
    
    const totals = dayData.reduce((acc, entry) => {
      acc.calories += entry.calories;
      acc.protein += entry.protein;
      acc.carbs += entry.carbs;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0 });
    
    const isToday = dateString === getTodayDate();
    
    weekDays.push({
      date: dateString,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      totals,
      isToday
    });
  }
  
  // Update week range display
  const startDate = weekDays[0];
  const endDate = weekDays[6];
  weekRangeEl.textContent = `${startDate.dayNum} - ${endDate.dayNum} ${new Date(endDate.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  
  // Render day cards
  weekDaysEl.innerHTML = weekDays.map(day => `
    <div class="day-card ${day.isToday ? 'today' : ''}">
      <div class="day-name">${day.dayName}</div>
      <div class="day-num">${day.dayNum}</div>
      <div class="day-calories">${Math.round(day.totals.calories)} cal</div>
      <div class="day-macros">
        <span>P: ${day.totals.protein.toFixed(0)}g</span>
        <span>C: ${day.totals.carbs.toFixed(0)}g</span>
      </div>
    </div>
  `).join('');
}

aiChatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!apiKey) {
    addChatMessage('⚠️ Please set up your API key first!', 'ai');
    apiSetup.style.display = 'block';
    return;
  }
  
  const description = foodDescription.value.trim();
  if (!description) return;
  
  addChatMessage(description, 'user');
  foodDescription.value = '';
  
  setLoading(true);
  
  try {
    const result = await parseFoodWithAI(description);
    
    addChatMessage(
      `I found: ${result.name}\n🔥 ${result.calories} calories\n💪 ${result.protein}g protein\n🌾 ${result.carbs}g carbs\n\nAdded to your tracker!`,
      'ai'
    );
    
    const todayKey = getTodayKey();
    const newEntry = {
      id: Date.now(),
      name: result.name,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      date: todayKey
    };
    
    ensureDateArray(todayKey).push(newEntry);
    saveData();
    renderFoodList();
    updateDailySummary();
    renderWeekView();
    
  } catch (error) {
    console.error('AI Error:', error);
    addChatMessage('❌ Sorry, there was an error processing your request. Please check your API key and try again.', 'ai');
  } finally {
    setLoading(false);
  }
});

async function parseFoodWithAI(description) {
  const prompt = `You are a nutrition expert. Analyze this food description and provide ONLY a JSON response with nutritional information. Be accurate and consider typical serving sizes.

Food description: "${description}"

Respond with ONLY this JSON format (no other text):
{
  "name": "food name",
  "calories": number,
  "protein": number,
  "carbs": number
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition calculator. Always respond with valid JSON only, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }
    
    const nutritionData = JSON.parse(jsonMatch[0]);
    
    return {
      name: nutritionData.name || description,
      calories: Math.round(nutritionData.calories || 0),
      protein: Math.round((nutritionData.protein || 0) * 10) / 10,
      carbs: Math.round((nutritionData.carbs || 0) * 10) / 10
    };
    
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw error;
  }
}

function addChatMessage(text, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}-message`;
  messageDiv.innerHTML = `
    <div class="message-bubble">
      ${text.replace(/\n/g, '<br>')}
    </div>
  `;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function setLoading(isLoading) {
  sendBtn.disabled = isLoading;
  foodDescription.disabled = isLoading;
  if (isLoading) {
    sendText.style.display = 'none';
    loadingSpinner.style.display = 'inline';
  } else {
    sendText.style.display = 'inline';
    loadingSpinner.style.display = 'none';
  }
}

foodForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const foodName = document.getElementById('food-name').value;
  const calories = parseFloat(document.getElementById('calories').value);
  const protein = parseFloat(document.getElementById('protein').value);
  const carbs = parseFloat(document.getElementById('carbs').value);

  const todayKey = getTodayKey();
  const newEntry = {
    id: Date.now(),
    name: foodName,
    calories,
    protein,
    carbs,
    date: todayKey
  };

  ensureDateArray(todayKey).push(newEntry);
  saveData();
  renderFoodList();
  updateDailySummary();
  renderWeekView();
  foodForm.reset();
});

window.removeFood = function(id) {
  const todayKey = getTodayKey();
  const entries = ensureDateArray(todayKey);
  allFoodData[todayKey] = entries.filter(entry => entry.id !== id);
  saveData();
  renderFoodList();
  updateDailySummary();
  renderWeekView();
};

clearTodayBtn.addEventListener('click', () => {
  if (confirm('Clear all entries for today?')) {
    const todayKey = getTodayKey();
    allFoodData[todayKey] = [];
    saveData();
    renderFoodList();
    updateDailySummary();
    renderWeekView();
  }
});

function renderFoodList() {
  const todayKey = getTodayKey();
  const todayEntries = allFoodData[todayKey] || [];
  
  if (todayEntries.length === 0) {
    foodList.innerHTML = '<p class="empty-message">No food entries yet. Try the AI assistant above!</p>';
    return;
  }

  foodList.innerHTML = todayEntries.map(entry => `
    <div class="food-item">
      <div class="food-info">
        <h3>${entry.name}</h3>
        <div class="food-details">
          <span>🔥 ${entry.calories} cal</span>
          <span>💪 ${entry.protein}g protein</span>
          <span>🌾 ${entry.carbs}g carbs</span>
        </div>
      </div>
      <button class="delete-btn" onclick="removeFood(${entry.id})">×</button>
    </div>
  `).join('');
}

function updateDailySummary() {
  const todayKey = getTodayKey();
  const todayEntries = allFoodData[todayKey] || [];
  
  const totals = todayEntries.reduce((acc, entry) => {
    acc.calories += entry.calories;
    acc.protein += entry.protein;
    acc.carbs += entry.carbs;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0 });

  totalCaloriesEl.textContent = Math.round(totals.calories);
  totalProteinEl.textContent = totals.protein.toFixed(1);
  totalCarbsEl.textContent = totals.carbs.toFixed(1);
}

async function saveData() {
  // legacy cache for backward compatibility
  localStorage.setItem('allFoodData', JSON.stringify(allFoodData));
  // user-scoped cache and cloud sync
  if (currentUser) {
    localStorage.setItem(`allFoodData_${currentUser.uid}`, JSON.stringify(allFoodData));
    try {
      await setDoc(doc(db, 'users', currentUser.uid), { allFoodData }, { merge: true });
    } catch (e) {
      console.error('Failed to save data to cloud', e);
    }
  }
}