// discord-activity.js
document.addEventListener('DOMContentLoaded', () => {
  const statusIndicator = document.getElementById('status-indicator');
  const activityIcon = document.getElementById('activity-icon');
  const activityText = document.getElementById('activity-text');
  const verifiedBadge = document.querySelector('.verified-badge'); // Галочка

  async function updateStatus() {
    try {
      const response = await fetch('/api/discord-status');
      const data = await response.json();

      // Обновляем статус-точку
      if (data.status === 'online') statusIndicator.style.backgroundColor = '#43b581';
      else if (data.status === 'idle') statusIndicator.style.backgroundColor = '#faa61a';
      else if (data.status === 'dnd') statusIndicator.style.backgroundColor = '#f04747';
      else statusIndicator.style.backgroundColor = '#747f8d';

      // Определяем текст активности
      let activityTextContent = 'нет активности в Discord';
      let activityType = 'custom';

      if (data.activity && data.activity.name) {
        activityType = data.activity.type;
        activityTextContent = data.activity.name; // Берём полное название — "играет в Roblox"
      }

      // Обновляем иконку
      if (activityType === 'game') {
        activityIcon.style.backgroundImage = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"white\"><path d=\"M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm14 0H6v12h12V6z\"/><path d=\"M8 8h8v2H8V8zm0 4h5v2H8v-2z\"/></svg>')";
      } else if (activityType === 'music') {
        activityIcon.style.backgroundImage = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"white\"><path d=\"M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z\"/></svg>')";
      } else if (activityType === 'stream') {
        activityIcon.style.backgroundImage = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"white\"><path d=\"M4 6h16v12H4V6m16-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z\"/><path d=\"M6 8h2v8H6V8m4 0h2v8h-2V8m4 0h2v8h-2V8z\"/></svg>')";
      } else {
        activityIcon.style.backgroundImage = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"white\"><path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z\"/></svg>')";
      }

      // Обновляем текст
      activityText.textContent = activityTextContent;
      activityText.title = activityTextContent;

      // Показываем/скрываем галочку
      if (activityTextContent === 'нет активности в Discord') {
        verifiedBadge.style.display = 'none';
      } else {
        verifiedBadge.style.display = 'inline-flex';
      }

    } catch (err) {
      console.error('❌ Ошибка загрузки статуса:', err);
      activityText.textContent = 'ошибка подключения';
      verifiedBadge.style.display = 'none'; // Скрываем галочку при ошибке
    }
  }

  // Обновляем каждые 5 секунд
  updateStatus();
  setInterval(updateStatus, 5000);
});