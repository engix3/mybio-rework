const DISCORD_ID = window.CONFIG.discord.user_id;
const LASTFM_USERNAME = window.CONFIG.lastfm.username;
const LASTFM_API_KEY = window.CONFIG.lastfm.api_key;

const overlay = document.getElementById('overlay');
const mainContainer = document.getElementById('main-container');
const techStats = document.getElementById('tech-stats');
const bgMusic = document.getElementById('bg-music');
const enterSound = document.getElementById('enter-sound');
const videoBg = document.getElementById('video-bg');

let entered = false;
let currentTiltX = 0, currentTiltY = 0;
let targetTiltX = 0, targetTiltY = 0;
let initialGamma = 0, initialBeta = 0;
let isMobile = false;
let lastToastTime = 0;
const TOAST_COOLDOWN = 1000; // 1 second cooldown

// Initialize Services
initConfig();
initCursor(); // Apply custom cursor
initCursorTrail(); // Apply cursor trail
initClickEffect(); // Apply click effect
initTechStats(); // Load specs immediately
connectLanyard();

// --- SYSTEM ENTRY ---
overlay.addEventListener('click', async () => {
    if (entered) return;
    entered = true;

    if (enterSound) {
        enterSound.volume = 0.4;
        enterSound.play().catch(() => { });
    }

    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);

    if (isMobile) {
        const card = document.querySelector('.glass-card');
        if (card && card.vanillaTilt) {
            card.vanillaTilt.destroy();
        }
    }

    overlay.style.opacity = '0';

    setTimeout(() => {
        overlay.style.display = 'none';
        mainContainer.classList.remove('hidden');

        if (bgMusic) {
            bgMusic.pause();
            bgMusic.currentTime = 0;
        }

        try { initTypewriter(); } catch (e) { }
        try { setGreeting(); } catch (e) { }
        try { updateLastFM(); } catch (e) { }
        try { initSpotlight(); } catch (e) { }
        initTooltips();

        setTimeout(() => {
            document.body.classList.add('intro-finished');
        }, 1200);
    }, 800);
});

// --- SPOTLIGHT ---
function initSpotlight() {
    const card = document.querySelector('.glass-card');
    if (!card) return;
    card.addEventListener('mousemove', (e) => {
        if (isMobile) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--y', `${e.clientY - rect.top}px`);
    });
}

// --- TECH STATS ---
function initTechStats() {
    // Platform always WINDOWS
    const platEl = document.querySelector('#platform-display span');
    if (platEl) platEl.textContent = 'WINDOWS';

    // Load system specs from config
    const specs = window.CONFIG.system_specs;
    if (specs) {
        // Desktop Tech Stats
        const cpuEl = document.querySelector('#spec-cpu span');
        const gpuEl = document.querySelector('#spec-gpu span');
        const ramEl = document.querySelector('#spec-ram span');
        const storageEl = document.querySelector('#spec-storage span');

        if (cpuEl) cpuEl.textContent = specs.cpu;
        if (gpuEl) gpuEl.textContent = specs.gpu;
        if (ramEl) ramEl.textContent = specs.ram;
        if (storageEl) storageEl.textContent = specs.storage;

        // Mobile Popup Specs
        const mobileCpuEl = document.getElementById('mobile-spec-cpu');
        const mobileGpuEl = document.getElementById('mobile-spec-gpu');
        const mobileRamEl = document.getElementById('mobile-spec-ram');
        const mobileStorageEl = document.getElementById('mobile-spec-storage');

        if (mobileCpuEl) mobileCpuEl.textContent = specs.cpu;
        if (mobileGpuEl) mobileGpuEl.textContent = specs.gpu;
        if (mobileRamEl) mobileRamEl.textContent = specs.ram;
        if (mobileStorageEl) mobileStorageEl.textContent = specs.storage;

        // Platform
        const platformEl = document.getElementById('mobile-spec-platform');
        if (platformEl && specs.platform) platformEl.textContent = specs.platform;
    }

    // Specs popup functionality
    const mobileSpecsBtn = document.getElementById('mobile-specs-btn');
    const mobileSpecsPopup = document.getElementById('mobile-specs-popup');
    const mobileSpecsContent = document.getElementById('mobile-specs-content');
    const closeSpecsPopup = document.getElementById('close-specs-popup');

    if (mobileSpecsBtn && mobileSpecsPopup) {
        const openPopup = () => {
            mobileSpecsPopup.classList.remove('opacity-0', 'pointer-events-none');
            mobileSpecsContent.classList.remove('scale-95');
            mobileSpecsContent.classList.add('scale-100');
        };

        const closePopup = () => {
            mobileSpecsPopup.classList.add('opacity-0', 'pointer-events-none');
            mobileSpecsContent.classList.add('scale-95');
            mobileSpecsContent.classList.remove('scale-100');
        };

        mobileSpecsBtn.addEventListener('click', openPopup);
        closeSpecsPopup.addEventListener('click', closePopup);
        mobileSpecsPopup.addEventListener('click', (e) => {
            if (e.target === mobileSpecsPopup) closePopup();
        });
    }
}

