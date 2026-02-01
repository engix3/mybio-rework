// ==========================================
// SCRIPT.JS - SYSTEM LOGIC
// ==========================================

const DISCORD_ID = "1257675618175422576"; 

// === DOM ELEMENTS ===
const overlay = document.getElementById('overlay');
const mainContainer = document.getElementById('main-container');
const techStats = document.getElementById('tech-stats');
const footerInfo = document.getElementById('footer-info');
const bgMusic = document.getElementById('bg-music');
const enterSound = document.getElementById('enter-sound');
const videoBg = document.getElementById('video-bg');

// === VARIABLES ===
let entered = false;
let currentTiltX = 0, currentTiltY = 0, targetTiltX = 0, targetTiltY = 0;
let centerBeta = 0, centerGamma = 0;
const centeringSpeed = 0.05; 

// Init Lanyard early to fetch data
connectLanyard();

// === 1. SYSTEM ENTRY (BIOMETRIC LOGIN) ===
overlay.addEventListener('click', () => {
    if (entered) return;
    entered = true;

    // Sound
    enterSound.volume = 0.4;
    enterSound.play().catch(e => console.log("Audio prevented"));

    // Mobile Check & Gyroscope
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        const card = document.querySelector('.glass-card');
        if (card && card.vanillaTilt) card.vanillaTilt.destroy();
        
        // iOS 13+ Permissions
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

    // Hide Overlay
    overlay.style.opacity = '0';
    
    // Launch Sequence
    setTimeout(() => {
        overlay.style.display = 'none';
        
        // Reveal UI
        mainContainer.classList.remove('hidden');
        techStats.classList.remove('hidden');
        techStats.classList.add('stats-enter-anim'); 
        footerInfo.classList.remove('hidden');
        
        // Start Music
        const volSlider = document.getElementById('volume-slider');
        const maxVolumeLimit = 0.4;
        bgMusic.volume = (volSlider.value / 100) * maxVolumeLimit;
        bgMusic.play();
        const playBtn = document.getElementById('play-btn');
        playBtn.innerHTML = '<i class="fa-solid fa-pause text-sm ml-px"></i>';
        
        // Init Systems
        initTypewriter();
        fetchGeoData();
        setGreeting();
        detectPlatform();

        // Finish Intro (Enable smooth UI transitions)
        setTimeout(() => {
            document.body.classList.add('intro-finished');
            
            // Clean animations for Insert toggle
            techStats.classList.remove('stats-enter-anim');
            techStats.style.opacity = '';
            techStats.style.transform = '';
            
        }, 1200);

    }, 800);
});

// === 2. MOBILE TILT PHYSICS ===
function handleMobileTilt(e) {
    if (!entered) return;
    const rawBeta = e.beta || 0; 
    const rawGamma = e.gamma || 0; 
    
    // Auto-centering
    centerBeta += (rawBeta - centerBeta) * centeringSpeed;
    centerGamma += (rawGamma - centerGamma) * centeringSpeed;
    
    let tiltX = rawGamma - centerGamma;
    let tiltY = rawBeta - centerBeta;
    const limit = 25; 
    
    targetTiltX = Math.max(-limit, Math.min(limit, tiltX));
    targetTiltY = Math.max(-limit, Math.min(limit, tiltY));
}

function updateMobilePhysics() {
    if (!entered) return;
    const card = document.querySelector('.glass-card');
    if (card) {
        currentTiltX += (targetTiltX - currentTiltX) * 0.1;
        currentTiltY += (targetTiltY - currentTiltY) * 0.1;
        card.style.transform = `perspective(1000px) rotateY(${currentTiltX}deg) rotateX(${-currentTiltY}deg)`;
    }
    requestAnimationFrame(updateMobilePhysics);
}

// === 3. AUDIO PLAYER ===
const playBtn = document.getElementById('play-btn');
const seekSlider = document.getElementById('seek-slider');
const seekFill = document.getElementById('seek-fill'); 
const seekThumb = document.getElementById('seek-thumb'); 
const volumeSlider = document.getElementById('volume-slider');
const currentTimeEl = document.getElementById('current-time');

let isBusy = false;

playBtn.onclick = () => {
    if (bgMusic.paused) {
        bgMusic.play();
        playBtn.innerHTML = '<i class="fa-solid fa-pause text-sm ml-px"></i>';
    } else {
        bgMusic.pause();
        playBtn.innerHTML = '<i class="fa-solid fa-play text-sm ml-0.5"></i>';
    }
};

