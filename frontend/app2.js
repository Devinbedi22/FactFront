const BASE_URL = 'https://factfront.onrender.com/api';

 
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


function toggleAuth() {
  document.getElementById('auth-overlay').style.display = 'block';
  document.getElementById('auth-section').style.display = 'block';
}

function closeAuth() {
  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('auth-section').style.display = 'none';
}

function toggleSearch() {
  showSection('search-section');
}

function showHistory() {
  showSection('history-section');
  getHistory();
}


let lastSearchQuery = '';
let clickedArticles = [];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginBtn').addEventListener('click', toggleAuth);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('close-auth').addEventListener('click', closeAuth);

  document.querySelector('#loginForm button').addEventListener('click', login);
  document.querySelector('#signupForm button').addEventListener('click', signup);

  document.getElementById('searchButton').addEventListener('click', searchNews);
  document.getElementById('searchQuery').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchNews();
  });

  document.getElementById('loginForm').addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });

  document.getElementById('signupForm').addEventListener('keydown', e => {
    if (e.key === 'Enter') signup();
  });

  document.getElementById('nextSlideBtn')?.addEventListener('click', nextSlide);
  document.getElementById('prevSlideBtn')?.addEventListener('click', prevSlide);

  updateAuthUI();
  fetchHeadlines();
});


async function updateAuthUI() {
  try {
    const res = await fetch(`${BASE_URL}/auth/status`, { credentials: 'include' });
    const data = await res.json();

    const isLoggedIn = res.ok && data.loggedIn;
    document.getElementById('loginBtn').style.display = isLoggedIn ? 'none' : 'inline-block';
    document.getElementById('logoutBtn').style.display = isLoggedIn ? 'inline-block' : 'none';
    document.getElementById('searchButton').disabled = !isLoggedIn;
  } catch (err) {
    console.error('Status check failed', err);
  }
}

async function login() {
  const username = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!username || !password) return showMessage('Enter both fields', 'error');

  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      updateAuthUI();
      closeAuth();
      showMessage('Logged in successfully!');
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
      credentials: 'include',
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

async function logout() {
  try {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });

    const data = await res.json();
    if (res.ok) {
      updateAuthUI();
      showMessage('Logged out!');
      document.getElementById('searchResults').innerHTML = '';
      document.getElementById('history-list').innerHTML = '';
    } else {
      showMessage(data.error || 'Logout failed', 'error');
    }
  } catch (err) {
    showMessage('Logout request failed.', 'error');
  }
}


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
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) return showMessage(data.error || 'Search failed', 'error');

    lastSearchQuery = query;
    clickedArticles = [];
    displayArticles(data.articles, 'searchResults');
  } catch (err) {
    showMessage('Search failed.', 'error');
  }
}

async function getHistory() {
  try {
    const res = await fetch(`${BASE_URL}/news/history`, {
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) return showMessage(data.error || 'Failed to fetch history', 'error');

    displayHistory(data);
  } catch (err) {
    showMessage('Failed to load history.', 'error');
  }
}

async function saveSearchWithArticles() {
  if (!lastSearchQuery || clickedArticles.length === 0) return;

  try {
    await fetch(`${BASE_URL}/news/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: lastSearchQuery,
        articles: clickedArticles
      })
    });

    lastSearchQuery = '';
    clickedArticles = [];
  } catch (err) {
    console.error('Failed to save search with articles:', err);
  }
}


function displayArticles(articles, elementId) {
  const container = document.getElementById(elementId);
  if (!container) return;

  if (!articles || articles.length === 0) {
    container.innerHTML = '<p>No articles found.</p>';
    return;
  }

  container.innerHTML = '';
  articles.forEach(article => {
    const articleDiv = document.createElement('div');
    articleDiv.className = 'article';

    const title = document.createElement('h4');
    title.textContent = article.title;

    const desc = document.createElement('p');
    desc.textContent = article.description || '';

    const link = document.createElement('a');
    link.href = article.url;
    link.target = '_blank';
    link.textContent = 'Read more';

    link.addEventListener('click', () => {
      if (!clickedArticles.some(a => a.url === article.url)) {
        clickedArticles.push({ title: article.title, url: article.url });
        saveSearchWithArticles();
      }
    });

    articleDiv.appendChild(title);
    articleDiv.appendChild(desc);
    articleDiv.appendChild(link);
    container.appendChild(articleDiv);
  });
}

function displayHistory(historyArray) {
  const container = document.getElementById('history-list');
  if (!container) return;

  if (!historyArray || historyArray.length === 0) {
    container.innerHTML = '<li>No history found.</li>';
    return;
  }

  container.innerHTML = historyArray
    .map(item => {
      const links = item.articles?.length
        ? '<ul>' + item.articles.map(a => `<li><a href="${a.url}" target="_blank">${a.title}</a></li>`).join('') + '</ul>'
        : '<small>No articles opened.</small>';

      return `
        <li class="history-card">
          <div>
            <strong>${item.query}</strong><br />
            <small>${new Date(item.date).toLocaleString()}</small><br/>
            ${links}
          </div>
        </li>`;
    })
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


function showSection(sectionId) {
  const sections = document.querySelectorAll('main > section');
  sections.forEach(sec => sec.style.display = 'none');

  const target = document.getElementById(sectionId);
  if (target) target.style.display = 'block';
}
