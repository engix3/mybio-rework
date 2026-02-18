const DISCORD_ID = window.CONFIG.discord.user_id;
const LASTFM_USERNAME = window.CONFIG.lastfm.username;
const LASTFM_API_KEY = window.CONFIG.lastfm.api_key;

// Detect mobile immediately (before any init functions)
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);

const overlay = document.getElementById('overlay');
const mainContainer = document.getElementById('main-container');
const videoBg = document.getElementById('video-bg');

let entered = false;
let currentTiltX = 0, currentTiltY = 0;
let targetTiltX = 0, targetTiltY = 0;
let initialGamma = 0, initialBeta = 0;
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

    if (isMobileDevice) {
        const card = document.querySelector('.glass-card');
        if (card) {
            // Destroy vanilla-tilt if it exists
            if (card.vanillaTilt) {
                card.vanillaTilt.destroy();
            }
            // Also remove data-tilt attributes to prevent re-initialization
            card.removeAttribute('data-tilt');
        }
    }

    overlay.style.opacity = '0';

    setTimeout(() => {
        overlay.style.display = 'none';
        mainContainer.classList.remove('hidden');

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
        if (isMobileDevice) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--y', `${e.clientY - rect.top}px`);
    });
}

// --- TECH STATS ---
function initTechStats() {
    // Load system specs from config for mobile popup
    const specs = window.CONFIG.system_specs;
    if (specs) {
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
let spotifyStart = null;
let spotifyEnd = null;

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
    spotifyStart = null;
    spotifyEnd = null;
    lastActivityStateStr = "";
    lastSpotifyArtists = "";

    let newTitleHTML = "";
    let newLargeImage = "";
    let isSquareImage = false;
    let showDot = true;
    let dotContent = "";
    let dotClass = "";

    // Games have priority over Spotify
    const game = data.activities && data.activities.length > 0
        ? data.activities.find(a => a.type === 0)
        : null;

    if (game) {
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
    else if (data.listening_to_spotify) {
        // Show "Listening" in gray + song name in white + green Spotify icon
        newTitleHTML = `Listening <span class="text-white font-bold truncate">${data.spotify.song}</span> <i class="fa-brands fa-spotify text-green-400 text-[10px] ml-0.5"></i>`;
        activityStateStr = data.spotify.artist;
        newLargeImage = data.spotify.album_art_url;
        isSquareImage = true;
        showDot = false;

        // Setup Spotify time tracking
        if (data.spotify.timestamps) {
            spotifyStart = data.spotify.timestamps.start;
            spotifyEnd = data.spotify.timestamps.end;
            updateSpotifyString();
            discordTimer = setInterval(updateSpotifyString, 1000);
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

    if (!currentActivityStart && !spotifyStart) animateChange(subTextEl, activityStateStr, 'text');

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

let lastActivityStateStr = "";

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

    const newContent = activityStateStr ? `${activityStateStr} &bull; ${timeStr}` : timeStr;

    // Only animate if activity state changed (not just time)
    if (lastActivityStateStr !== activityStateStr) {
        lastActivityStateStr = activityStateStr;
        el.style.opacity = '0';
        setTimeout(() => {
            el.innerHTML = newContent;
            el.style.opacity = '1';
        }, 200);
    } else {
        el.innerHTML = newContent;
    }
}

let lastSpotifyArtists = "";

function updateSpotifyString() {
    const el = document.getElementById('discord-sub-text');
    if (!el || !spotifyStart || !spotifyEnd) return;

    const now = Date.now();
    const elapsed = now - spotifyStart;
    const total = spotifyEnd - spotifyStart;

    // Format time as mm:ss
    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const elapsedStr = formatTime(elapsed);
    const totalStr = formatTime(total);
    const newContent = activityStateStr ? `${activityStateStr} &bull; ${elapsedStr} / ${totalStr}` : `${elapsedStr} / ${totalStr}`;

    // Only animate if artists changed (not just time)
    if (lastSpotifyArtists !== activityStateStr) {
        lastSpotifyArtists = activityStateStr;
        el.style.opacity = '0';
        setTimeout(() => {
            el.innerHTML = newContent;
            el.style.opacity = '1';
        }, 200);
    } else {
        // Just time update - no animation
        el.innerHTML = newContent;
    }
}

// --- CURSOR TRAIL ---
let trailElements = [];
let trailInitialized = false;

function initCursorTrail() {
    const trail = window.CONFIG.cursorTrail;
    if (!trail || !trail.enabled) return;
    if (isMobileDevice) return; // Disable on mobile

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
    const smoothness = trail.smoothness || 0.15;
    const container = document.body;

    for (let i = 0; i < trailLength; i++) {
        const el = document.createElement('div');
        const size = trailSize * (1 - i / trailLength);
        el.style.cssText = `
            position: fixed;
            width: ${size}px;
            height: ${size}px;
            background: ${trailColor};
            border-radius: 50%;
            pointer-events: none;
            z-index: 99999;
            opacity: ${1 - i / trailLength};
            will-change: transform;
            transform: translate(-50%, -50%);
        `;
        container.appendChild(el);
        trailElements.push({ el, x: 0, y: 0 });
    }

    let mouseX = 0, mouseY = 0;
    const trailPositions = trailElements.map(() => ({ x: 0, y: 0 }));

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        if (!entered || trailElements.length === 0) {
            requestAnimationFrame(animate);
            return;
        }

        // Smooth follow with lerp - first element follows cursor
        trailPositions[0].x += (mouseX - trailPositions[0].x) * smoothness;
        trailPositions[0].y += (mouseY - trailPositions[0].y) * smoothness;

        // Each subsequent element follows the previous one
        for (let i = 1; i < trailLength; i++) {
            const prev = trailPositions[i - 1];
            const curr = trailPositions[i];
            curr.x += (prev.x - curr.x) * smoothness;
            curr.y += (prev.y - curr.y) * smoothness;
        }

        // Update element positions
        trailElements.forEach((item, i) => {
            const pos = trailPositions[i];
            item.el.style.left = pos.x + 'px';
            item.el.style.top = pos.y + 'px';
        });

        requestAnimationFrame(animate);
    }
    animate();
}

// --- CURSOR CLICK EFFECT ---
function initClickEffect() {
    const effect = window.CONFIG.cursorClickEffect;
    if (!effect || !effect.enabled) return;
    if (isMobileDevice) return; // Disable on mobile

    const colors = effect.colors || ['#00ff88'];
    const count = effect.count || 8;
    const sizeVariation = effect.sizeVariation !== false;
    const spread = effect.spread !== false;

    document.addEventListener('click', (e) => {
        if (!entered) return; // Only show after "click to enter"

        const x = e.clientX;
        const y = e.clientY;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');

            // Random color from array
            const color = colors[Math.floor(Math.random() * colors.length)];

            // Random size (4-8px)
            const size = sizeVariation ? 4 + Math.random() * 4 : 6;

            // Angle with optional spread variation
            const baseAngle = (Math.PI * 2 / count) * i;
            const angle = spread ? baseAngle + (Math.random() - 0.5) * 0.5 : baseAngle;

            // Random velocity
            const velocity = 40 + Math.random() * 60;

            particle.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                z-index: 99999;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 ${size}px ${color};
            `;
            document.body.appendChild(particle);

            const destX = x + Math.cos(angle) * velocity;
            const destY = y + Math.sin(angle) * velocity;

            particle.animate([
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: `translate(${destX - x}px, ${destY - y}px) scale(0) rotate(${Math.random() * 360}deg)`, opacity: 0 }
            ], {
                duration: 500 + Math.random() * 300,
                easing: 'cubic-bezier(0, .9, .57, 1)'
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
            a.rel = "noopener noreferrer";
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
    if (!typeEl) return;

    let phraseIndex = 0, charIndex = 0, isDeleting = false, typeSpeed = 100;
    let scrollOffset = 0;
    let pauseCount = 0;
    const PAUSE_DURATION = 5; // Show full text for ~5 cycles (about 400ms)

    // Check if mobile using CSS media query (works in devtools too)
    function isMobileView() {
        return window.matchMedia('(max-width: 640px)').matches;
    }

    // Get max characters for current screen width
    function getMaxChars() {
        if (!isMobileView()) return 100;
        const width = window.innerWidth;
        if (width < 380) return 15;
        if (width < 480) return 18;
        if (width < 640) return 22;
        return 50;
    }

    function type() {
        if (!typeEl) return;
        const currentPhrase = phrases[phraseIndex];
        const maxChars = getMaxChars();
        let displayText;

        // On mobile with long phrases, use scrolling effect
        if (isMobileView() && currentPhrase.length > maxChars) {
            if (!isDeleting) {
                // Type until we reach maxChars
                if (charIndex < maxChars) {
                    charIndex++;
                    displayText = currentPhrase.substring(0, charIndex);
                    typeSpeed = 150;
                } else if (scrollOffset < currentPhrase.length - maxChars) {
                    // Scroll through the text
                    scrollOffset++;
                    displayText = currentPhrase.substring(scrollOffset, scrollOffset + maxChars);
                    typeSpeed = 100;
                } else {
                    // Pause at the end - keep showing the last view
                    pauseCount++;
                    displayText = currentPhrase.substring(scrollOffset, scrollOffset + maxChars);
                    if (pauseCount >= PAUSE_DURATION) {
                        isDeleting = true;
                        pauseCount = 0;
                    }
                    typeSpeed = 100;
                }
            } else {
                // Delete
                if (scrollOffset > 0) {
                    scrollOffset--;
                    displayText = currentPhrase.substring(scrollOffset, scrollOffset + maxChars);
                    typeSpeed = 100;
                } else if (charIndex > 0) {
                    charIndex--;
                    displayText = currentPhrase.substring(0, charIndex);
                    typeSpeed = 50;
                } else {
                    // Move to next phrase
                    isDeleting = false;
                    phraseIndex = (phraseIndex + 1) % phrases.length;
                    scrollOffset = 0;
                    charIndex = 0;
                    pauseCount = 0;
                    typeSpeed = 500;
                }
            }
        } else {
            // Normal typing for desktop or short phrases
            if (isDeleting) {
                charIndex--;
                typeSpeed = 50;

                if (charIndex === 0) {
                    isDeleting = false;
                    phraseIndex = (phraseIndex + 1) % phrases.length;
                    typeSpeed = 500;
                }
            } else {
                charIndex++;
                typeSpeed = isMobileView() ? 100 : 150;
            }

            displayText = currentPhrase.substring(0, charIndex);

            if (!isDeleting && charIndex >= currentPhrase.length) {
                isDeleting = true;
                typeSpeed = 2000;
            }
        }

        typeEl.textContent = displayText;
        setTimeout(type, typeSpeed);
    }

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

function copyAllSpecs() {
    const specs = window.CONFIG.system_specs;
    if (!specs) return;

    const allText = `CPU: ${specs.cpu}
GPU: ${specs.gpu}
RAM: ${specs.ram}
SSD: ${specs.storage}
PLATFORM: ${specs.platform || 'WINDOWS'}`;

    navigator.clipboard.writeText(allText).then(() => {
        showToast({
            theme: 'dark',
            icon: 'fa-solid fa-copy',
            title: 'SPECS',
            message: 'All specs copied',
            position: 'topCenter',
            progressBarColor: '#22c55e',
            timeout: 2500
        });
    });
}

// --- REBOOT SYSTEM ---
function triggerReboot() {
    if (contextMenu) contextMenu.style.display = 'none';
    mainContainer.classList.add('ui-hidden');

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
