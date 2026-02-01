/* --- НАСТРОЙКИ --- */
const DISCORD_ID = "1257675618175422576"; // ВАШ ID В DISCORD (Числовой)

// Получение элементов из HTML
const overlay = document.getElementById('overlay');
const mainContainer = document.getElementById('main-container');
const techStats = document.getElementById('tech-stats');
const footerInfo = document.getElementById('footer-info');
const bgMusic = document.getElementById('bg-music');
const enterSound = document.getElementById('enter-sound');
const videoBg = document.getElementById('video-bg');

/* --- 1. ВХОД В СИСТЕМУ --- */
let entered = false;

// Переменные для физики карточки (Плавность + Авто-центр)
let currentTiltX = 0;
let currentTiltY = 0;
let targetTiltX = 0;
let targetTiltY = 0;

// "Плавающий центр" - запоминает среднее положение телефона
let centerBeta = 0; 
let centerGamma = 0;
const centeringSpeed = 0.05; // Как быстро карточка возвращается в центр (меньше = медленнее)

connectLanyard();

overlay.addEventListener('click', () => {
    if (entered) return;
    entered = true;

    // Звук
    enterSound.volume = 0.4;
    enterSound.play().catch(e => console.log("Audio prevented"));

    // Проверка на мобильное устройство
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // Убиваем эффект мыши, чтобы не конфликтовал
        const card = document.querySelector('.glass-card');
        if (card && card.vanillaTilt) {
            card.vanillaTilt.destroy();
        }

        // Запрос прав для iOS 13+
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        window.addEventListener('deviceorientation', handleMobileTilt);
                        requestAnimationFrame(updateMobilePhysics); // Запускаем цикл анимации
                    }
                })
                .catch(console.error);
        } else {
            // Android и обычный iOS
            window.addEventListener('deviceorientation', handleMobileTilt);
            requestAnimationFrame(updateMobilePhysics); // Запускаем цикл анимации
        }
    }

    // Анимация входа
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
        mainContainer.classList.remove('hidden');
        techStats.classList.remove('hidden');
        footerInfo.classList.remove('hidden');
        
        // Музыка
        const volSlider = document.getElementById('volume-slider');
        const maxVolumeLimit = 0.4;
        bgMusic.volume = (volSlider.value / 100) * maxVolumeLimit;
        bgMusic.play();
        
        playBtn.innerHTML = '<i class="fa-solid fa-pause text-sm ml-px"></i>';
        
        initTypewriter();
        fetchGeoData();
        setGreeting();
        detectPlatform();
    }, 800);
});

// Обработчик данных с датчиков (Только получает данные)
function handleMobileTilt(e) {
    if (!entered) return;
    
    // Получаем сырые данные. Если null (бывает на старте), ставим 0
    const rawBeta = e.beta || 0;   // Наклон вперед-назад (-180...180)
    const rawGamma = e.gamma || 0; // Наклон влево-вправо (-90...90)

    // === МАГИЯ АВТО-ЦЕНТРИРОВАНИЯ ===
    // Мы постоянно "подтягиваем" центр к текущему положению.
    // Если вы держите телефон криво, это "криво" становится новым центром.
    // Это устраняет дрейф и баги.
    centerBeta += (rawBeta - centerBeta) * centeringSpeed;
    centerGamma += (rawGamma - centerGamma) * centeringSpeed;

    // Вычисляем отклонение от этого "плавающего" центра
    let tiltX = rawGamma - centerGamma;
    let tiltY = rawBeta - centerBeta;

    // Ограничиваем угол (Clamp), чтобы карточка не переворачивалась
    const limit = 25; 
    targetTiltX = Math.max(-limit, Math.min(limit, tiltX));
    targetTiltY = Math.max(-limit, Math.min(limit, tiltY));
}

// Цикл анимации (Плавность / Lerp)
function updateMobilePhysics() {
    if (!entered) return;

    const card = document.querySelector('.glass-card');
    if (card) {
        // Линейная интерполяция (Lerp) для супер-плавности
        // 0.1 - коэффициент плавности. Меньше = плавнее, но медленнее.
        currentTiltX += (targetTiltX - currentTiltX) * 0.1;
        currentTiltY += (targetTiltY - currentTiltY) * 0.1;

        // Применяем стили
        // rotateY - вращение по вертикальной оси (от движения влево-вправо)
        // rotateX - вращение по горизонтальной оси (от движения вперед-назад, инвертировано)
        card.style.transform = `perspective(1000px) rotateY(${currentTiltX}deg) rotateX(${-currentTiltY}deg)`;
    }

    requestAnimationFrame(updateMobilePhysics);
}