// Metadata
bgMusic.addEventListener('loadedmetadata', () => {
    if (isFinite(bgMusic.duration)) {
        seekSlider.max = Math.floor(bgMusic.duration);
        seekSlider.value = 0;
        updatePlayerVisuals(0, bgMusic.duration);
    }
});

// Progress Update
bgMusic.addEventListener('timeupdate', () => {
    if (isBusy) return;
    if (!isFinite(bgMusic.duration)) return;
    seekSlider.value = Math.floor(bgMusic.currentTime);
    updatePlayerVisuals(bgMusic.currentTime, bgMusic.duration);
});

// Seek Events
seekSlider.addEventListener('input', () => {
    isBusy = true;
    updatePlayerVisuals(seekSlider.value, bgMusic.duration || 100);
});

seekSlider.addEventListener('change', () => {
    if (isFinite(bgMusic.duration)) {
        bgMusic.currentTime = seekSlider.value;
    }
    isBusy = false;
});

// Volume Control
function updateVolume() {
    const val = volumeSlider.value;
    const maxVolumeLimit = 0.4;
    bgMusic.volume = (val / 100) * maxVolumeLimit;
}
volumeSlider.addEventListener('input', updateVolume);

// Visuals Logic
function updatePlayerVisuals(current, duration) {
    let mins = Math.floor(current / 60);
    let secs = Math.floor(current % 60);
    if (secs < 10) secs = '0' + secs;
    currentTimeEl.textContent = mins + ':' + secs;
    
    if (duration > 0) {
        let percent = (current / duration) * 100;
        if (percent < 0) percent = 0;
        if (percent > 100) percent = 100;
        if (seekFill) seekFill.style.width = `${percent}%`;
        if (seekThumb) {
            seekThumb.style.left = `${percent}%`;
            seekThumb.style.transform = `translateX(-50%)`; 
        }
    }
}

// === 4. KEYBOARD CONTROLS ===
document.addEventListener('keydown', (e) => {
    // Space to Play/Pause
    if (e.code === 'Space' && entered) {
        e.preventDefault();
        playBtn.click();
    }
    
    // Insert to Hide/Show UI
    if(e.code === 'Insert') {
        const isHidden = mainContainer.classList.toggle('ui-hidden');
        techStats.classList.toggle('ui-hidden');
        footerInfo.classList.toggle('ui-hidden');
        
        if (videoBg) {
            if (isHidden) {
                videoBg.classList.add('video-clean');
                const vignette = document.getElementById('vignette');
                if(vignette) vignette.style.opacity = '0'; 
            } else {
                videoBg.classList.remove('video-clean');
                const vignette = document.getElementById('vignette');
                if(vignette) vignette.style.opacity = '1';
            }
        }
        
        iziToast.show({
            theme: 'dark',
            icon: isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye',
            title: 'UI Mode',
            message: isHidden ? 'Hidden (Press Insert)' : 'Visible',
            position: 'topCenter',
            progressBarColor: '#fff',
            timeout: 1500,
            displayMode: 'replace',
            class: 'glass-toast'
        });
    }
});

// === 5. TYPEWRITER EFFECT ===
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
        typeSpeed = 2000; 
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typeSpeed = 500;
    }
    setTimeout(initTypewriter, typeSpeed);
}

// === 6. LANYARD API (DISCORD) ===
let currentStartTime = null; 
let currentActivityText = ""; 

function connectLanyard() {
    const ws = new WebSocket('wss://api.lanyard.rest/socket');
    ws.onopen = () => {
        ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
    };
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const { t, d } = data;
        if (t === 'INIT_STATE' || t === 'PRESENCE_UPDATE') {
            updateStatus(d);
        }
    };
    setInterval(() => { ws.send(JSON.stringify({ op: 3 })); }, 30000);
}

