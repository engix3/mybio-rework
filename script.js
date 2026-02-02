// ==========================================
// SCRIPT.JS - GYRO FIX & REBOOT UPDATE
// ==========================================

const DISCORD_ID = "1257675618175422576"; 
const LASTFM_USERNAME = "engi2";      
const LASTFM_API_KEY = "d150e3e4d37438b5a18bb0f942f3275a";      

// === DOM ELEMENTS ===
const overlay = document.getElementById('overlay');
const mainContainer = document.getElementById('main-container');
const techStats = document.getElementById('tech-stats');
const bgMusic = document.getElementById('bg-music');
const enterSound = document.getElementById('enter-sound');
const videoBg = document.getElementById('video-bg');

// === VARIABLES ===
let entered = false;

// Physics Vars
let currentTiltX = 0, currentTiltY = 0;
let targetTiltX = 0, targetTiltY = 0;
let initialGamma = 0, initialBeta = 0; 
let isMobile = false;

// Init Services
connectLanyard();

// === 1. SYSTEM ENTRY ===
overlay.addEventListener('click', async () => {
    if (entered) return;
    entered = true;

    if(enterSound) {
        enterSound.volume = 0.4;
        enterSound.play().catch(() => {});
    }

    // --- MOBILE PHYSICS SETUP (ИЗМЕНЕНО: ГИРОСКОП ОТКЛЮЧЕН) ---
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
    
    if (isMobile) {
        // 1. Отключаем библиотеку vanilla-tilt (эффект наклона), чтобы карточка была ровной
        const card = document.querySelector('.glass-card');
        if (card && card.vanillaTilt) {
            card.vanillaTilt.destroy(); 
        }
    }
    // ----------------------------

    overlay.style.opacity = '0';
    
    setTimeout(() => {
        overlay.style.display = 'none';
        mainContainer.classList.remove('hidden');
        techStats.classList.remove('hidden');
        techStats.classList.add('stats-enter-anim'); 
        
        if(bgMusic) {
             bgMusic.pause();
             bgMusic.currentTime = 0;
        }
        
        // Init Logic
        try { initTypewriter(); } catch(e) {}
        try { setGreeting(); } catch(e) {}
        try { initTechStats(); } catch(e) {}
        try { updateLastFM(); } catch(e) {}
        try { initSpotlight(); } catch(e) {} 
        initTooltips();

        setTimeout(() => {
            document.body.classList.add('intro-finished');
            techStats.classList.remove('stats-enter-anim');
            techStats.style.opacity = '';
            techStats.style.transform = '';
        }, 1200);
    }, 800);
});

// === SPOTLIGHT FIX ===
function initSpotlight() {
    const card = document.querySelector('.glass-card');
    if(!card) return;
    card.addEventListener('mousemove', (e) => {
        if(isMobile) return; 
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--y', `${e.clientY - rect.top}px`);
    });
}

// === TECH STATS ===
function initTechStats() {
    const ua = navigator.userAgent.toLowerCase();
    const os = ua.includes("android")?"ANDROID":ua.includes("iphone")?"IOS":ua.includes("win")?"WINDOWS":ua.includes("mac")?"MACOS":"LINUX";
    const platEl = document.querySelector('#platform-display span');
    if(platEl) platEl.textContent = os;

    const fpsEl = document.getElementById('fps-counter');
    let lastTime = performance.now(), frames = 0;
    function loop() {
        const now = performance.now();
        frames++;
        if (now - lastTime >= 1000) {
            if(fpsEl) fpsEl.textContent = frames;
            frames = 0; lastTime = now;
        }
        requestAnimationFrame(loop);
    }
    loop();

    const pingEl = document.getElementById('ping-counter');
    setInterval(() => {
        if(pingEl) pingEl.textContent = Math.floor(Math.random() * (25 - 12 + 1) + 12);
    }, 2000);
}

// === 2. LAST.FM (FIXED: ANTI-FLICKER + ITUNES) ===

// 1. ПЕРЕМЕННЫЕ СОСТОЯНИЯ
let lastSongName = "";
let lastIsPlaying = null; 
let playingCounter = 0; // <--- НОВОЕ: Счетчик для защиты от багов

// 2. Функция поиска красивых обложек (iTunes)
async function findBestArt(artist, track, lastFmImage) {
    try {
        const query = `${artist} ${track}`;
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            return data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        }
    } catch (e) {}
    return lastFmImage || "";
}

