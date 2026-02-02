// ==========================================
// SCRIPT.JS - ULTRA SMOOTH EDITION
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
let currentTiltX = 0, currentTiltY = 0, targetTiltX = 0, targetTiltY = 0;

// Init Services
connectLanyard();

// === 1. SYSTEM ENTRY ===
overlay.addEventListener('click', () => {
    if (entered) return;
    entered = true;

    if(enterSound) {
        enterSound.volume = 0.4;
        enterSound.play().catch(() => {});
    }

    // Mobile Physics
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
    if (isMobile) {
        const card = document.querySelector('.glass-card');
        if (card && card.vanillaTilt) card.vanillaTilt.destroy();
        
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().then(r => {
                if (r === 'granted') {
                    window.addEventListener('deviceorientation', handleMobileTilt);
                    requestAnimationFrame(updateMobilePhysics);
                }
            });
        } else {
            window.addEventListener('deviceorientation', handleMobileTilt);
            requestAnimationFrame(updateMobilePhysics);
        }
    }

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

// === 2. LAST.FM (SMOOTH) ===
let lastSongName = "";

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

    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USERNAME}&api_key=${LASTFM_API_KEY}&format=json&limit=1&_=${Date.now()}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) return;

        const track = data.recenttracks.track[0];
        const currentSongName = track.name;
        const currentArtist = track.artist['#text'];
        const trackUrl = track.url;
        const isNowPlaying = track['@attr'] && track['@attr'].nowplaying === "true";

        let rawArt = "";
        if(track.image && track.image.length > 3 && track.image[3]['#text']) rawArt = track.image[3]['#text'];
        else if (track.image && track.image.length > 2 && track.image[2]['#text']) rawArt = track.image[2]['#text'];
        
        const isDefault = rawArt.includes("2a96cbd8b46e442fc41c2b86b821562f") || rawArt === "";

        if (lastSongName !== currentSongName) {
            lastSongName = currentSongName;
            infoContainer.style.opacity = '0';
            artEl.style.opacity = '0';

            setTimeout(() => {
                songTitleEl.textContent = currentSongName;
                artistEl.textContent = currentArtist;
                songLinkEl.href = trackUrl;
                if(linkEl) linkEl.href = trackUrl;

                if (!isDefault) {
                    artEl.src = rawArt;
                    artEl.onload = () => { artEl.style.opacity = '1'; };
                } else {
                    artEl.style.opacity = '0';
                }
                infoContainer.style.opacity = '1';
            }, 300);
        }

        if (statusEl) {
            if (isNowPlaying) {
                if (statusEl.textContent !== "LISTENING NOW") {
                    statusEl.textContent = "LISTENING NOW";
                    statusEl.className = "text-[9px] font-bold text-green-500 uppercase tracking-wider mb-0.5 animate-pulse smooth-all";
                }
            } else {
                if (statusEl.textContent !== "LAST TRACK") {
                    statusEl.textContent = "LAST TRACK";
                    statusEl.className = "text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5 smooth-all";
                }
            }
        }
    } catch (error) {}
}
setInterval(updateLastFM, 3000);

// === 3. DISCORD (ULTRA SMOOTH) ===
let discordTimer = null;
let currentActivityStart = null;
let activityStateStr = "";

// State memory for smooth transitions
let lastLargeImage = "";
let lastTitleHTML = "";

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