// --- LAST.FM INTEGRATION ---
let lastSongName = "";
let lastIsPlaying = null;
let playingCounter = 0;

async function findBestArt(artist, track, lastFmImage) {
    try {
        const query = `${artist} ${track}`;
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            return data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        }
    } catch (e) { }
    return lastFmImage || "";
}

async function updateLastFM() {
    if (!LASTFM_USERNAME || !LASTFM_API_KEY) return;

    const songTitleEl = document.getElementById('fm-song-title');
    const artistEl = document.getElementById('fm-artist');
    const artEl = document.getElementById('fm-art');
    const statusEl = document.getElementById('fm-status');
    const linkEl = document.getElementById('fm-link');
    const songLinkEl = document.getElementById('fm-song-link');
    const infoContainer = document.getElementById('fm-info');

    if (!songTitleEl) return;

    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USERNAME}&api_key=${LASTFM_API_KEY}&format=json&limit=1&_=${Date.now()}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) return;

        const track = data.recenttracks.track[0];
        const currentSongName = track.name;
        const currentArtist = track.artist['#text'];

        // Anti-flicker logic
        const rawIsPlaying = (track['@attr'] && track['@attr'].nowplaying === "true") ? true : false;
        let finalIsPlaying = rawIsPlaying;

        if (rawIsPlaying) {
            playingCounter = 0;
            finalIsPlaying = true;
        } else {
            if (lastIsPlaying === true) {
                playingCounter++;
                if (playingCounter < 4) finalIsPlaying = true;
                else finalIsPlaying = false;
            }
        }

        if (lastSongName !== currentSongName) {
            lastSongName = currentSongName;
            playingCounter = 0;

            infoContainer.style.opacity = '0';
            artEl.style.opacity = '0';

            let rawLastFmArt = "";
            if (track.image && track.image.length > 3 && track.image[3]['#text']) rawLastFmArt = track.image[3]['#text'];
            else if (track.image && track.image.length > 2 && track.image[2]['#text']) rawLastFmArt = track.image[2]['#text'];

            const isDefault = rawLastFmArt.includes("2a96cbd8b46e442fc41c2b86b821562f") || rawLastFmArt === "";
            const artCandidate = isDefault ? null : rawLastFmArt;

            const finalArtUrl = await findBestArt(currentArtist, currentSongName, artCandidate);

            setTimeout(() => {
                songTitleEl.textContent = currentSongName;
                artistEl.textContent = currentArtist;
                const vkSearchUrl = `https://vk.com/audio?q=${encodeURIComponent(currentSongName + " " + currentArtist)}`;

                songLinkEl.href = vkSearchUrl;
                if (linkEl) linkEl.href = vkSearchUrl;

                if (finalArtUrl) {
                    artEl.src = finalArtUrl;
                    artEl.onload = () => { artEl.style.opacity = '1'; };
                } else {
                    artEl.style.opacity = '0';
                }
                infoContainer.style.opacity = '1';
            }, 300);
        }

        if (lastIsPlaying !== finalIsPlaying) {
            lastIsPlaying = finalIsPlaying;
            if (finalIsPlaying) {
                statusEl.textContent = "LISTENING NOW";
                statusEl.className = "text-[10px] font-bold text-green-500 uppercase tracking-wider mb-0.5 animate-pulse smooth-all";
            } else {
                statusEl.textContent = "LAST LISTENED TRACK";
                statusEl.className = "text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5 smooth-all";
            }
        }

    } catch (error) {
        console.error("LastFM Error:", error);
    }
}