// 3. Основная функция
async function updateLastFM() {
    if(!LASTFM_USERNAME || !LASTFM_API_KEY) return;
    
    const songTitleEl = document.getElementById('fm-song-title');
    const artistEl = document.getElementById('fm-artist');
    const artEl = document.getElementById('fm-art');
    const statusEl = document.getElementById('fm-status');
    const linkEl = document.getElementById('fm-link');
    const songLinkEl = document.getElementById('fm-song-link');
    const infoContainer = document.getElementById('fm-info');

    if(!songTitleEl) return;

    // URL с защитой от кэша (Date.now())
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USERNAME}&api_key=${LASTFM_API_KEY}&format=json&limit=1&_=${Date.now()}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) return;

        const track = data.recenttracks.track[0];
        const currentSongName = track.name;
        const currentArtist = track.artist['#text'];
        const trackUrl = track.url;
        
        // --- ЗАЩИТА ОТ МЕРЦАНИЯ (ANTI-FLICKER) ---
        const rawIsPlaying = (track['@attr'] && track['@attr'].nowplaying === "true") ? true : false;
        let finalIsPlaying = rawIsPlaying;

        if (rawIsPlaying) {
            // Если Last.fm говорит "Играет" - верим сразу
            playingCounter = 0;
            finalIsPlaying = true;
        } else {
            // Если Last.fm говорит "Не играет", а у нас до этого играло...
            if (lastIsPlaying === true) {
                playingCounter++; 
                // Первые 4 проверки (около 12 сек) игнорируем "паузу"
                // Это спасает, если API на секунду отдал ошибку
                if (playingCounter < 4) { 
                    finalIsPlaying = true; 
                } else {
                    finalIsPlaying = false;
                }
            }
        }

        // --- ЛОГИКА 1: ОБНОВЛЕНИЕ ПЕСНИ ---
        if (lastSongName !== currentSongName) {
            console.log("LastFM: Song changed to", currentSongName);
            lastSongName = currentSongName;
            
            // Сбрасываем буфер при смене трека, чтобы новая песня сразу определилась верно
            playingCounter = 0;

            infoContainer.style.opacity = '0';
            artEl.style.opacity = '0';

            let rawLastFmArt = "";
            if(track.image && track.image.length > 3 && track.image[3]['#text']) rawLastFmArt = track.image[3]['#text'];
            else if (track.image && track.image.length > 2 && track.image[2]['#text']) rawLastFmArt = track.image[2]['#text'];
            
            const isDefault = rawLastFmArt.includes("2a96cbd8b46e442fc41c2b86b821562f") || rawLastFmArt === "";
            const artCandidate = isDefault ? null : rawLastFmArt;

            const finalArtUrl = await findBestArt(currentArtist, currentSongName, artCandidate);

            setTimeout(() => {
                songTitleEl.textContent = currentSongName;
                artistEl.textContent = currentArtist;
                songLinkEl.href = trackUrl;
                if(linkEl) linkEl.href = trackUrl;

                if (finalArtUrl) {
                    artEl.src = finalArtUrl;
                    artEl.onload = () => { artEl.style.opacity = '1'; };
                } else {
                    artEl.style.opacity = '0';
                }
                infoContainer.style.opacity = '1';
            }, 300);
        }

        // --- ЛОГИКА 2: ОБНОВЛЕНИЕ СТАТУСА ---
        if (lastIsPlaying !== finalIsPlaying) {
            console.log("LastFM: Status changed to", finalIsPlaying ? "Playing" : "Paused");
            lastIsPlaying = finalIsPlaying;

            if (finalIsPlaying) {
                statusEl.textContent = "LISTENING NOW";
                statusEl.className = "text-[10px] font-bold text-green-500 uppercase tracking-wider mb-0.5 animate-pulse smooth-all";
            } else {
                statusEl.textContent = "LAST TRACK";
                statusEl.className = "text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5 smooth-all";
            }
        }

    } catch (error) {
        console.error("LastFM Error:", error);
    }
}

// 4. ЗАПУСК
updateLastFM();
setInterval(updateLastFM, 3000);

// === 3. DISCORD (ULTRA SMOOTH) ===
let discordTimer = null;
let currentActivityStart = null;
let activityStateStr = "";