// Хелпер для плавной смены контента
function animateChange(element, newValue, type = 'text') {
    // Если контент не изменился, ничего не делаем (чтобы таймеры не мерцали)
    if(type === 'image' && element.src === newValue) return;
    if(type === 'html' && element.innerHTML === newValue) return;
    if(type === 'text' && element.textContent === newValue) return;

    // Плавное скрытие
    element.style.opacity = '0';
    
    setTimeout(() => {
        // Смена контента
        if(type === 'image') element.src = newValue;
        else if(type === 'html') element.innerHTML = newValue;
        else element.textContent = newValue;
        
        // Плавное появление
        element.style.opacity = '1';
    }, 200); // 200ms задержка
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
    
    // Main Avatar
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

    // === PREPARE NEW VALUES ===
    let newTitleHTML = "";
    let newLargeImage = "";
    let isSquareImage = false;
    let showDot = true;
    let dotContent = "";
    let dotClass = "";
    
    // --- 1. Spotify ---
    if(data.listening_to_spotify) {
        newTitleHTML = '<span class="text-green-400 font-bold">Spotify</span>';
        activityStateStr = `${data.spotify.song} - ${data.spotify.artist}`;
        newLargeImage = data.spotify.album_art_url;
        isSquareImage = true;
        showDot = false; 
    } 
    // --- 2. Game / App ---
    else if (data.activities && data.activities.length > 0) {
        const game = data.activities.find(a => a.type === 0) || data.activities[0];
        newTitleHTML = `Playing <span class="text-white font-bold truncate">${game.name}</span>`;
        
        // Large Image Calc
        let largeIcon = game.assets?.large_image;
        if(largeIcon?.startsWith('mp:')) largeIcon = largeIcon.replace('mp:', 'https://media.discordapp.net/');
        else if(largeIcon) largeIcon = `https://cdn.discordapp.com/app-assets/${game.application_id}/${largeIcon}.png`;
        newLargeImage = largeIcon || userAvatarUrl;
        isSquareImage = !!largeIcon;

        // Small Image Calc
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
            dotContent = ""; // Just color
        }

        activityStateStr = game.details || game.state || "In Game";

        if(game.timestamps && game.timestamps.start) {
            currentActivityStart = game.timestamps.start;
            updateGameString(); // Trigger once immediately
            discordTimer = setInterval(updateGameString, 1000);
        }

    } 
    // --- 3. Default ---
    else {
        newTitleHTML = data.discord_status.charAt(0).toUpperCase() + data.discord_status.slice(1);
        activityStateStr = "Chilling";
        newLargeImage = userAvatarUrl;
        isSquareImage = false;
        
        showDot = true;
        dotClass = "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#111] transition-all duration-300";
        dotContent = "";
    }

    // === APPLY UPDATES WITH ANIMATION ===
    
    // 1. Title (Header)
    // Используем HTML так как там могут быть цветные спаны
    animateChange(statusTextEl, newTitleHTML, 'html');

    // 2. Large Image
    // Сначала определяем нужный класс (форма)
    // Поставил duration-500, чтобы морфинг был заметнее и мягче
    const avatarClass = isSquareImage 
        ? "w-10 h-10 object-cover rounded-md transition-all duration-500 ease-in-out" 
        : "w-10 h-10 object-cover rounded-full transition-all duration-500 ease-in-out";

    // Применяем класс СРАЗУ (форма начинает меняться на глазах)
    if (cardAvatar.className !== avatarClass) {
        cardAvatar.className = avatarClass;
    }

    // А смену самой картинки (src) делаем через фейд, как и было
    if(cardAvatar.src !== newLargeImage) {
        cardAvatar.style.opacity = '0';
        setTimeout(() => {
            cardAvatar.src = newLargeImage;
            cardAvatar.style.opacity = '1';
        }, 200);
    }

    // 3. Subtext (Details)
    // Если таймера нет, то обновляем текст плавно. Если таймер есть, updateGameString его обновит.
    if(!currentActivityStart) {
        animateChange(subTextEl, activityStateStr, 'text');
    }

    // 4. Dot Status
    if(showDot) {
        statusDot.style.display = 'flex';
        statusDot.className = dotClass; // Применит размеры
        
        // Вставка контента (картинки или пустоты)
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

    // Таймер обновляется каждую секунду, здесь анимация не нужна (она будет мешать чтению)
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
function handleMobileTilt(e) {
    if (!entered) return;
    if (initialBeta === null) { initialBeta = e.beta; initialGamma = e.gamma; }
    let tiltX = (e.gamma || 0) - (initialGamma || 0);
    let tiltY = (e.beta || 0) - (initialBeta || 0);
    targetTiltX = Math.max(-20, Math.min(20, tiltX));
    targetTiltY = Math.max(-20, Math.min(20, tiltY));
}
function updateMobilePhysics() {
    const card = document.querySelector('.glass-card');
    if (!entered || !card) return;
    currentTiltX += (targetTiltX - currentTiltX) * 0.1;
    currentTiltY += (targetTiltY - currentTiltY) * 0.1;
    card.style.transform = `perspective(1000px) rotateY(${currentTiltX}deg) rotateX(${-currentTiltY}deg)`;
    requestAnimationFrame(updateMobilePhysics);
}
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
function triggerReboot() { location.reload(); }
let initialBeta = null, initialGamma = null;

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

// === COPY LAST.FM TRACK ===
function copyLastFM() {
    const song = document.getElementById('fm-song-title').textContent;
    const artist = document.getElementById('fm-artist').textContent;

    if (!song || song === "Searching..." || song === "No Data") return;

    const fullTrackName = `${artist} - ${song}`;

    navigator.clipboard.writeText(fullTrackName).then(() => {
        iziToast.show({
            theme: 'dark',
            icon: 'fa-solid fa-music',
            title: 'Last.fm',
            message: 'Track name copied',
            position: 'topCenter',
            progressBarColor: '#b90000', // Красный цвет Last.fm
            timeout: 2000
        });
    });
}