// Timer for Games
setInterval(() => {
    if (currentStartTime && currentActivityText) {
        const subTextEl = document.getElementById('discord-sub-text');
        const elapsed = Date.now() - currentStartTime;
        if (elapsed > 0) {
            const seconds = Math.floor(elapsed / 1000);
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60; 
            const timeStr = h > 0 
                ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` 
                : `${m}:${s.toString().padStart(2, '0')}`;
            subTextEl.textContent = `${currentActivityText} • ${timeStr} elapsed`;
        }
    }
}, 1000);

function updateStatus(data) {
    const discordCard = document.getElementById('discord-card');
    const mainAvatar = document.getElementById('discord-avatar');       
    const cardAvatar = document.getElementById('discord-card-avatar');  
    const statusDot = document.getElementById('discord-status-dot');    
    const usernameEl = document.getElementById('discord-username');
    const statusTextEl = document.getElementById('discord-status-text');
    const subTextEl = document.getElementById('discord-sub-text');

    if (!data.discord_user) return;
    
    // User Data
    const user = data.discord_user;
    const userId = user.id;
    const avatarId = user.avatar;
    const userAvatarUrl = avatarId 
        ? `https://cdn.discordapp.com/avatars/${userId}/${avatarId}.png?size=512` 
        : `https://cdn.discordapp.com/embed/avatars/0.png`;

    const statusMap = { online: '#23a559', idle: '#f0b232', dnd: '#f23f43', offline: '#80848e' };
    const status = data.discord_status || 'offline';
    const statusColor = statusMap[status];

    // Main Avatar & Nick
    if (mainAvatar) {
        if (mainAvatar.src !== userAvatarUrl) {
            mainAvatar.src = userAvatarUrl;
             mainAvatar.onload = () => { mainAvatar.classList.remove('opacity-0'); };
        }
        mainAvatar.style.borderColor = statusColor;
        mainAvatar.style.boxShadow = `0 0 30px ${statusColor}40`;
    }
    smoothUpdate(usernameEl, user.global_name || user.username);
    discordCard.classList.remove('hidden');

    // Activity Mode
    let mode = 'default'; 
    let activityData = null;

    if (data.listening_to_spotify) {
        mode = 'spotify';
        activityData = data.spotify;
    } else if (data.activities && data.activities.length > 0) {
        const game = data.activities.find(a => a.type === 0);
        if (game) { mode = 'game'; activityData = game; }
    }

    currentStartTime = null;
    currentActivityText = "";

    // Render Modes
    if (mode === 'spotify') {
        smoothUpdate(statusTextEl, `<span class="text-green-400 font-bold">Listening to Spotify</span>`, true);
        smoothUpdate(subTextEl, `${activityData.song} - ${activityData.artist}`);
        if (activityData.album_art_url) {
            smoothImageUpdate(cardAvatar, activityData.album_art_url, 'rounded-md');
        }
        statusDot.style.display = 'none';
    } else if (mode === 'game') {
        const game = activityData;
        smoothUpdate(statusTextEl, `Playing <span class="text-white font-bold">${game.name}</span>`, true);
        currentActivityText = game.details || game.state || "In Game";
        if (game.timestamps && game.timestamps.start) {
            currentStartTime = game.timestamps.start;
            subTextEl.textContent = `${currentActivityText} • 0:00 elapsed`;
        } else {
            smoothUpdate(subTextEl, currentActivityText);
        }
        let largeImgUrl = userAvatarUrl; 
        if (game.assets && game.assets.large_image) {
            let icon = game.assets.large_image;
            if (icon.startsWith('mp:')) icon = icon.replace('mp:', 'https://media.discordapp.net/');
            else icon = `https://cdn.discordapp.com/app-assets/${game.application_id}/${icon}.png`;
            largeImgUrl = icon;
        }
        smoothImageUpdate(cardAvatar, largeImgUrl, 'rounded-md');
        if (game.assets && game.assets.small_image) {
            let smIcon = game.assets.small_image;
            if (smIcon.startsWith('mp:')) smIcon = smIcon.replace('mp:', 'https://media.discordapp.net/');
            else smIcon = `https://cdn.discordapp.com/app-assets/${game.application_id}/${smIcon}.png`;
            statusDot.style.display = 'block';
            statusDot.style.width = '18px'; statusDot.style.height = '18px';
            statusDot.style.border = 'none'; statusDot.style.backgroundColor = '#000'; 
            statusDot.style.borderRadius = '50%';
            statusDot.innerHTML = `<img src="${smIcon}" class="w-full h-full rounded-full object-cover">`;
            statusDot.style.bottom = '-4px'; statusDot.style.right = '-4px';
        } else {
            statusDot.style.display = 'none';
        }
    } else {
        if (!cardAvatar.src.includes(avatarId) && !cardAvatar.src.includes("embed/avatars")) {
             smoothImageUpdate(cardAvatar, userAvatarUrl, 'rounded-full');
        } else {
             cardAvatar.classList.remove('rounded-md');
             cardAvatar.classList.add('rounded-full');
        }
        const custom = data.activities ? data.activities.find(a => a.type === 4) : null;
        if (custom) {
            smoothUpdate(statusTextEl, custom.state || "Vibing");
            smoothUpdate(subTextEl, "");
        } else {
            smoothUpdate(statusTextEl, "Status: " + status.charAt(0).toUpperCase() + status.slice(1));
            smoothUpdate(subTextEl, status === 'offline' ? "Currently Offline" : "Just Chilling");
        }
        statusDot.style.display = 'flex'; 
        statusDot.innerHTML = ''; 
        statusDot.style.borderRadius = '50%';
        statusDot.style.border = 'none';
        statusDot.style.backgroundColor = 'transparent';
        if (data.active_on_discord_mobile && !data.active_on_discord_desktop) {
            statusDot.innerHTML = '<i class="fa-solid fa-mobile-screen"></i>';
            statusDot.style.color = statusColor;
            statusDot.style.fontSize = '12px';
            statusDot.style.width = 'auto'; statusDot.style.height = 'auto';
            statusDot.style.bottom = '0px'; statusDot.style.right = '-4px';
        } else {
            statusDot.style.width = '14px'; statusDot.style.height = '14px';
            statusDot.style.backgroundColor = statusColor;
            statusDot.style.border = '3px solid #111'; 
            statusDot.style.bottom = '-2px'; statusDot.style.right = '-2px';
        }
    }
}

// === 7. UTILS & STATS ===
function fetchGeoData() {
    fetch('https://ipwho.is/')
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error("API Limit");
            document.getElementById('user-ip').textContent = data.ip;
            document.getElementById('user-city').textContent = `${data.region}, ${data.country_code}`;
        })
        .catch(() => {
            document.getElementById('user-ip').textContent = "127.0.0.1";
            document.getElementById('user-city').textContent = "Unknown System";
        });
}

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

setInterval(() => {
    const ping = Math.floor(Math.random() * (40 - 14 + 1) + 14);
    document.getElementById('ping-counter').textContent = ping;
}, 2000);

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

function detectPlatform() {
    let os = "Unknown";
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("android")) os = "Android";
    else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) os = "iOS";
    else if (ua.includes("win")) os = "Windows";
    else if (ua.includes("mac")) os = "MacOS";
    else if (ua.includes("linux")) os = "Linux";
    else if (ua.includes("x11")) os = "Unix";
    document.querySelector('#platform-display span').textContent = os.toUpperCase();
}