const statusColors = {
    online: "#23a559",
    idle: "#f0b232",
    dnd: "#f23f43",
    offline: "#80848e"
};

function connectLanyard() {
    const ws = new WebSocket('wss://api.lanyard.rest/socket');
    ws.onopen = () => { ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } })); };
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.t === 'INIT_STATE' || data.t === 'PRESENCE_UPDATE') updateStatus(data.d);
        } catch(e) {}
    };
    ws.onclose = () => { setTimeout(connectLanyard, 5000); };
    setInterval(() => { if(ws.readyState === 1) ws.send(JSON.stringify({ op: 3 })); }, 30000);
}

function animateChange(element, newValue, type = 'text') {
    if(type === 'image' && element.src === newValue) return;
    if(type === 'html' && element.innerHTML === newValue) return;
    if(type === 'text' && element.textContent === newValue) return;

    element.style.opacity = '0';
    setTimeout(() => {
        if(type === 'image') element.src = newValue;
        else if(type === 'html') element.innerHTML = newValue;
        else element.textContent = newValue;
        element.style.opacity = '1';
    }, 200);
}

function updateStatus(data) {
    const discordCard = document.getElementById('discord-card');
    const mainAvatar = document.getElementById('discord-avatar');
    const cardAvatar = document.getElementById('discord-card-avatar');
    const statusDot = document.getElementById('discord-status-dot');
    const usernameEl = document.getElementById('discord-username');
    const statusTextEl = document.getElementById('discord-status-text');
    const subTextEl = document.getElementById('discord-sub-text');

    if(!data.discord_user) return;
    
    const user = data.discord_user;
    const userAvatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512` : `https://cdn.discordapp.com/embed/avatars/0.png`;
    const statusColor = statusColors[data.discord_status] || statusColors.offline;
    
    if(mainAvatar) {
        if(mainAvatar.src !== userAvatarUrl) { 
            mainAvatar.src = userAvatarUrl; 
            mainAvatar.onload = () => mainAvatar.classList.remove('opacity-0');
        }
        mainAvatar.style.borderColor = statusColor;
    }
    
    if(usernameEl) usernameEl.textContent = user.global_name || user.username;
    if(discordCard) discordCard.classList.remove('hidden');

    if(discordTimer) clearInterval(discordTimer);
    discordTimer = null;
    currentActivityStart = null;
    activityStateStr = "";

    let newTitleHTML = "";
    let newLargeImage = "";
    let isSquareImage = false;
    let showDot = true;
    let dotContent = "";
    let dotClass = "";
    
    if(data.listening_to_spotify) {
        newTitleHTML = '<span class="text-green-400 font-bold">Spotify</span>';
        activityStateStr = `${data.spotify.song} - ${data.spotify.artist}`;
        newLargeImage = data.spotify.album_art_url;
        isSquareImage = true;
        showDot = false; 
    } 
    else if (data.activities && data.activities.length > 0) {
        const game = data.activities.find(a => a.type === 0) || data.activities[0];
        newTitleHTML = `Playing <span class="text-white font-bold truncate">${game.name}</span>`;
        
        let largeIcon = game.assets?.large_image;
        if(largeIcon?.startsWith('mp:')) largeIcon = largeIcon.replace('mp:', 'https://media.discordapp.net/');
        else if(largeIcon) largeIcon = `https://cdn.discordapp.com/app-assets/${game.application_id}/${largeIcon}.png`;
        newLargeImage = largeIcon || userAvatarUrl;
        isSquareImage = !!largeIcon;

        if(game.assets?.small_image) {
            let smallIcon = game.assets.small_image;
            if(smallIcon.startsWith('mp:')) smallIcon = smallIcon.replace('mp:', 'https://media.discordapp.net/');
            else smallIcon = `https://cdn.discordapp.com/app-assets/${game.application_id}/${smallIcon}.png`;
            
            showDot = true;
            dotClass = "absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full border-2 border-[#111] bg-[#111] flex items-center justify-center overflow-hidden transition-all duration-300";
            dotContent = `<img src="${smallIcon}" class="w-full h-full object-cover">`;
        } else {
            showDot = true;
            dotClass = "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#111] transition-all duration-300";
            dotContent = "";
        }

        activityStateStr = game.details || game.state || "In Game";

        if(game.timestamps && game.timestamps.start) {
            currentActivityStart = game.timestamps.start;
            updateGameString(); 
            discordTimer = setInterval(updateGameString, 1000);
        }

    } 
    else {
        newTitleHTML = data.discord_status.charAt(0).toUpperCase() + data.discord_status.slice(1);
        activityStateStr = "Chilling";
        newLargeImage = userAvatarUrl;
        isSquareImage = false;
        
        showDot = true;
        dotClass = "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#111] transition-all duration-300";
        dotContent = "";
    }

    animateChange(statusTextEl, newTitleHTML, 'html');

    const avatarClass = isSquareImage 
        ? "w-10 h-10 object-cover rounded-md transition-all duration-500 ease-in-out" 
        : "w-10 h-10 object-cover rounded-full transition-all duration-500 ease-in-out";

    if (cardAvatar.className !== avatarClass) {
        cardAvatar.className = avatarClass;
    }

    if(cardAvatar.src !== newLargeImage) {
        cardAvatar.style.opacity = '0';
        setTimeout(() => {
            cardAvatar.src = newLargeImage;
            cardAvatar.style.opacity = '1';
        }, 200);
    }

    if(!currentActivityStart) {
        animateChange(subTextEl, activityStateStr, 'text');
    }

    if(showDot) {
        statusDot.style.display = 'flex';
        statusDot.className = dotClass; 
        
        if(dotContent) {
            statusDot.innerHTML = dotContent;
            statusDot.style.backgroundColor = 'transparent';
        } else {
            statusDot.innerHTML = '';
            statusDot.style.backgroundColor = statusColor;
        }
    } else {
        statusDot.style.display = 'none';
    }
}