/* --- 2. АУДИО ПЛЕЕР (MINIMAL DESIGN) --- */
const playBtn = document.getElementById('play-btn');
const seekSlider = document.getElementById('seek-slider');
const seekFill = document.getElementById('seek-fill'); // Новая полоска
const seekThumb = document.getElementById('seek-thumb'); // Новый кружок
const volumeSlider = document.getElementById('volume-slider');
const currentTimeEl = document.getElementById('current-time');

let isBusy = false;

// Play/Pause
playBtn.onclick = () => {
    if (bgMusic.paused) {
        bgMusic.play();
        playBtn.innerHTML = '<i class="fa-solid fa-pause text-sm ml-px"></i>';
    } else {
        bgMusic.pause();
        playBtn.innerHTML = '<i class="fa-solid fa-play text-sm ml-0.5"></i>';
    }
};

// Загрузка метаданных
bgMusic.addEventListener('loadedmetadata', () => {
    if (isFinite(bgMusic.duration)) {
        seekSlider.max = Math.floor(bgMusic.duration);
        seekSlider.value = 0;
        updatePlayerVisuals(0, bgMusic.duration);
    }
});

// Обновление музыки
bgMusic.addEventListener('timeupdate', () => {
    if (isBusy) return;
    if (!isFinite(bgMusic.duration)) return;

    seekSlider.value = Math.floor(bgMusic.currentTime);
    updatePlayerVisuals(bgMusic.currentTime, bgMusic.duration);
});

// Пользователь тянет
seekSlider.addEventListener('input', () => {
    isBusy = true;
    updatePlayerVisuals(seekSlider.value, bgMusic.duration || 100);
});

// Пользователь отпустил
seekSlider.addEventListener('change', () => {
    if (isFinite(bgMusic.duration)) {
        bgMusic.currentTime = seekSlider.value;
    }
    isBusy = false;
});

// Громкость (с защитой от перегрузки)
volumeSlider.oninput = () => {
    // Ограничиваем реальную громкость до 40% (0.4), даже если ползунок на 100
    // Это уберет эффект "басс буста" и хрипения
    const maxVolumeLimit = 0.4; 
    
    bgMusic.volume = (volumeSlider.value / 100) * maxVolumeLimit;
};

// === ФУНКЦИЯ ОБНОВЛЕНИЯ ВИЗУАЛА (PERFECT SYNC) ===
function updatePlayerVisuals(current, duration) {
    // 1. Текст времени
    let mins = Math.floor(current / 60);
    let secs = Math.floor(current % 60);
    if (secs < 10) secs = '0' + secs;
    currentTimeEl.textContent = mins + ':' + secs;

    // 2. Синхронизация
    if (duration > 0) {
        let percent = (current / duration) * 100;
        
        // Ограничиваем проценты от 0 до 100
        if (percent < 0) percent = 0;
        if (percent > 100) percent = 100;

        // --- МАГИЯ СИНХРОНИЗАЦИИ ---
        // У input range центр ползунка смещается внутрь на краях.
        // Формула: newPercent = percent - (percent * thumbWidth / trackWidth) + (thumbWidth / 2 / trackWidth)
        // Но проще сделать визуальный хак:
        
        // 1. Полоска (Width)
        if (seekFill) {
            seekFill.style.width = `${percent}%`;
        }
        
        // 2. Кружок (Left)
        if (seekThumb) {
            // Смещаем кружок, чтобы его центр совпадал с концом процента
            // Мы просто ставим left: percent% и translate: -50%
            seekThumb.style.left = `${percent}%`;
            seekThumb.style.transform = `translateX(-50%)`; 
        }
    }
}


// Пробел
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && entered) {
        e.preventDefault();
        playBtn.click();
    }
});

/* --- 3. ЭФФЕКТ ПЕЧАТНОЙ МАШИНКИ --- */
const phrases = ["Into the Void", "Neon Dreams", "Silence is Loud", "Virtual Reality", "Error 404"];
const typeEl = document.getElementById('typewriter');
let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typeSpeed = 100;

function initTypewriter() {
    const currentPhrase = phrases[phraseIndex];
    
    if (isDeleting) {
        typeEl.textContent = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
        typeSpeed = 50;
    } else {
        typeEl.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
        typeSpeed = 150;
    }

    if (!isDeleting && charIndex === currentPhrase.length) {
        isDeleting = true;
        typeSpeed = 2000; // Пауза в конце фразы
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typeSpeed = 500;
    }

    setTimeout(initTypewriter, typeSpeed);
}

