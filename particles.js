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
  function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, rotation) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);

    let rot = -Math.PI / 2; // Начинаем с верхней точки
    let step = Math.PI / spikes;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      let radius = i % 2 === 0 ? outerRadius : innerRadius;
      let x = cx + Math.cos(rot) * radius;
      let y = cy + Math.sin(rot) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
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
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01, // Увеличил скорость для заметности
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

    // Рисуем звёзды
    particles.forEach(p => {
      // Движение
      p.x += p.vx;
      p.y += p.vy;

      // Отскок
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

      // Вращение
      p.rotation += p.rotationSpeed;

      // Рисуем
      ctx.fillStyle = particleColor;
      drawStar(ctx, p.x, p.y, 5, p.size * 2, p.size, p.rotation);
    });

    // Рисуем линии (БЕЛЫЕ)
    const linkDistance = 150;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < linkDistance) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${1 - distance / linkDistance})`; // ← БЕЛЫЙ ЦВЕТ
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

  window.addEventListener('resize', () => {
    resizeCanvas();
    initParticles();
  });
});