function updateGameString() {
    const el = document.getElementById('discord-sub-text');
    if(!el || !currentActivityStart) return;
    
    const diff = Date.now() - currentActivityStart;
    let timeStr = "";
    
    if(diff > 0) {
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        timeStr = `${hours>0?hours+':':''}${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')} elapsed`;
    }

    if(activityStateStr) {
        el.innerHTML = `${activityStateStr} &bull; ${timeStr}`;
    } else {
        el.textContent = timeStr;
    }
}

// === UTILS ===
function initTypewriter() {
    const phrases = ["Into the Void", "Neon Dreams", "Silence is Loud", "Virtual Reality", "Error 404"];
    const typeEl = document.getElementById('typewriter');
    let phraseIndex = 0, charIndex = 0, isDeleting = false, typeSpeed = 100;
    
    function type() {
        if(!typeEl) return;
        const currentPhrase = phrases[phraseIndex];
        if (isDeleting) {
            typeEl.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--; typeSpeed = 50;
        } else {
            typeEl.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++; typeSpeed = 150;
        }
        if (!isDeleting && charIndex === currentPhrase.length) {
            isDeleting = true; typeSpeed = 2000; 
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false; phraseIndex = (phraseIndex + 1) % phrases.length; typeSpeed = 500;
        }
        setTimeout(type, typeSpeed);
    }
    type();
}
function setGreeting() {
    const h = new Date().getHours();
    const el = document.getElementById('time-greeting');
    if(el) el.textContent = h<6?"You should be sleeping. 😴":h<12?"Good morning. 🌅":h<18?"Good afternoon. ☀️":"Good evening. 🌙";
}