/* --- 4. DISCORD LANYARD API --- */
function connectLanyard() {
    const ws = new WebSocket('wss://api.lanyard.rest/socket');
    
    ws.onopen = () => {
        ws.send(JSON.stringify({
            op: 2,
            d: { subscribe_to_id: DISCORD_ID }
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const { t, d } = data;

        if (t === 'INIT_STATE' || t === 'PRESENCE_UPDATE') {
            updateStatus(d);
        }
    };
    
    // Heartbeat (поддержание соединения)
    setInterval(() => {
        ws.send(JSON.stringify({ op: 3 }));
    }, 30000);
}

function updateStatus(data) {
    const discordCard = document.getElementById('discord-card');
    
    // Элементы
    const avatarImg = document.getElementById('discord-avatar');
    const cardAvatar = document.getElementById('discord-card-avatar');
    const statusDot = document.getElementById('discord-status-dot');
    const usernameEl = document.getElementById('discord-username');
    const statusTextEl = document.getElementById('discord-status-text');
    const subTextEl = document.getElementById('discord-sub-text');

    // 1. Данные Пользователя (Аватар)
    if(data.discord_user) {
        const user = data.discord_user;
        const avatarId = user.avatar;
        const userId = user.id;
        const avatarUrl = avatarId 
            ? `https://cdn.discordapp.com/avatars/${userId}/${avatarId}.png?size=512` 
            : `https://cdn.discordapp.com/embed/avatars/0.png`;

        // === ОБНОВЛЕНИЕ ЦВЕТА РАМКИ (ГЛАВНОЙ АВАТАРКИ) ===
        const mainAvatar = document.getElementById('discord-avatar');
        if(mainAvatar) {
            // Цвета статусов
            const statusColors = {
                online: '#23a559',
                idle: '#f0b232',
                dnd: '#f23f43',
                offline: '#333333' // Темно-серый для оффлайна
            };
            
            // Получаем текущий статус
            const currentStatus = data.discord_status || 'offline';
            const statusColor = statusColors[currentStatus];

            // Применяем цвет рамки + эффект свечения
            mainAvatar.style.borderColor = statusColor;
            mainAvatar.style.boxShadow = `0 0 30px ${statusColor}40`; // 40 = прозрачность
        }

        // Обновляем главную аватарку (если еще не стоит)
        if (avatarImg.src !== avatarUrl) {
            avatarImg.src = avatarUrl;
        }

        // Никнейм
        smoothUpdate(usernameEl, user.global_name || user.username);
    }

    // 2. Статус (Цвет точки)
    const colors = {
        online: '#23a559',
        idle: '#f0b232',
        dnd: '#f23f43',
        offline: '#80848e'
    };
    const status = data.discord_status || 'offline';
    const color = colors[status];
    statusDot.style.backgroundColor = color;

    // 3. Активность (Logic)
    discordCard.classList.remove('hidden'); 
    let hasActivity = false;

    // A. Spotify
    if(data.listening_to_spotify) {
        hasActivity = true;
        const spotify = data.spotify;
        
        // Плавное обновление текста
        smoothUpdate(statusTextEl, `<span class="text-green-400 font-bold">Listening to Spotify</span>`, true);
        smoothUpdate(subTextEl, `${spotify.song} - ${spotify.artist}`);
        
        // Обложка (без плавности, чтобы не мигала лишний раз)
        if(spotify.album_art_url && cardAvatar.src !== spotify.album_art_url) {
          smoothImageUpdate(cardAvatar, spotify.album_art_url, 'rounded-md');
        }
    } 
    // B. Игры / Приложения
    else if (data.activities && data.activities.length > 0) {
        const game = data.activities.find(a => a.type === 0);
        const custom = data.activities.find(a => a.type === 4);

        if (game) {
            hasActivity = true;
            smoothUpdate(statusTextEl, `Playing <span class="text-white font-bold">${game.name}</span>`, true);
            smoothUpdate(subTextEl, game.details || game.state || "In Game");
            
            // Картинка игры
            if(game.assets && game.assets.large_image) {
                let iconUrl = game.assets.large_image;
                if(iconUrl.startsWith('mp:')) iconUrl = iconUrl.replace('mp:', 'https://media.discordapp.net/');
                else iconUrl = `https://cdn.discordapp.com/app-assets/${game.application_id}/${iconUrl}.png`;
                
                if (cardAvatar.src !== iconUrl) {
                    smoothImageUpdate(cardAvatar, iconUrl, 'rounded-md');
                }
            }
        } else if (custom) {
            // Кастомный статус
            smoothUpdate(statusTextEl, custom.state || "Vibing");
            smoothUpdate(subTextEl, "");
            resetCardAvatar(data.discord_user);
        } else {
            // Просто статус
            smoothUpdate(statusTextEl, "Status: " + status.charAt(0).toUpperCase() + status.slice(1));
            smoothUpdate(subTextEl, "Just Chilling");
            resetCardAvatar(data.discord_user);
        }
    } 
    // C. Оффлайн / Без активности
    else {
        smoothUpdate(statusTextEl, "Status: " + status.charAt(0).toUpperCase() + status.slice(1));
        smoothUpdate(subTextEl, status === 'offline' ? "Currently Offline" : "Just Chilling");
        resetCardAvatar(data.discord_user);
    }

    // Точка статуса
    statusDot.style.display = hasActivity ? 'none' : 'block';
}

function resetCardAvatar(user) {
    const cardAvatar = document.getElementById('discord-card-avatar');
    if(!user) return;
    const avatarId = user.avatar;
    const userId = user.id;
    const avatarUrl = avatarId 
        ? `https://cdn.discordapp.com/avatars/${userId}/${avatarId}.png?size=512` 
        : `https://cdn.discordapp.com/embed/avatars/0.png`;
    
    // Используем плавную смену
    smoothImageUpdate(cardAvatar, avatarUrl, 'rounded-full');
}

/* --- 5. IP & ГЕОДАННЫЕ --- */
function fetchGeoData() {
    fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
            document.getElementById('user-ip').textContent = data.ip;
            document.getElementById('user-city').textContent = `${data.city}, ${data.country_code}`;
        })
        .catch(() => {
            document.getElementById('user-ip').textContent = "HIDDEN";
            document.getElementById('user-city').textContent = "N/A";
        });
}

/* --- 6. ТЕХНИЧЕСКАЯ СТАТИСТИКА (FPS & PING) --- */
let lastTime = performance.now();
let frameCount = 0;
let lastFpsTime = lastTime;

function updateStats() {
    const now = performance.now();
    frameCount++;

    if (now - lastFpsTime >= 1000) {
        document.getElementById('fps-counter').textContent = frameCount;
        frameCount = 0;
        lastFpsTime = now;
    }

    requestAnimationFrame(updateStats);
}
updateStats();

// Имитация Пинга
setInterval(() => {
    const ping = Math.floor(Math.random() * (40 - 14 + 1) + 14);
    document.getElementById('ping-counter').textContent = ping;
}, 2000);

/* --- 7. УТИЛИТЫ --- */

// A. Приветствие по времени
function setGreeting() {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('time-greeting');
    let msg = "";

    if (hour >= 0 && hour < 6) msg = "You should be sleeping. 😴";
    else if (hour >= 6 && hour < 12) msg = "Good morning. 🌅";
    else if (hour >= 12 && hour < 18) msg = "Good afternoon. ☀️";
    else msg = "Good evening. 🌙";

    greetingEl.textContent = `"${msg}"`;
}

// B. Определение Платформы
function detectPlatform() {
    let os = "Unknown";
    const ua = navigator.userAgent.toLowerCase();

    // Порядок важен: Android проверяем перед Linux
    if (ua.includes("android")) os = "Android";
    else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) os = "iOS";
    else if (ua.includes("win")) os = "Windows";
    else if (ua.includes("mac")) os = "MacOS";
    else if (ua.includes("linux")) os = "Linux";
    else if (ua.includes("x11")) os = "Unix";

    document.querySelector('#platform-display span').textContent = os.toUpperCase();
}

