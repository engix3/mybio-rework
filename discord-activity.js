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
        activityIcon.style.backgroundImage = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"white\"><path d=\"M383.5,474 C382.672,474 382,474.672 382,475.5 C382,476.328 382.672,477 383.5,477 C384.328,477 385,476.328 385,475.5 C385,474.672 384.328,474 383.5,474 L383.5,474 Z M386.5,478 C385.672,478 385,478.672 385,479.5 C385,480.328 385.672,481 386.5,481 C387.328,481 388,480.328 388,479.5 C388,478.672 387.328,478 386.5,478 L386.5,478 Z M390,482 C390,484.209 388.209,486 386,486 L366,486 C363.791,486 362,484.209 362,482 L362,476 C362,473.791 363.791,472 366,472 L386,472 C388.209,472 390,473.791 390,476 L390,482 L390,482 Z M386,470 L366,470 C362.687,470 360,472.687 360,476 L360,482 C360,485.313 362.687,488 366,488 L386,488 C389.313,488 392,485.313 392,482 L392,476 C392,472.687 389.313,470 386,470 L386,470 Z M382.5,481 C381.672,481 381,481.672 381,482.5 C381,483.328 381.672,484 382.5,484 C383.328,484 384,483.328 384,482.5 C384,481.672 383.328,481 382.5,481 L382.5,481 Z M373,478 L370,478 L370,475 C370,474.448 369.553,474 369,474 C368.447,474 368,474.448 368,475 L368,478 L365,478 C364.447,478 364,478.448 364,479 C364,479.553 364.447,480 365,480 L368,480 L368,483 C368,483.553 368.447,484 369,484 C369.553,484 370,483.553 370,483 L370,480 L373,480 C373.553,480 374,479.553 374,479 C374,478.448 373.553,478 373,478 L373,478 Z M379.5,477 C378.672,477 378,477.672 378,478.5 C378,479.328 378.672,480 379.5,480 C380.328,480 381,479.328 381,478.5 C381,477.672 380.328,477 379.5,477 L379.5,477 Z\"/></svg>')";
      } else if (activityType === 'music') {
        activityIcon.style.backgroundImage = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"white\"><path d=\"M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z\"/></svg>')";
      } else if (activityType === 'stream') {
        activityIcon.style.backgroundImage = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"white\"><path d=\"M4 6h16v12H4V6m16-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z\"/><path d=\"M6 8h2v8H6V8m4 0h2v8h-2V8m4 0h2v8h-2V8z\"/></svg>')";
      } else {
        activityIcon.style.backgroundImage = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"white\"><path d=\"M7.493 0.015 C 7.442 0.021,7.268 0.039,7.107 0.055 C 5.234 0.242,3.347 1.208,2.071 2.634 C 0.660 4.211,-0.057 6.168,0.009 8.253 C 0.124 11.854,2.599 14.903,6.110 15.771 C 8.169 16.280,10.433 15.917,12.227 14.791 C 14.017 13.666,15.270 11.933,15.771 9.887 C 15.943 9.186,15.983 8.829,15.983 8.000 C 15.983 7.171,15.943 6.814,15.771 6.113 C 14.979 2.878,12.315 0.498,9.000 0.064 C 8.716 0.027,7.683 -0.006,7.493 0.015 M8.853 1.563 C 9.548 1.653,10.198 1.848,10.840 2.160 C 11.538 2.500,12.020 2.846,12.587 3.413 C 13.154 3.980,13.500 4.462,13.840 5.160 C 14.285 6.075,14.486 6.958,14.486 8.000 C 14.486 9.054,14.284 9.932,13.826 10.867 C 13.654 11.218,13.307 11.781,13.145 11.972 L 13.090 12.037 8.527 7.473 L 3.963 2.910 4.028 2.855 C 4.219 2.693,4.782 2.346,5.133 2.174 C 6.305 1.600,7.555 1.395,8.853 1.563 M7.480 8.534 L 12.040 13.095 11.973 13.148 C 11.734 13.338,11.207 13.662,10.867 13.828 C 10.239 14.135,9.591 14.336,8.880 14.444 C 8.456 14.509,7.544 14.509,7.120 14.444 C 5.172 14.148,3.528 13.085,2.493 11.451 C 2.279 11.114,1.999 10.526,1.859 10.119 C 1.468 8.989,1.403 7.738,1.670 6.535 C 1.849 5.734,2.268 4.820,2.766 4.147 C 2.836 4.052,2.899 3.974,2.907 3.974 C 2.914 3.974,4.972 6.026,7.480 8.534\"/></svg>')";
      }

      // Обновляем текст
      activityText.textContent = activityTextContent;
      activityText.title = activityTextContent;

    } catch (err) {
      console.error('❌ Ошибка загрузки статуса:', err);
      activityText.textContent = 'ошибка подключения';
    }
  }

  // Обновляем каждые 5 секунд
  updateStatus();
  setInterval(updateStatus, 5000);
});