// === COPY & CONTEXT ===
function initTooltips() {
    const cursorTooltip = document.getElementById('link-cursor-tooltip');
    const tooltipText = document.getElementById('tooltip-text');
    if(!cursorTooltip) return;
    document.addEventListener('mousemove', (e) => {
        cursorTooltip.style.left = `${Math.min(e.clientX + 15, window.innerWidth - 150)}px`;
        cursorTooltip.style.top = `${Math.min(e.clientY + 15, window.innerHeight - 40)}px`;
    });
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('mouseenter', () => {
            let url = link.href;
            try {
                if (url.includes(window.location.hostname)) tooltipText.textContent = "SYSTEM ACTION";
                else {
                     let displayUrl = new URL(url).hostname + new URL(url).pathname;
                     displayUrl = displayUrl.replace('www.', '');
                     if(displayUrl.length > 25) displayUrl = displayUrl.substring(0, 25) + '...';
                     tooltipText.textContent = ">> " + displayUrl;
                }
            } catch (e) { tooltipText.textContent = "LINK"; }
            cursorTooltip.style.opacity = '1';
        });
        link.addEventListener('mouseleave', () => { cursorTooltip.style.opacity = '0'; });
    });
}
const contextMenu = document.getElementById('custom-context-menu');
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if(!contextMenu) return;
    const link = e.target.closest('a');
    document.getElementById('context-copy-text').textContent = link ? "Copy Link Address" : "Copy Site Link";
    linkToCopy = link ? link.href : window.location.href;
    contextMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 160)}px`;
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.display = 'flex';
});
document.addEventListener('click', () => { if(contextMenu) contextMenu.style.display = 'none'; });
let linkToCopy = null;
function handleCopyAction() {
    const url = linkToCopy || window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        iziToast.show({ theme: 'dark', icon: 'fa-solid fa-link', title: 'Link', message: 'Copied', position: 'topCenter', progressBarColor: '#00ff88', timeout: 2000 });
    });
}
function copyDiscordNick() {
    navigator.clipboard.writeText("engi").then(() => {
        iziToast.show({ theme: 'dark', icon: 'fa-brands fa-discord', title: 'Discord', message: 'ID is copied', position: 'topCenter', progressBarColor: '#5865F2', timeout: 2000 });
    });
}
function copyLastFM() {
    const song = document.getElementById('fm-song-title').textContent;
    const artist = document.getElementById('fm-artist').textContent;
    if (!song || song === "Searching..." || song === "No Data") return;
    navigator.clipboard.writeText(`${artist} - ${song}`).then(() => {
        iziToast.show({ theme: 'dark', icon: 'fa-solid fa-music', title: 'Last.fm', message: 'Track name copied', position: 'topCenter', progressBarColor: '#b90000', timeout: 2000 });
    });
}

// === REBOOT SCREEN (NEW ANIMATION) ===
function triggerReboot() {
    // 1. Hide Context Menu
    if(contextMenu) contextMenu.style.display = 'none';

    // 2. Hide Main UI
    mainContainer.classList.add('ui-hidden');
    techStats.classList.add('ui-hidden');

    // 3. Show Reboot Screen
    const screen = document.getElementById('reboot-screen');
    const logs = document.getElementById('reboot-logs');
    screen.classList.remove('hidden');
    screen.style.display = 'flex'; // Force display

    // 4. Logs Animation
    const lines = [
        "SYSTEM_HALT: CRITICAL_PROCESS_DIED",
        "Collecting error info...",
        "Dumping physical memory to disk: 100%",
        "Clearing cache...",
        "Contacting admin...",
        "Initiating system restart..."
    ];

    let delay = 0;
    lines.forEach((line, i) => {
        setTimeout(() => {
            const p = document.createElement('div');
            p.textContent = `> ${line}`;
            logs.appendChild(p);
            window.scrollTo(0, document.body.scrollHeight);
        }, delay);
        // Случайная задержка между строками для реализма
        delay += 300 + Math.random() * 400;
    });

    // 5. Reload Page
    setTimeout(() => {
        location.reload();
    }, delay + 500);
}

document.addEventListener('keydown', (e) => {
    if(e.code === 'Insert') {
        mainContainer.classList.toggle('ui-hidden');
        techStats.classList.toggle('ui-hidden');
        if (videoBg) {
             const vignette = document.getElementById('vignette');
             if (mainContainer.classList.contains('ui-hidden')) {
                 videoBg.classList.add('video-clean');
                 if(vignette) vignette.style.opacity = '0'; 
             } else {
                 videoBg.classList.remove('video-clean');
                 if(vignette) vignette.style.opacity = '1';
             }
        }
    }
});

// === SMOOTH VIDEO LOAD ===
const videoElement = document.getElementById('video-bg');

function onVideoReady() {
    // Добавляем класс, который плавно меняет opacity с 0 на 1
    videoElement.classList.add('video-ready');
}

// Проверяем, может видео уже загрузилось (из кэша)
if (videoElement.readyState >= 3) {
    onVideoReady();
} else {
    // Если нет, ждем события, когда данных будет достаточно для воспроизведения
    videoElement.addEventListener('canplaythrough', onVideoReady, { once: true });
    // Подстраховка: если canplaythrough тупит, сработает просто при загрузке данных
    videoElement.addEventListener('loadeddata', onVideoReady, { once: true });
}
