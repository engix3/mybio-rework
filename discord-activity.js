// discord-activity.js
document.addEventListener('DOMContentLoaded', () => {
  const statusIndicator = document.getElementById('status-indicator');
  const activityIcon = document.getElementById('activity-icon');
  const activityText = document.getElementById('activity-text');

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
        activityIcon.style.backgroundImage = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 35 35\" fill=\"white\"><path d=\"M12.927,15.035H7.894a1.25,1.25,0,0,1,0-2.5h5.033a1.25,1.25,0,0,1,0,2.5Z\"/><path d=\"M10.41,17.551A1.25,1.25,0,0,1,9.16,16.3V11.268a1.25,1.25,0,0,1,2.5,0V16.3A1.249,1.249,0,0,1,10.41,17.551Z\"/><path d=\"M21.177,15.1a1.251,1.251,0,0,0,0-2.5,1.251,1.251,0,0,0,0,2.5Z\"/><path d=\"M24.2,12.07a1.251,1.251,0,0,0,0-2.5,1.251,1.251,0,0,0,0,2.5Z\"/><path d=\"M24.079,18a1.251,1.251,0,0,0,0-2.5,1.251,1.251,0,0,0,0,2.5Z\"/><path d=\"M27.106,14.972a1.251,1.251,0,0,0,0-2.5,1.251,1.251,0,0,0,0,2.5Z\"/><path d=\"M29.62,32.379a5.134,5.134,0,0,1-4.98-3.837L23.117,24.1a21.677,21.677,0,0,1-11.211-.067l-1.573,4.6a4.969,4.969,0,0,1-1.8,2.676A5.142,5.142,0,0,1,.25,27.289V15.907c0-.331.041-.929.057-1.15L.252,13.748A11.088,11.088,0,0,1,11.319,2.621a10.935,10.935,0,0,1,3.939.723,4.133,4.133,0,0,0,1.49.256h1.5a4.063,4.063,0,0,0,1.469-.247h0a10.986,10.986,0,0,1,4.166-.731A11.282,11.282,0,0,1,34.75,14.012V27.289A5.116,5.116,0,0,1,29.62,32.379ZM23.89,21.248a1.249,1.249,0,0,1,1.182.845l1.96,5.732a2.672,2.672,0,0,0,2.588,2.054,2.613,2.613,0,0,0,2.63-2.59V14.012a8.77,8.77,0,0,0-8.406-8.89,8.5,8.5,0,0,0-3.221.563,6.55,6.55,0,0,1-2.372.415h-1.5a6.611,6.611,0,0,1-2.387-.422,8.437,8.437,0,0,0-3.042-.557A8.574,8.574,0,0,0,2.75,13.679L2.808,14.7a1.985,1.985,0,0,1,0,.2c-.011.152-.053.705-.053,1V27.289A2.644,2.644,0,0,0,7,29.333a2.591,2.591,0,0,0,.938-1.416l1.987-5.824a1.251,1.251,0,0,1,1.591-.777c.065.021,6.578,2.217,11.9.025A1.265,1.265,0,0,1,23.89,21.248Z\"/></svg>')";
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
    }
  }

  // Обновляем каждые 5 секунд
  updateStatus();
  setInterval(updateStatus, 5000);
});