// === 8. INTERACTIVE FEATURES ===

// Context Menu
const contextMenu = document.getElementById('custom-context-menu');
const contextCopyText = document.getElementById('context-copy-text');
let linkToCopy = null; 

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const link = e.target.closest('a');
    if (link) {
        linkToCopy = link.href; 
        if (contextCopyText) contextCopyText.textContent = "Copy Link Address"; 
    } else {
        linkToCopy = window.location.href; 
        if (contextCopyText) contextCopyText.textContent = "Copy Site Link"; 
    }
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

document.addEventListener('click', () => { contextMenu.style.display = 'none'; });

function handleCopyAction() {
    const url = linkToCopy || window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        const isSiteLink = url === window.location.href;
        iziToast.show({
            theme: 'dark',
            icon: isSiteLink ? 'fa-solid fa-globe' : 'fa-solid fa-link', 
            title: isSiteLink ? 'System' : 'Link',
            message: 'Copied to clipboard', 
            position: 'topCenter',
            progressBarColor: '#00ff88',
            imageWidth: 50,
            layout: 2,
            messageColor: '#aaa',
            titleColor: '#fff',
            iconColor: '#00ff88',
            maxWidth: 300,
            timeout: 2000,
            displayMode: 'replace'
        });
    });
}

// Spotlight Effect
const mainCard = document.querySelector('.glass-card');
const spotlight = document.getElementById('main-spotlight');

if (mainCard && spotlight) {
    mainCard.addEventListener('mousemove', (e) => {
        const rect = mainCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        spotlight.style.setProperty('--x', `${x}px`);
        spotlight.style.setProperty('--y', `${y}px`);
        spotlight.style.opacity = '0.5';
    });
    mainCard.addEventListener('mouseleave', () => { spotlight.style.opacity = '0'; });
}