// C. Кастомное Контекстное Меню
const contextMenu = document.getElementById('custom-context-menu');

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    let x = e.clientX;
    let y = e.clientY;

    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const cmWidth = 150;
    const cmHeight = 120;

    if (x + cmWidth > winWidth) x = winWidth - cmWidth;
    if (y + cmHeight > winHeight) y = winHeight - cmHeight;

    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.style.display = 'flex';
});

document.addEventListener('click', () => {
    contextMenu.style.display = 'none';
});

function copyCurrentUrl() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        iziToast.show({
            theme: 'dark',
            icon: 'fa-solid fa-link',
            title: 'System',
            message: 'Link Copied',
            position: 'topCenter',
            progressBarColor: '#00ff88', // Зеленая полоска
            imageWidth: 50,
            layout: 2,
            //background: 'rgba(20, 20, 20, 0.95)', // Темный фон
            messageColor: '#aaa',
            titleColor: '#fff',
            iconColor: '#00ff88', // Зеленая иконка
            maxWidth: 300,
            timeout: 2000,
            displayMode: 'replace' // Чтобы не спамило
        });
    });
}

// D. Блокировка Клавиш (F12 и т.д.)
document.addEventListener('keydown', (e) => {
    // Блок F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || 
        (e.ctrlKey && e.key === 'u')
    ) {
        e.preventDefault();
    }

    // Клавиша Insert для скрытия интерфейса
    if(e.code === 'Insert') {
        mainContainer.classList.toggle('hidden');
        techStats.classList.toggle('hidden');
        footerInfo.classList.toggle('hidden');
    }
});

