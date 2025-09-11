// script.js
const toggle = document.getElementById('theme-toggle');

// Проверяем предпочтения системы
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

// Или сохранённую тему
const savedTheme = localStorage.getItem('theme');
const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

document.documentElement.setAttribute('data-theme', initialTheme);
toggle.textContent = initialTheme === 'dark' ? '☀️' : '🌙';

toggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);

  toggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
});
