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
        activityIcon.style.backgroundImage = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"white\"><path d=\"M19.98 8.72C19.877 7.225 18.567 6 17 6H7a2.977 2.977 0 0 0-2.991 2.867.98.98 0 0 1-.018.155L4 16.5c0 .397.159.784.437 1.062.279.279.666.438 1.063.438.5 0 1.038-.638 1.661-1.377.336-.397.717-.849 1.149-1.261.577-.55 1.821-1.099 2.459-1.249.418-.098.951-.113 1.231-.113s.813.015 1.229.112c.64.151 1.884.7 2.461 1.249.433.413.813.864 1.149 1.262C17.462 17.362 18 18 18.5 18a1.51 1.51 0 0 0 1.062-.437c.279-.279.438-.666.438-1.063V9c-.013-.063-.01-.096-.01-.16a.427.427 0 0 1-.01-.12zM8 12a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 12zm8-5a1 1 0 1 1 0 2 1 1 0 1 1 0-2zm-2 4a1 1 0 1 1 0-2 1 1 0 1 1 0 2zm2 2a1 1 0 1 1 0-2 1 1 0 1 1 0 2zm2-2a1 1 0 1 1 0-2 1 1 0 1 1 0 2z\"/><path d=\"M21.979 8.652A5.005 5.005 0 0 0 17 4H7a4.97 4.97 0 0 0-4.987 4.737c-.01.079-.013.161-.013.253v7.51c0 .925.373 1.828 1.022 2.476A3.524 3.524 0 0 0 5.5 20c1.429 0 2.324-1.061 3.189-2.087.318-.377.646-.767 1-1.103.237-.226 1.102-.647 1.539-.751.252-.059 1.293-.058 1.541-.001.439.104 1.304.526 1.541.751.354.337.682.727 1 1.104C16.176 18.939 17.071 20 18.5 20c.925 0 1.828-.373 2.476-1.022A3.524 3.524 0 0 0 22 16.5V9c0-.095-.004-.18-.014-.26l-.007-.088zM20 16.5c0 .397-.159.784-.438 1.063A1.51 1.51 0 0 1 18.5 18c-.5 0-1.038-.638-1.661-1.377-.336-.397-.717-.849-1.149-1.262-.577-.549-1.821-1.098-2.461-1.249C12.813 14.015 12.28 14 12 14s-.813.015-1.23.113c-.638.15-1.882.699-2.459 1.249-.433.412-.813.863-1.149 1.261C6.538 17.362 6 18 5.5 18c-.397 0-.784-.159-1.063-.438A1.51 1.51 0 0 1 4 16.5l-.009-7.478c.01-.051.016-.103.018-.155A2.977 2.977 0 0 1 7 6h10c1.567 0 2.877 1.225 2.98 2.72 0 .06.005.12.01.12 0 .064-.003.097.01.16v7.5z\"/></svg>')";
      } else if (activityType === 'music') {
        activityIcon.style.backgroundImage = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"white\"><path d=\"M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z\"/></svg>')";
      } else if (activityType === 'stream') {
        activityIcon.style.backgroundImage = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"white\"><path d=\"M4 6h16v12H4V6m16-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z\"/><path d=\"M6 8h2v8H6V8m4 0h2v8h-2V8m4 0h2v8h-2V8z\"/></svg>')";
      } else {
        activityIcon.style.backgroundImage = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\" fill=\"white\"><path d=\"M7.493 0.015 C 7.442 0.021,7.268 0.039,7.107 0.055 C 5.234 0.242,3.347 1.208,2.071 2.634 C 0.660 4.211,-0.057 6.168,0.009 8.253 C 0.124 11.854,2.599 14.903,6.110 15.771 C 8.169 16.280,10.433 15.917,12.227 14.791 C 14.017 13.666,15.270 11.933,15.771 9.887 C 15.943 9.186,15.983 8.829,15.983 8.000 C 15.983 7.171,15.943 6.814,15.771 6.113 C 14.979 2.878,12.315 0.498,9.000 0.064 C 8.716 0.027,7.683 -0.006,7.493 0.015 M8.853 1.563 C 9.548 1.653,10.198 1.848,10.840 2.160 C 11.538 2.500,12.020 2.846,12.587 3.413 C 13.154 3.980,13.500 4.462,13.840 5.160 C 14.285 6.075,14.486 6.958,14.486 8.000 C 14.486 9.054,14.284 9.932,13.826 10.867 C 13.654 11.218,13.307 11.781,13.145 11.972 L 13.090 12.037 8.527 7.473 L 3.963 2.910 4.028 2.855 C 4.219 2.693,4.782 2.346,5.133 2.174 C 6.305 1.600,7.555 1.395,8.853 1.563 M7.480 8.534 L 12.040 13.095 11.973 13.148 C 11.734 13.338,11.207 13.662,10.867 13.828 C 10.239 14.135,9.591 14.336,8.880 14.444 C 8.456 14.509,7.544 14.509,7.120 14.444 C 5.172 14.148,3.528 13.085,2.493 11.451 C 2.279 11.114,1.999 10.526,1.859 10.119 C 1.468 8.989,1.403 7.738,1.670 6.535 C 1.849 5.734,2.268 4.820,2.766 4.147 C 2.836 4.052,2.899 3.974,2.907 3.974 C 2.914 3.974,4.972 6.026,7.480 8.534\"/></svg>')";
      }

      // Обновляем текст
      activityText.textContent = activityTextContent;
      activityText.title = activityTextContent;

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