/* --- 8. КОПИРОВАНИЕ DISCORD --- */
const discordCard = document.getElementById('discord-card');
discordCard.addEventListener('click', () => {
    // ЖЕСТКО ЗАДАЕМ ТЕКСТ (или берите из переменной)
    const discordLogin = "engi4"; 
    
    navigator.clipboard.writeText(discordLogin).then(() => {
        iziToast.show({
            theme: 'dark',
            icon: 'fa-brands fa-discord',
            title: discordLogin, // Показываем сам ник в заголовке
            message: 'Copied to clipboard',
            position: 'topCenter',
            progressBarColor: '#5865F2', // Синий цвет Discord
            //background: 'rgba(20, 20, 20, 0.95)',
            messageColor: '#aaa',
            titleColor: '#fff',
            iconColor: '#5865F2',
            maxWidth: 300,
            timeout: 2000,
            displayMode: 'replace'
        });
    });
});

/* --- 9. ЭФФЕКТ СВЕТА НА ГЛАВНОЙ КАРТОЧКЕ --- */
const mainCard = document.querySelector('.glass-card');
const spotlight = document.getElementById('main-spotlight');

if (mainCard && spotlight) {
    mainCard.addEventListener('mousemove', (e) => {
        const rect = mainCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Двигаем градиент
        spotlight.style.setProperty('--x', `${x}px`);
        spotlight.style.setProperty('--y', `${y}px`);
        
        // Показываем свет
        spotlight.style.opacity = '0.5';
    });

    mainCard.addEventListener('mouseleave', () => {
        // Скрываем свет, когда мышь ушла
        spotlight.style.opacity = '0';
    });
}

/* --- Вспомогательная функция для плавного текста --- */
function smoothUpdate(element, newValue, isHTML = false) {
    // Если текст не изменился - ничего не делаем
    const currentValue = isHTML ? element.innerHTML : element.textContent;
    if (currentValue === newValue) return;

    // 1. Добавляем класс плавности (если нет)
    if (!element.classList.contains('smooth-text')) {
        element.classList.add('smooth-text');
    }

    // 2. Уводим в прозрачность
    element.classList.add('fading');

    // 3. Ждем 300мс (пока исчезнет), меняем текст и возвращаем
    setTimeout(() => {
        if (isHTML) element.innerHTML = newValue;
        else element.textContent = newValue;
        
        element.classList.remove('fading');
    }, 300);
}

/* Функция для плавнейшей смены картинки */
function smoothImageUpdate(imgElement, newSrc, newShapeClass = null) {
    // Если картинка та же самая - выходим
    if (imgElement.src === newSrc) return;

    // 1. Уводим в прозрачность
    imgElement.style.opacity = '0';
    imgElement.style.transform = 'scale(0.95)'; // Небольшой зум-эффект

    setTimeout(() => {
        // 2. Меняем источник
        imgElement.src = newSrc;
        
        // 3. Меняем форму (Круг <-> Квадрат) если нужно
        if (newShapeClass) {
            if (newShapeClass === 'rounded-md') {
                imgElement.classList.remove('rounded-full');
                imgElement.classList.add('rounded-md');
            } else {
                imgElement.classList.remove('rounded-md');
                imgElement.classList.add('rounded-full');
            }
        }

        // Ждем загрузки новой картинки перед показом (чтобы не мигало пустым)
        imgElement.onload = () => {
            imgElement.style.opacity = '1';
            imgElement.style.transform = 'scale(1)';
        };
        // На случай если картинка закеширована и onload не сработает
        setTimeout(() => {
             imgElement.style.opacity = '1'; 
             imgElement.style.transform = 'scale(1)';
        }, 50);

    }, 300); // Время исчезновения
}

console.log("%cSTOP!", "color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px 0px black;");
console.log("%cThis is a browser feature intended for developers.", "color: white; font-size: 16px;");