// Smooth Updates
function smoothUpdate(element, newValue, isHTML = false) {
    const currentValue = isHTML ? element.innerHTML : element.textContent;
    if (currentValue === newValue) return;
    if (!element.classList.contains('smooth-text')) { element.classList.add('smooth-text'); }
    element.classList.add('fading');
    setTimeout(() => {
        if (isHTML) element.innerHTML = newValue;
        else element.textContent = newValue;
        element.classList.remove('fading');
    }, 300);
}

function smoothImageUpdate(imgElement, newSrc, newShapeClass = null) {
    if (imgElement.src === newSrc) return;
    imgElement.style.opacity = '0';
    imgElement.style.transform = 'scale(0.95)'; 
    setTimeout(() => {
        imgElement.src = newSrc;
        if (newShapeClass) {
            if (newShapeClass === 'rounded-md') {
                imgElement.classList.remove('rounded-full');
                imgElement.classList.add('rounded-md');
            } else {
                imgElement.classList.remove('rounded-md');
                imgElement.classList.add('rounded-full');
            }
        }
        imgElement.onload = () => {
            imgElement.style.opacity = '1';
            imgElement.style.transform = 'scale(1)';
        };
        setTimeout(() => { imgElement.style.opacity = '1'; imgElement.style.transform = 'scale(1)'; }, 50);
    }, 300); 
}

// Cursor Tooltip
const cursorTooltip = document.getElementById('link-cursor-tooltip');
const tooltipText = document.getElementById('tooltip-text');
const allLinks = document.querySelectorAll('a');

document.addEventListener('mousemove', (e) => {
    const x = e.clientX + 15; 
    const y = e.clientY + 15;
    cursorTooltip.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
    cursorTooltip.style.top = `${Math.min(y, window.innerHeight - 50)}px`;
});

allLinks.forEach(link => {
    link.addEventListener('mouseenter', () => {
        let url = link.href;
        try {
            const urlObj = new URL(url);
            if (url.includes(window.location.hostname)) {
                 tooltipText.textContent = "SYSTEM ACTION";
            } else {
                 let displayUrl = urlObj.hostname + urlObj.pathname;
                 displayUrl = displayUrl.replace('www.', '');
                 if(displayUrl.length > 25) displayUrl = displayUrl.substring(0, 25) + '...';
                 tooltipText.textContent = ">> " + displayUrl;
            }
        } catch (e) { tooltipText.textContent = "LINK"; }
        cursorTooltip.style.opacity = '1';
    });
    link.addEventListener('mouseleave', () => { cursorTooltip.style.opacity = '0'; });
});

// Reboot Animation
function triggerReboot() {
    const contextMenu = document.getElementById('custom-context-menu');
    contextMenu.style.display = 'none';
    const rebootScreen = document.getElementById('reboot-screen');
    const logsContainer = document.getElementById('reboot-logs');
    rebootScreen.classList.remove('hidden');
    rebootScreen.classList.add('flex');

    const enterSound = document.getElementById('enter-sound');
    if (enterSound) {
        enterSound.currentTime = 0;
        enterSound.volume = 0.5;
        enterSound.play().catch(() => {});
    }

    const logs = [
        "ROOT_ACCESS: Granted.",
        "SYSTEM: Initiating shutdown sequence...",
        "[ OK ] Stopping Audio Service (bg-music)",
        "[ OK ] Disconnecting Lanyard API Socket",
        "[WARN] Terminating User Session...",
        "MEMORY: Flushing buffers... DONE",
        "CACHE: Clearing temp files... DONE",
        "SYSTEM: Rebooting core modules...",
        "..."
    ];

    let totalDelay = 0;
    logs.forEach((log, index) => {
        const stepDelay = Math.random() * 200 + 100;
        totalDelay += stepDelay;
        setTimeout(() => {
            const line = document.createElement('div');
            if (log.includes("[WARN]")) line.className = "text-yellow-400";
            else if (log.includes("ROOT")) line.className = "text-red-500 font-bold";
            else line.className = "text-green-500";
            line.textContent = `> ${log}`;
            logsContainer.appendChild(line);
            window.scrollTo(0, document.body.scrollHeight);
        }, totalDelay);
    });

    setTimeout(() => { location.reload(); }, totalDelay + 800);
}