updateLastFM();
setInterval(updateLastFM, 3000);

// --- DISCORD INTEGRATION (LANYARD) ---
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
        } catch (e) { }
    };
    ws.onclose = () => { setTimeout(connectLanyard, 5000); };
    setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ op: 3 })); }, 30000);
}

function animateChange(element, newValue, type = 'text') {
    if (type === 'image' && element.src === newValue) return;
    if (type === 'html' && element.innerHTML === newValue) return;
    if (type === 'text' && element.textContent === newValue) return;

    element.style.opacity = '0';
    setTimeout(() => {
        if (type === 'image') element.src = newValue;
        else if (type === 'html') element.innerHTML = newValue;
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

    if (!data.discord_user) return;

    const user = data.discord_user;
    const userAvatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512` : `https://cdn.discordapp.com/embed/avatars/0.png`;
    const statusColor = statusColors[data.discord_status] || statusColors.offline;

    if (mainAvatar) {
        if (mainAvatar.src !== userAvatarUrl) {
            mainAvatar.src = userAvatarUrl;
            mainAvatar.onload = () => mainAvatar.classList.remove('opacity-0');
        }

        const avatarRing = document.getElementById('avatar-ring');
        if (avatarRing) {
            avatarRing.classList.remove('online', 'idle', 'dnd', 'offline');
            avatarRing.classList.add(data.discord_status);
        }
    }

    if (usernameEl) usernameEl.textContent = user.global_name || user.username;
    if (discordCard) discordCard.classList.remove('hidden');

    if (discordTimer) clearInterval(discordTimer);
    discordTimer = null;
    currentActivityStart = null;
    activityStateStr = "";

    let newTitleHTML = "";
    let newLargeImage = "";
    let isSquareImage = false;
    let showDot = true;
    let dotContent = "";
    let dotClass = "";

    if (data.listening_to_spotify) {
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
        if (largeIcon?.startsWith('mp:')) largeIcon = largeIcon.replace('mp:', 'https://media.discordapp.net/');
        else if (largeIcon) largeIcon = `https://cdn.discordapp.com/app-assets/${game.application_id}/${largeIcon}.png`;
        newLargeImage = largeIcon || userAvatarUrl;
        isSquareImage = !!largeIcon;

        if (game.assets?.small_image) {
            let smallIcon = game.assets.small_image;
            if (smallIcon.startsWith('mp:')) smallIcon = smallIcon.replace('mp:', 'https://media.discordapp.net/');
            else smallIcon = `https://cdn.discordapp.com/app-assets/${game.application_id}/${smallIcon}.png`;

            showDot = true;
            dotClass = "absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full border-2 border-[#111] bg-[#111] flex items-center justify-center overflow-hidden transition-all duration-300";
            dotContent = `<img src="${smallIcon}" class="w-full h-full object-cover">`;
        } else {
            showDot = !isSquareImage;
            if (showDot) {
                dotClass = "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#111] transition-all duration-300";
                dotContent = "";
            }
        }

        activityStateStr = game.details || game.state || "In Game";

        if (game.timestamps && game.timestamps.start) {
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

    if (cardAvatar.className !== avatarClass) cardAvatar.className = avatarClass;

    if (cardAvatar.src !== newLargeImage) {
        cardAvatar.style.opacity = '0';
        setTimeout(() => {
            cardAvatar.src = newLargeImage;
            cardAvatar.style.opacity = '1';
        }, 200);
    }

    if (!currentActivityStart) animateChange(subTextEl, activityStateStr, 'text');

    if (showDot) {
        statusDot.style.display = 'flex';
        statusDot.className = dotClass;
        if (dotContent) {
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
    if (!el || !currentActivityStart) return;

    const diff = Date.now() - currentActivityStart;
    let timeStr = "";

    if (diff > 0) {
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        timeStr = `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} elapsed`;
    }

    if (activityStateStr) el.innerHTML = `${activityStateStr} &bull; ${timeStr}`;
    else el.textContent = timeStr;
}

// --- CURSOR TRAIL ---
let trailElements = [];
let trailInitialized = false;

function initCursorTrail() {
    const trail = window.CONFIG.cursorTrail;
    if (!trail || !trail.enabled) return;
    if (isMobile) return; // Disable on mobile

    // Wait for "click to enter" before creating elements
    const checkAndCreate = () => {
        if (entered && !trailInitialized) {
            trailInitialized = true;
            createTrail();
        } else if (!entered) {
            requestAnimationFrame(checkAndCreate);
        }
    };
    checkAndCreate();
}

function createTrail() {
    const trail = window.CONFIG.cursorTrail;
    const trailColor = trail.color || '#00ff88';
    const trailSize = trail.size || 4;
    const trailLength = trail.length || 10;
    const container = document.body;

    for (let i = 0; i < trailLength; i++) {
        const el = document.createElement('div');
        el.style.cssText = `
            position: fixed;
            width: ${trailSize - i * 0.3}px;
            height: ${trailSize - i * 0.3}px;
            background: ${trailColor};
            border-radius: 50%;
            pointer-events: none;
            z-index: 99999;
            opacity: ${1 - i / trailLength};
            transition: transform 0.1s ease-out;
        `;
        container.appendChild(el);
        trailElements.push(el);
    }

    let mouseX = 0, mouseY = 0;
    const positions = Array(trailLength).fill({ x: 0, y: 0 });

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        if (!entered || trailElements.length === 0) {
            requestAnimationFrame(animate);
            return;
        }

        positions.unshift({ x: mouseX, y: mouseY });
        positions.pop();

        trailElements.forEach((el, i) => {
            const pos = positions[i + 1] || positions[i];
            el.style.left = pos.x + 'px';
            el.style.top = pos.y + 'px';
        });

        requestAnimationFrame(animate);
    }
    animate();
}

// --- CURSOR CLICK EFFECT ---
function initClickEffect() {
    const effect = window.CONFIG.cursorClickEffect;
    if (!effect || !effect.enabled) return;
    if (isMobile) return; // Disable on mobile

    const color = effect.color || '#00ff88';
    const count = effect.count || 8;

    document.addEventListener('click', (e) => {
        if (!entered) return; // Only show after "click to enter"

        const x = e.clientX;
        const y = e.clientY;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const angle = (Math.PI * 2 / count) * i;
            const velocity = 50 + Math.random() * 50;

            particle.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: 6px;
                height: 6px;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                z-index: 99999;
                transform: translate(-50%, -50%);
            `;
            document.body.appendChild(particle);

            const destX = x + Math.cos(angle) * velocity;
            const destY = y + Math.sin(angle) * velocity;

            particle.animate([
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: `translate(${destX - x - 3}px, ${destY - y - 3}px) scale(0)`, opacity: 0 }
            ], {
                duration: 400 + Math.random() * 200,
                easing: 'ease-out'
            }).onfinish = () => particle.remove();
        }
    });
}

// --- CURSOR ---
function initCursor() {
    const cursor = window.CONFIG.cursor;
    const hotspot = window.CONFIG.cursorHotspot || { x: 0, y: 0 };
    const linkCursor = window.CONFIG.cursorLink;
    const linkHotspot = window.CONFIG.cursorLinkHotspot || { x: 0, y: 0 };

    // Main cursor
    if (!cursor || cursor === 'default') {
        document.body.style.cursor = 'default';
    } else if (cursor.includes('<svg')) {
        const encoded = encodeURIComponent(cursor).replace(/'/g, '%27').replace(/"/g, '%22');
        document.body.style.cursor = `url('data:image/svg+xml;utf8,${encoded}') ${hotspot.x} ${hotspot.y}, auto`;
    } else {
        document.body.style.cursor = `url('${cursor}') ${hotspot.x} ${hotspot.y}, auto`;
    }

    // Link cursor
    if (linkCursor && linkCursor !== 'default') {
        const linkStyle = linkCursor.includes('<svg')
            ? `url('data:image/svg+xml;utf8,${encodeURIComponent(linkCursor).replace(/'/g, '%27').replace(/"/g, '%22')}') ${linkHotspot.x} ${linkHotspot.y}, pointer`
            : `url('${linkCursor}') ${linkHotspot.x} ${linkHotspot.y}, pointer`;

        // More general selector including iziToast dynamically created elements
        document.body.querySelectorAll('a, button, [onclick], .cursor-pointer, .iziToast, .iziToast *, [class*="iziToast"]').forEach(el => {
            el.style.cursor = linkStyle;
        });
    }
}

// --- CONFIG INITIALIZATION ---
function initConfig() {
    const config = window.CONFIG;
    if (!config) return;

    document.title = config.title || "My Bio";
    const nickEl = document.getElementById('main-nickname');
    if (nickEl) nickEl.textContent = config.nickname || "User";

    const bgPoster = document.getElementById('bg-poster');
    const bgVideo = document.getElementById('video-bg');
    if (bgPoster && config.background.poster && bgPoster.getAttribute('src') !== config.background.poster) {
        bgPoster.src = config.background.poster;
    }
    if (bgVideo && config.background.video) {
        const source = bgVideo.querySelector('source');
        if (source && source.getAttribute('src') !== config.background.video) {
            source.src = config.background.video;
            bgVideo.load();
        }
    }

    const socialContainer = document.getElementById('social-links');
    if (socialContainer && config.social_links) {
        const fragment = document.createDocumentFragment();
        config.social_links.forEach(link => {
            const a = document.createElement('a');
            a.href = link.url;
            a.target = "_blank";
            a.className = "group relative w-10 h-10 rounded-lg bg-white/5 hover:bg-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]";

            if (link.icon) {
                const i = document.createElement('i');
                i.className = `${link.icon} text-2xl transition-transform duration-300 scale-75 group-hover:scale-[0.9] inline-block`;
                a.appendChild(i);
            } else if (link.svg) {
                a.innerHTML = link.svg;
            }
            fragment.appendChild(a);
        });
        socialContainer.innerHTML = '';
        socialContainer.appendChild(fragment);
    }
}

// --- UTILS ---
function initTypewriter() {
    const phrases = window.CONFIG.typewriter_phrases || ["Into the Void"];
    const typeEl = document.getElementById('typewriter');
    let phraseIndex = 0, charIndex = 0, isDeleting = false, typeSpeed = 100;

    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
    let currentPrefix = '';

    // Calculate available width and set prefix for mobile
    function updatePrefix() {
        if (!isMobile || !typeEl) return;
        const containerWidth = typeEl.parentElement?.offsetWidth || 200;
        const charWidth = 8; // approximate character width in px
        const maxChars = Math.floor(containerWidth / charWidth) - 3; // -3 for "..."

        if (maxChars < 10) {
            currentPrefix = '...';
        } else {
            currentPrefix = '';
        }
    }

    function type() {
        if (!typeEl) return;
        const currentPhrase = phrases[phraseIndex];
        let displayText;

        if (isDeleting) {
            displayText = currentPhrase.substring(0, charIndex - 1);
            charIndex--; typeSpeed = 50;
        } else {
            displayText = currentPhrase.substring(0, charIndex + 1);
            charIndex++; typeSpeed = 150;
        }

        // Add prefix on mobile if phrase is too long
        if (isMobile && displayText.length > 10) {
            typeEl.textContent = currentPrefix + displayText;
        } else {
            typeEl.textContent = displayText;
        }

        if (!isDeleting && charIndex === currentPhrase.length) {
            isDeleting = true; typeSpeed = 2000;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false; phraseIndex = (phraseIndex + 1) % phrases.length;
            typeSpeed = 500;
            updatePrefix(); // Update prefix for new phrase
        }
        setTimeout(type, typeSpeed);
    }

    updatePrefix();
    type();
}

function setGreeting() {
    const h = new Date().getHours();
    const el = document.getElementById('time-greeting');
    if (el) {
        if (h < 6) el.textContent = "System Alert: Humans detected in sleeping state. 😴";
        else if (h < 12) el.textContent = "Initializing morning protocols... 🌅";
        else if (h < 18) el.textContent = "System operating in daylight mode. ☀️";
        else el.textContent = "Switching to night vision mode. 🌙";
    }
}

function initTooltips() {
    const cursorTooltip = document.getElementById('link-cursor-tooltip');
    const tooltipText = document.getElementById('tooltip-text');
    if (!cursorTooltip) return;
    document.addEventListener('mousemove', (e) => {
        cursorTooltip.style.left = `${Math.min(e.clientX + 15, window.innerWidth - 150)}px`;
        cursorTooltip.style.top = `${Math.min(e.clientY + 15, window.innerHeight - 40)}px`;
    });
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('mouseenter', () => {
            if (!window.matchMedia('(hover: hover)').matches) return;
            let url = link.href;
            try {
                if (url.includes(window.location.hostname)) tooltipText.textContent = "SYSTEM ACTION";
                else {
                    let displayUrl = new URL(url).hostname + new URL(url).pathname;
                    displayUrl = displayUrl.replace('www.', '');
                    if (displayUrl.length > 25) displayUrl = displayUrl.substring(0, 25) + '...';
                    tooltipText.textContent = ">> " + displayUrl;
                }
            } catch (e) { tooltipText.textContent = "LINK"; }
            cursorTooltip.style.opacity = '1';
        });
        link.addEventListener('mouseleave', () => { cursorTooltip.style.opacity = '0'; });
    });
}

const contextMenu = document.getElementById('custom-context-menu');
let linkToCopy = null;

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!contextMenu) return;
    const link = e.target.closest('a');
    document.getElementById('context-copy-text').textContent = link ? "Copy Link Address" : "Copy Site Link";
    linkToCopy = link ? link.href : window.location.href;
    contextMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 160)}px`;
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.display = 'flex';
});

document.addEventListener('click', () => { if (contextMenu) contextMenu.style.display = 'none'; });

// Toast helper with spam protection
function showToast(options) {
    const now = Date.now();
    if (now - lastToastTime < TOAST_COOLDOWN) return;
    lastToastTime = now;
    iziToast.show(options);
}

function handleCopyAction() {
    const url = linkToCopy || window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showToast({ theme: 'dark', icon: 'fa-solid fa-link', title: 'Link', message: 'Copied', position: 'topCenter', progressBarColor: '#00ff88', timeout: 2000 });
    });
}

// Click animation
function animateClick(el) {
    el.style.transform = 'scale(0.9)';
    setTimeout(() => {
        el.style.transform = 'scale(1)';
    }, 100);
}

function copyDiscordNick() {
    const el = document.getElementById('discord-card');
    if (el) {
        el.style.transform = 'scale(0.95)';
        setTimeout(() => el.style.transform = 'scale(1)', 100);
    }

    const copyId = window.CONFIG.discord.copy_id || "User";
    navigator.clipboard.writeText(copyId).then(() => {
        showToast({ theme: 'dark', icon: 'fa-brands fa-discord', title: 'Discord', message: 'ID is copied', position: 'topCenter', progressBarColor: '#5865F2', timeout: 2000 });
    });
}

function copyLastFM() {
    const song = document.getElementById('fm-song-title').textContent;
    const artist = document.getElementById('fm-artist').textContent;
    if (!song || song === "Searching..." || song === "No Data") return;
    navigator.clipboard.writeText(`${song} - ${artist}`).then(() => {
        showToast({ theme: 'dark', icon: 'fa-solid fa-music', title: 'Last.fm', message: 'Track name copied', position: 'topCenter', progressBarColor: '#b90000', timeout: 2000 });
    });
}

function copySpec(type) {
    let value = '';
    switch (type) {
        case 'cpu': value = document.getElementById('mobile-spec-cpu').textContent; break;
        case 'gpu': value = document.getElementById('mobile-spec-gpu').textContent; break;
        case 'ram': value = document.getElementById('mobile-spec-ram').textContent; break;
        case 'storage': value = document.getElementById('mobile-spec-storage').textContent; break;
        case 'platform': value = window.CONFIG.system_specs?.platform || 'WINDOWS'; break;
    }
    if (value && value !== '...') {
        navigator.clipboard.writeText(value).then(() => {
            showToast({ theme: 'dark', icon: 'fa-solid fa-microchip', title: type.toUpperCase(), message: value + ' copied', position: 'topCenter', progressBarColor: '#22c55e', timeout: 2000 });
        });
    }
}

// --- REBOOT SYSTEM ---
function triggerReboot() {
    if (contextMenu) contextMenu.style.display = 'none';
    mainContainer.classList.add('ui-hidden');
    if (techStats) techStats.classList.add('ui-hidden');

    const screen = document.getElementById('reboot-screen');
    const logs = document.getElementById('reboot-logs');
    screen.classList.remove('hidden');
    screen.style.display = 'flex';

    const lines = [
        "SYSTEM_HALT: CRITICAL_PROCESS_DIED",
        "Collecting error info...",
        "Dumping physical memory to disk: 100%",
        "Clearing cache...",
        "Contacting admin...",
        "Initiating system restart..."
    ];

    let delay = 0;
    lines.forEach((line) => {
        setTimeout(() => {
            const p = document.createElement('div');
            p.textContent = `> ${line}`;
            logs.appendChild(p);
            window.scrollTo(0, document.body.scrollHeight);
        }, delay);
        delay += 300 + Math.random() * 400;
    });

    setTimeout(() => { location.reload(); }, delay + 500);
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Insert') {
        mainContainer.classList.toggle('ui-hidden');
        if (techStats) techStats.classList.toggle('ui-hidden');
        if (videoBg) {
            const vignette = document.getElementById('vignette');
            if (mainContainer.classList.contains('ui-hidden')) {
                videoBg.classList.add('video-clean');
                if (vignette) vignette.style.opacity = '0';
            } else {
                videoBg.classList.remove('video-clean');
                if (vignette) vignette.style.opacity = '1';
            }
        }
    }
});

// --- SMOOTH VIDEO LOAD ---
const videoElement = document.getElementById('video-bg');

function onVideoReady() {
    videoElement.classList.add('video-ready');
}

if (videoElement.readyState >= 3) onVideoReady();
else {
    videoElement.addEventListener('canplaythrough', onVideoReady, { once: true });
    videoElement.addEventListener('loadeddata', onVideoReady, { once: true });
}
