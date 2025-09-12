// script.js
document.addEventListener('DOMContentLoaded', () => {
  const card = document.querySelector('.card');
  if (!card) return;

  // Максимальный угол наклона (в градусах)
  const maxTilt = 10;

  // Отслеживаем движение мыши
  document.addEventListener('mousemove', (e) => {
    // Получаем размеры окна
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Получаем положение курсора (от 0 до 1)
    const mouseX = e.clientX / windowWidth;
    const mouseY = e.clientY / windowHeight;

    // Рассчитываем наклон: от -maxTilt до +maxTilt
    // Когда курсор слева — карточка наклоняется влево (отрицательный rotateY)
    // Когда курсор сверху — карточка наклоняется вверх (отрицательный rotateX)
    const rotateY = (mouseX - 0.5) * maxTilt * 2; // -5° до +5° по горизонтали
    const rotateX = (mouseY - 0.5) * maxTilt * 2; // -5° до +5° по вертикали

    // Применяем трансформацию
    card.style.transform = `
      perspective(1000px)
      rotateX(${-rotateX}deg)
      rotateY(${rotateY}deg)
      translateY(-5px)
    `;

    // Дополнительно: можно добавить плавное затухание при уходе мыши
  });

  // Сбрасываем наклон, когда мышь уходит
  document.addEventListener('mouseleave', () => {
    card.style.transition = 'transform 0.5s ease-out';
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(-5px)';
  });

  // Возвращаем плавность при движении
  document.addEventListener('mousemove', () => {
    card.style.transition = 'transform 0.08s ease-out';
  });
});