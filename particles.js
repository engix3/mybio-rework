// particles.js
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');

  // Настройки
  const particleCount = 40;
  const particleColor = '#ffffff';
  const particleSize = 3;
  const speed = 2;
  const mouseRadius = 100;

  let particles = [];
  let mouseX = 0, mouseY = 0;

  // Адаптируем размер canvas
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  }

  // Функция для рисования звезды
  function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  // Создаём частицы
  function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: particleSize,
      });
    }
  }

  // Отслеживаем мышь
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Анимация
  function animate() {
	  
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      // Двигаем частицу
      p.x += p.vx;
      p.y += p.vy;

      // Отскок от краёв
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      // Реакция на мышь
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < mouseRadius) {
        const angle = Math.atan2(dy, dx);
        const force = (mouseRadius - distance) / mouseRadius;
        p.vx -= Math.cos(angle) * force * 0.05;
        p.vy -= Math.sin(angle) * force * 0.05;
      }

      // Рисуем звёздочку
      ctx.fillStyle = particleColor;
      drawStar(ctx, p.x, p.y, 5, p.size * 2, p.size);
    });
	
	// Рисуем линии между близкими звёздами
const linkDistance = 150; // Максимальное расстояние для соединения (в пикселях)

for (let i = 0; i < particles.length; i++) {
  for (let j = i + 1; j < particles.length; j++) {
    const p1 = particles[i];
    const p2 = particles[j];

    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < linkDistance) {
      // Рисуем линию
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = `rgba(179, 136, 255, ${1 - distance / linkDistance})`; // Фиолетовый, полупрозрачный
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

    requestAnimationFrame(animate);
  }

  // Запуск
  resizeCanvas();
  initParticles();
  animate();

  // При изменении размера окна
  window.addEventListener('resize', () => {
    resizeCanvas();
    initParticles();
  });
});