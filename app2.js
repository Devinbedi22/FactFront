const BASE_URL = 'http://localhost:5000/api';
let token = localStorage.getItem('token');

// ============ MESSAGE BAR SETUP ============
const messageBar = document.createElement('div');
messageBar.id = 'message-bar';
messageBar.style.cssText = `
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #000;
  color: #fff;
  padding: 10px 20px;
  border-radius: 5px;
  display: none;
  z-index: 1000;
  transition: opacity 0.5s ease;
`;
document.body.appendChild(messageBar);

function showMessage(message, type = 'success') {
  messageBar.textContent = message;
  messageBar.style.backgroundColor = type === 'error' ? '#e74c3c' : '#000';
  messageBar.style.display = 'block';
  messageBar.style.opacity = 1;
  setTimeout(() => {
    messageBar.style.opacity = 0;
    setTimeout(() => {
      messageBar.style.display = 'none';
    }, 500);
  }, 3000);
}

// ============ UI TOGGLE FUNCTIONS ============
function toggleAuth() {
  document.getElementById('auth-overlay').style.display = 'block';
  document.getElementById('auth-section').style.display = 'block';
}

function closeAuth() {
  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('auth-section').style.display = 'none';
}

function toggleSearch() {
  const section = document.getElementById('search-section');
  section.style.display = section.style.display === 'block' ? 'none' : 'block';
}

// ============ INITIALIZE EVENTS ============
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginBtn').addEventListener('click', toggleAuth);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.querySelector('#loginForm button').addEventListener('click', login);
  document.querySelector('#signupForm button').addEventListener('click', signup);
  document.querySelector('#search-section button').addEventListener('click', searchNews);

  updateAuthUI();
  fetchHeadlines();
});

function updateAuthUI() {
  if (token) {
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'inline-block';
    document.getElementById('searchButton').disabled = false;
  } else {
    document.getElementById('loginBtn').style.display = 'inline-block';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('searchButton').disabled = true;
  }
}

// ============ AUTH FUNCTIONS ============
async function login() {
  const username = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!username || !password) return showMessage('Enter both fields', 'error');

  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
      token = data.token;
      localStorage.setItem('token', token);
      updateAuthUI();
      closeAuth();
      showMessage('Logged in successfully!');
      getHistory(); // Load history after login
    } else {
      showMessage(data.error || 'Login failed', 'error');
    }
  } catch (err) {
    showMessage('Login request failed.', 'error');
  }
}

async function signup() {
  const username = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value.trim();

  if (!username || !password) return showMessage('Enter both fields', 'error');

  try {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
      showMessage('Signup successful. Please log in.');
    } else {
      showMessage(data.error || 'Signup failed', 'error');
    }
  } catch (err) {
    showMessage('Signup request failed.', 'error');
  }
}

function logout() {
  localStorage.removeItem('token');
  token = null;
  updateAuthUI();
  showMessage('Logged out!');
}

// ============ NEWS FUNCTIONS ============
async function fetchHeadlines() {
  try {
    const res = await fetch(`${BASE_URL}/news/headlines`);
    const data = await res.json();
    displayCarousel(data.articles);
  } catch (err) {
    showMessage('Failed to load headlines.', 'error');
  }
}

async function searchNews() {
  const query = document.getElementById('searchQuery').value.trim();
  if (!query) return showMessage('Enter a keyword', 'error');

  try {
    const res = await fetch(`${BASE_URL}/news/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) return showMessage(data.error || 'Search failed', 'error');

    displayArticles(data.articles, 'searchResults');
  } catch (err) {
    showMessage('Search failed. Make sure you are logged in.', 'error');
  }
}

async function getHistory() {
  if (!token) return showMessage('Login to view search history.', 'error');

  try {
    const res = await fetch(`${BASE_URL}/news/history`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) return showMessage(data.error || 'History fetch failed', 'error');

    displayArticles(
      data.map(h => ({
        title: `🔍 ${h.query}`,
        description: new Date(h.date).toLocaleString(),
        url: '#'
      })),
      'searchResults'
    );
  } catch (err) {
    showMessage('Failed to load history.', 'error');
  }
}

// ============ DISPLAY FUNCTIONS ============
function displayArticles(articles, elementId) {
  const container = document.getElementById(elementId);
  if (!container) return;

  if (!articles || articles.length === 0) {
    container.innerHTML = '<p>No articles found.</p>';
    return;
  }

  container.innerHTML = articles
    .map(
      article => `
        <div class="article">
          <h4>${article.title}</h4>
          <p>${article.description || ''}</p>
          <a href="${article.url}" target="_blank">Read more</a>
        </div>
      `
    )
    .join('');
}

function displayCarousel(articles) {
  const container = document.getElementById('headlines-carousel');
  if (!container) return;

  if (!articles || articles.length === 0) {
    container.innerHTML = '<p>No headlines available.</p>';
    return;
  }

  container.innerHTML = articles
    .map(
      (article, index) => `
        <div class="carousel-card" style="display: ${index === 0 ? 'block' : 'none'}">
          <h3>${article.title}</h3>
          <p>${article.description || ''}</p>
          <a href="${article.url}" target="_blank">Read more</a>
        </div>
      `
    )
    .join('');

  currentSlide = 0;
  totalSlides = articles.length;
  showSlide(currentSlide);
}

// ============ CAROUSEL NAVIGATION ============
let currentSlide = 0;
let totalSlides = 0;

function showSlide(index) {
  const cards = document.querySelectorAll('.carousel-card');
  if (cards.length === 0) return;
  cards.forEach((card, i) => {
    card.style.display = i === index ? 'block' : 'none';
  });
}

function nextSlide() {
  const cards = document.querySelectorAll('.carousel-card');
  if (cards.length === 0) return;
  currentSlide = (currentSlide + 1) % cards.length;
  showSlide(currentSlide);
}

function prevSlide() {
  const cards = document.querySelectorAll('.carousel-card');
  if (cards.length === 0) return;
  currentSlide = (currentSlide - 1 + cards.length) % cards.length;
  showSlide(currentSlide);
}
