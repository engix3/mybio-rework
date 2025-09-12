// discord-client.js
async function updateDiscordStatus() {
  try {
    const response = await fetch('/api/discord-status');
    const data = await response.json();

    document.getElementById('discord-activity').textContent = data.activity || 'в сети';
    
    // Меняем цвет точки
    const dot = document.querySelector('.status-dot');
    if (dot) {
      if (data.status === 'online') dot.style.backgroundColor = '#43b581';
      else if (data.status === 'idle') dot.style.backgroundColor = '#faa61a';
      else if (data.status === 'dnd') dot.style.backgroundColor = '#f04747';
      else dot.style.backgroundColor = '#747f8d';
    }
  } catch (err) {
    console.error('❌ Ошибка:', err);
    document.getElementById('discord-activity').textContent = 'ошибка';
  }
}

// Обновляем каждые 5 секунд
updateDiscordStatus();
setInterval(updateDiscordStatus, 5000);