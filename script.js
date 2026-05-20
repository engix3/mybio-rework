const CONFIG = window.CONFIG || {};
const DISCORD_ID = CONFIG.discord?.user_id || "";
const LASTFM_USERNAME = CONFIG.lastfm?.username || "";
const LASTFM_API_KEY = CONFIG.lastfm?.api_key || "";

// Detect mobile immediately (before any init functions)
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
const prefersReducedMotion = (window.MyBioSystem && window.MyBioSystem.prefersReducedMotion)
    ? window.MyBioSystem.prefersReducedMotion
    : () => (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

const overlay = document.getElementById('overlay');
const mainContainer = document.getElementById('main-container');
const videoBg = document.getElementById('video-bg');

let entered = false;
let currentTiltX = 0, currentTiltY = 0;
let targetTiltX = 0, targetTiltY = 0;
let initialGamma = 0, initialBeta = 0;

// Initialize Services
initConfig();
initSourceCodeLink();
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
        initProjectsPopup();

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
    const specs = CONFIG.system_specs;
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

            // Animate title
            const specTitle = mobileSpecsContent.querySelector('.spec-title');
            if (specTitle) {
                specTitle.classList.remove('visible');
                setTimeout(() => specTitle.classList.add('visible'), 50);
            }

            // Staggered animation for spec rows
            const specRows = mobileSpecsContent.querySelectorAll('.spec-row');
            specRows.forEach((row, index) => {
                row.classList.remove('visible');
                setTimeout(() => {
                    row.classList.add('visible');
                }, 150 + index * 80);
            });

            // Animate copy button
            const copyBtn = mobileSpecsContent.querySelector('.spec-copy-btn');
            if (copyBtn) {
                copyBtn.classList.remove('visible');
                setTimeout(() => copyBtn.classList.add('visible'), 150 + specRows.length * 80 + 100);
            }
        };

        const closePopup = () => {
            // Hide all animated elements
            const specTitle = mobileSpecsContent.querySelector('.spec-title');
            const specRows = mobileSpecsContent.querySelectorAll('.spec-row');
            const copyBtn = mobileSpecsContent.querySelector('.spec-copy-btn');

            if (specTitle) specTitle.classList.remove('visible');
            specRows.forEach(row => row.classList.remove('visible'));
            if (copyBtn) copyBtn.classList.remove('visible');

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

// --- ALBUM ART API HELPERS (Deezer via Vercel API, MusicBrainz, iTunes) ---

// Deezer API - via Vercel serverless function (no CORS issues)
async function searchDeezerArt(artist, track) {
    const query = `${artist} ${track}`;

    try {
        // Use Vercel API route for Deezer (no CORS issues)
        const res = await fetch(`/api/deezer?q=${encodeURIComponent(query)}`);
        if (!res.ok) return null;

        const data = await res.json();
        if (data.data && data.data.length > 0) {
            const album = data.data[0].album;
            if (album && album.cover_xl) {
                return album.cover_xl; // Highest quality (up to 1000x1000)
            }
            if (album && album.cover_big) {
                return album.cover_big; // 500x500
            }
        }
    } catch (e) { }
    return null;
}

// MusicBrainz API + Cover Art Archive - supports CORS.
// Note: browsers silently ignore a custom User-Agent header on fetch (RFC 7230 forbidden
// header), so MusicBrainz only sees the browser's UA. The previous "User-Agent" override
// was dead code; we omit it now.
async function searchMusicBrainzArt(artist, track) {
    try {
        const query = `artist:"${artist}" AND recording:"${track}"`;
        const res = await fetch(`https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=1`);
        if (!res.ok) return null;
        const data = await res.json();

        if (data.recordings && data.recordings.length > 0) {
            const recording = data.recordings[0];

            if (recording.releases && recording.releases.length > 0) {
                const releaseId = recording.releases[0].id;
                const coverRes = await fetch(`https://coverartarchive.org/release/${releaseId}`);
                if (coverRes.ok) {
                    const coverData = await coverRes.json();
                    if (coverData.images && coverData.images.length > 0) {
                        const frontCover = coverData.images.find(img => img.front) || coverData.images[0];
                        if (frontCover.thumbnails && frontCover.thumbnails.large) {
                            return frontCover.thumbnails.large;
                        }
                        if (frontCover.image) {
                            return frontCover.image;
                        }
                    }
                }
            }
        }
    } catch (e) { }
    return null;
}

// iTunes API - supports CORS
async function searchiTunesArt(artist, track) {
    try {
        const query = `${artist} ${track}`;
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
            // Bump thumbnail (100x100bb / 100x100-99) to a larger variant when possible
            return data.results[0].artworkUrl100.replace(/100x100([-a-z0-9]*)\.(jpg|png|webp)/i, '600x600$1.$2');
        }
    } catch (e) { }
    return null;
}

// In-memory cache: avoid re-fetching album art for tracks we already resolved this session.
const albumArtCache = new Map();
const ALBUM_ART_CACHE_MAX = 100;
function artCacheKey(artist, track) {
    return `${(artist || '').toLowerCase().trim()}::${(track || '').toLowerCase().trim()}`;
}
function rememberArt(key, url) {
    if (!key) return;
    if (albumArtCache.size >= ALBUM_ART_CACHE_MAX) {
        const firstKey = albumArtCache.keys().next().value;
        if (firstKey !== undefined) albumArtCache.delete(firstKey);
    }
    albumArtCache.set(key, url);
}

// Try all sources in order of quality with timeout
async function findBestArt(artist, track, lastFmImage) {
    const key = artCacheKey(artist, track);
    if (key && albumArtCache.has(key)) {
        return albumArtCache.get(key) || lastFmImage || "";
    }

    const timeout = (ms) => new Promise(resolve => setTimeout(() => resolve(null), ms));
    const tryWithTimeout = async (fn, ms = 2000) => {
        try {
            return await Promise.race([fn(), timeout(ms)]);
        } catch {
            return null;
        }
    };

    let result =
        await tryWithTimeout(() => searchDeezerArt(artist, track), 2000) ||
        await tryWithTimeout(() => searchMusicBrainzArt(artist, track), 3000) ||
        await tryWithTimeout(() => searchiTunesArt(artist, track), 2000) ||
        lastFmImage ||
        "";

    rememberArt(key, result);
    return result;
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

        // Cache key combines artist + title so two tracks with the same title don't collide.
        const currentTrackKey = `${currentArtist}::${currentSongName}`;
        if (lastSongName !== currentTrackKey) {
            lastSongName = currentTrackKey;
            playingCounter = 0;

            // Fade out for smooth transition
            infoContainer.style.opacity = '0';
            artEl.style.opacity = '0';

            setTimeout(() => {
                // Show text with smooth animation
                songTitleEl.textContent = currentSongName;
                artistEl.textContent = currentArtist;
                const vkSearchUrl = `https://vk.com/audio?q=${encodeURIComponent(currentSongName + " " + currentArtist)}`;
                songLinkEl.href = vkSearchUrl;
                if (linkEl) linkEl.href = vkSearchUrl;
                infoContainer.style.opacity = '1';

                // Load art asynchronously
                let rawLastFmArt = "";
                if (track.image && track.image.length > 3 && track.image[3]['#text']) rawLastFmArt = track.image[3]['#text'];
                else if (track.image && track.image.length > 2 && track.image[2]['#text']) rawLastFmArt = track.image[2]['#text'];

                const isDefault = rawLastFmArt.includes("2a96cbd8b46e442fc41c2b86b821562f") || rawLastFmArt === "";
                const artCandidate = isDefault ? null : rawLastFmArt;

                // Search for art in background
                findBestArt(currentArtist, currentSongName, artCandidate).then(finalArtUrl => {
                    if (finalArtUrl) {
                        artEl.src = finalArtUrl;
                        artEl.onload = () => { artEl.style.opacity = '1'; };
                    }
                });
            }, 200);
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

// Last.fm polling. Pauses when the tab is hidden so we don't burn API quota or battery.
const LASTFM_POLL_MS = 15000;
let lastfmTimer = null;
function startLastFmPolling() {
    if (lastfmTimer != null) return;
    lastfmTimer = setInterval(updateLastFM, LASTFM_POLL_MS);
}
function stopLastFmPolling() {
    if (lastfmTimer == null) return;
    clearInterval(lastfmTimer);
    lastfmTimer = null;
}
updateLastFM();
startLastFmPolling();
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        stopLastFmPolling();
    } else {
        updateLastFM();
        startLastFmPolling();
    }
});

// --- DISCORD INTEGRATION (LANYARD) ---
let discordTimer = null;
let lanyardHeartbeatInterval = null;
const discordPublicBadgeMap = [
    { flag: 1 << 0, title: 'Discord Staff', icon: 'fa-solid fa-staff-snake', className: 'staff' },
    { flag: 1 << 1, title: 'Partnered Server Owner', icon: 'fa-solid fa-handshake-angle', className: 'partner' },
    { flag: 1 << 2, title: 'HypeSquad Events', icon: 'fa-solid fa-bolt', className: 'hypesquad' },
    { flag: 1 << 3, title: 'Bug Hunter Level 1', icon: 'fa-solid fa-bug', className: 'bug-hunter' },
    { flag: 1 << 6, title: 'HypeSquad Bravery', image: 'image/discord-hypesquad-bravery.png', className: 'house-bravery' },
    { flag: 1 << 7, title: 'HypeSquad Brilliance', icon: 'fa-solid fa-sun', className: 'house-brilliance' },
    { flag: 1 << 8, title: 'HypeSquad Balance', icon: 'fa-solid fa-scale-balanced', className: 'house-balance' },
    { flag: 1 << 9, title: 'Early Supporter', icon: 'fa-solid fa-gem', className: 'early-supporter' },
    { flag: 1 << 14, title: 'Bug Hunter Level 2', icon: 'fa-solid fa-bug-slash', className: 'bug-hunter' },
    { flag: 1 << 17, title: 'Early Verified Bot Developer', icon: 'fa-solid fa-code', className: 'verified-developer' },
    { flag: 1 << 18, title: 'Moderator Programs Alumni', icon: 'fa-solid fa-gavel', className: 'moderator' }
];
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

// Reconnect with exponential backoff (capped) so a Lanyard outage doesn't hammer the endpoint.
const LANYARD_BACKOFF_MIN = 2000;
const LANYARD_BACKOFF_MAX = 60000;
let lanyardBackoff = LANYARD_BACKOFF_MIN;
let lanyardReconnectTimer = null;

function scheduleLanyardReconnect() {
    if (lanyardReconnectTimer) return;
    const delay = lanyardBackoff;
    lanyardReconnectTimer = setTimeout(() => {
        lanyardReconnectTimer = null;
        connectLanyard();
    }, delay);
    // Exponential growth, capped
    lanyardBackoff = Math.min(LANYARD_BACKOFF_MAX, Math.floor(lanyardBackoff * 1.7));
}

function connectLanyard() {
    if (!DISCORD_ID) return;

    const ws = new WebSocket('wss://api.lanyard.rest/socket');
    ws.onopen = () => {
        // Successful connection -> reset backoff so the next failure starts small again
        lanyardBackoff = LANYARD_BACKOFF_MIN;
        ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));

        if (lanyardHeartbeatInterval) clearInterval(lanyardHeartbeatInterval);
        lanyardHeartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ op: 3 }));
            }
        }, 30000);
    };
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.t === 'INIT_STATE' || data.t === 'PRESENCE_UPDATE') updateStatus(data.d);
        } catch (e) { }
    };
    ws.onclose = () => {
        if (lanyardHeartbeatInterval) {
            clearInterval(lanyardHeartbeatInterval);
            lanyardHeartbeatInterval = null;
        }
        scheduleLanyardReconnect();
    };
    ws.onerror = () => {
        if (lanyardHeartbeatInterval) {
            clearInterval(lanyardHeartbeatInterval);
            lanyardHeartbeatInterval = null;
        }
        // onclose will follow and schedule the reconnect.
    };
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
    const cardAvatarWrap = document.getElementById('discord-card-avatar-wrap');
    const cardAvatarDecoration = document.getElementById('discord-card-avatar-decoration');
    const statusDot = document.getElementById('discord-status-dot');
    const usernameEl = document.getElementById('discord-username');
    const badgesEl = document.getElementById('discord-badges');
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

    const avatarDecorationAsset = user.avatar_decoration_data?.asset;
    const avatarDecorationUrl = avatarDecorationAsset
        ? `https://cdn.discordapp.com/avatar-decoration-presets/${avatarDecorationAsset}.png?size=240&passthrough=true`
        : "";

    if (usernameEl) usernameEl.textContent = user.global_name || user.username;
    renderDiscordBadges(badgesEl, user.public_flags || 0);

    // Update Discord tag from Lanyard API (primary_guild)
    const tagEl = document.getElementById('discord-tag');
    const tagIconEl = document.getElementById('discord-tag-icon');
    const tagTextEl = document.getElementById('discord-tag-text');
    if (tagEl && user.primary_guild && user.primary_guild.tag) {
        if (tagTextEl) tagTextEl.textContent = user.primary_guild.tag;
        tagEl.style.display = 'inline-flex';

        // Add guild badge icon if available
        if (tagIconEl && user.primary_guild.badge) {
            const badgeUrl = `https://cdn.discordapp.com/guild-tag-badges/${user.primary_guild.identity_guild_id}/${user.primary_guild.badge}.png?size=64`;
            tagIconEl.innerHTML = `<img src="${badgeUrl}" class="w-3 h-3 rounded-sm object-cover" alt="">`;
            tagIconEl.style.display = 'flex';
        } else if (tagIconEl) {
            tagIconEl.style.display = 'none';
        }
    } else if (tagEl) {
        tagEl.style.display = 'none';
    }

    if (discordCard) discordCard.classList.remove('hidden');

    if (discordTimer) clearInterval(discordTimer);
    discordTimer = null;
    currentActivityStart = null;
    activityStateStr = "";
    spotifyStart = null;
    spotifyEnd = null;
    lastActivityStateStr = "";
    lastSpotifyArtists = "";

    let newStatusPrefix = "";
    let newStatusName = "";
    let newStatusIcon = "";
    let newLargeImage = "";
    let isSquareImage = false;
    let showDot = true;
    let dotContent = "";
    let dotClass = "";
    let dotBackgroundColor = statusColor;
    let useMobileNotch = false;

    // Games have priority over Spotify
    const game = data.activities && data.activities.length > 0
        ? data.activities.find(a => a.type === 0)
        : null;
    const hasPresenceActivity = !!game || !!data.listening_to_spotify;
    syncAvatarDecoration(cardAvatarDecoration, hasPresenceActivity ? "" : avatarDecorationUrl);

    if (game) {
        newStatusPrefix = "Playing";
        newStatusName = game.name;
        newStatusIcon = "";

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
            dotBackgroundColor = 'transparent';
        } else {
            showDot = !isSquareImage;
            if (showDot) {
                dotClass = "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#111] transition-all duration-300 flex items-center justify-center overflow-hidden";
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
        newStatusPrefix = "Listening";
        newStatusName = data.spotify.song;
        newStatusIcon = `<i class="fa-brands fa-spotify text-green-400 text-[10px] ml-0.5"></i>`;
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
        newStatusPrefix = data.discord_status.charAt(0).toUpperCase() + data.discord_status.slice(1);
        newStatusName = "";
        newStatusIcon = "";
        activityStateStr = "Chilling";
        newLargeImage = userAvatarUrl;
        isSquareImage = false;
        showDot = true;
        dotClass = "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#111] transition-all duration-300 flex items-center justify-center overflow-hidden";
        dotContent = "";
    }

    if (showDot && !dotContent && data.active_on_discord_mobile) {
        const mobileGlow = hexToRgbaSafe(statusColor, 0.22);
        dotClass = `absolute -bottom-1 -right-1 w-[18px] h-[18px] transition-all duration-300 flex items-center justify-center overflow-visible`;
        dotContent = `<i class="fa-solid fa-mobile-screen-button text-[13px] leading-none" style="color: ${statusColor}; filter: drop-shadow(0 0 4px ${mobileGlow});"></i>`;
        dotBackgroundColor = "transparent";
        useMobileNotch = true;
    }

    // Update status text elements
    const statusPrefixEl = document.getElementById('discord-status-prefix');
    const statusNameEl = document.getElementById('discord-status-name');
    const statusIconEl = document.getElementById('discord-status-icon');

    animateChange(statusPrefixEl, newStatusPrefix, 'text');
    animateChange(statusNameEl, newStatusName, 'text');
    animateChange(statusIconEl, newStatusIcon, 'html');

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
            statusDot.style.backgroundColor = dotBackgroundColor;
        } else {
            statusDot.innerHTML = '';
            statusDot.style.backgroundColor = dotBackgroundColor;
        }
    } else {
        statusDot.style.display = 'none';
    }

    if (cardAvatarWrap) {
        cardAvatarWrap.classList.toggle('mobile-notch', useMobileNotch);
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
    if (prefersReducedMotion()) return; // Respect user motion preferences

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
    if (prefersReducedMotion()) return; // Respect user motion preferences

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
    const cursor = CONFIG.cursor;
    const hotspot = CONFIG.cursorHotspot || { x: 0, y: 0 };
    const linkCursor = CONFIG.cursorLink;
    const linkHotspot = CONFIG.cursorLinkHotspot || { x: 0, y: 0 };

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
    const config = CONFIG;
    if (!config) return;

    document.title = config.title || "My Bio";
    const nickEl = document.getElementById('main-nickname');
    if (nickEl) nickEl.textContent = config.nickname || "User";

    const bgPoster = document.getElementById('bg-poster');
    const bgVideo = document.getElementById('video-bg');
    const posterSrc = config.background?.poster;
    const videoSrc = config.background?.video;
    if (bgPoster && posterSrc && bgPoster.getAttribute('src') !== posterSrc) {
        bgPoster.src = posterSrc;
    }
    if (bgVideo && videoSrc) {
        // Only swap + reload when the config actually differs from the baked-in HTML
        // source. Avoids the double-download we used to do on every page load.
        const source = bgVideo.querySelector('source');
        if (source && source.getAttribute('src') !== videoSrc) {
            source.src = videoSrc;
            bgVideo.load();
        }
    }

    const socialContainer = document.getElementById('social-links');
    if (socialContainer && config.social_links) {
        // Default neon color if not specified for individual link
        const defaultNeonColor = '#00ff00';
        // Convert hex to rgba for glow
        const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        const fragment = document.createDocumentFragment();
        config.social_links.forEach(link => {
            const a = document.createElement('a');
            a.href = link.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";

            // Use individual neon color or default
            const neonColor = link.neonColor || defaultNeonColor;
            const neonGlow = hexToRgba(neonColor, 0.6);

            a.className = "social-link group relative w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center";
            a.style.setProperty('--brand-color', neonColor);
            a.style.setProperty('--brand-glow', neonGlow);

            if (link.icon) {
                const i = document.createElement('i');
                i.className = `${link.icon} text-xl transition-all duration-300 opacity-70 group-hover:opacity-100 text-white`;
                a.appendChild(i);
            } else if (link.svg) {
                const wrapper = document.createElement('span');
                wrapper.className = 'transition-all duration-300 opacity-70 group-hover:opacity-100';
                wrapper.innerHTML = link.svg;
                a.appendChild(wrapper);
            }
            fragment.appendChild(a);
        });
        socialContainer.innerHTML = '';
        socialContainer.appendChild(fragment);
    }

    initProjects(config.projects);
}

function syncAvatarDecoration(element, url) {
    if (!element) return;

    if (!url) {
        element.removeAttribute('src');
        element.classList.add('opacity-0');
        return;
    }

    if (element.src !== url) {
        element.classList.add('opacity-0');
        element.onload = () => element.classList.remove('opacity-0');
        element.src = url;
    } else {
        element.classList.remove('opacity-0');
    }
}

function renderDiscordBadges(element, publicFlags) {
    if (!element) return;

    const badges = discordPublicBadgeMap.filter(badge => (publicFlags & badge.flag) === badge.flag);
    if (!badges.length) {
        element.innerHTML = '';
        element.style.display = 'none';
        return;
    }

    element.innerHTML = badges
        .map(badge => {
            const content = badge.image
                ? `<img src="${badge.image}" alt="" aria-hidden="true">`
                : badge.svg || `<i class="${badge.icon}"></i>`;
            return `<span class="discord-badge ${badge.className}" title="${badge.title}" aria-label="${badge.title}">${content}</span>`;
        })
        .join('');
    element.style.display = 'inline-flex';
}

function hexToRgbaSafe(hex, alpha) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length !== 7) {
        return `rgba(255, 255, 255, ${alpha})`;
    }

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function initProjects(projectsConfig) {
    const button = document.getElementById('projects-btn');
    const list = document.getElementById('projects-list');

    if (!button || !list || !Array.isArray(projectsConfig) || projectsConfig.length === 0) return;

    const fragment = document.createDocumentFragment();

    projectsConfig
        .filter(project => project && project.enabled !== false)
        .forEach(project => {
            const item = document.createElement('div');
            item.className = 'project-item';
            const projectIcon = project.icon
                ? `<img src="${project.icon}" alt="${project.title || 'Project'} icon" class="project-item-icon">`
                : `<div class="project-item-icon-fallback"><i class="fa-solid fa-shield-halved text-[13px]"></i></div>`;
            item.innerHTML = `
                <div class="project-item-inner">
                    <div class="project-item-header">
                        ${projectIcon}
                        <h4 class="project-item-title">${project.title || 'Project'}</h4>
                    </div>
                    <p class="project-item-description">${project.description || ''}</p>
                    <div class="project-item-actions">
                        <a href="${project.url || '#'}" target="_blank" rel="noopener noreferrer" class="project-item-link" ${project.url ? '' : 'style="display:none;"'}>
                            <span>${project.link_text || 'Open project'}</span>
                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        </a>
                        <a href="${project.secondary_url || '#'}" target="_blank" rel="noopener noreferrer" class="project-item-link secondary" ${project.secondary_url ? '' : 'style="display:none;"'}>
                            <span>${project.secondary_link_text || 'More'}</span>
                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        </a>
                    </div>
                </div>
            `;
            fragment.appendChild(item);
        });

    if (!fragment.childNodes.length) return;

    list.innerHTML = '';
    list.appendChild(fragment);
    button.classList.remove('hidden');
}

function initProjectsPopup() {
    const button = document.getElementById('projects-btn');
    const popup = document.getElementById('projects-popup');
    const content = document.getElementById('projects-content');
    const close = document.getElementById('close-projects-popup');

    if (!button || !popup || !content || !close || button.dataset.bound === 'true') return;

    const openPopup = () => {
        popup.classList.remove('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    };

    const closePopup = () => {
        popup.classList.add('opacity-0', 'pointer-events-none');
        content.classList.add('scale-95');
        content.classList.remove('scale-100');
    };

    button.addEventListener('click', openPopup);
    close.addEventListener('click', closePopup);
    popup.addEventListener('click', (e) => {
        if (e.target === popup) closePopup();
    });

    button.dataset.bound = 'true';
}

// --- UTILS ---
function initTypewriter() {
    const phrases = CONFIG.typewriter_phrases || ["Into the Void"];
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

// Context menu + toast + copy-link live in system.js (shared with 404.html). Re-export the
// toast helper as a local name so the rest of this file keeps using showToast() unchanged.
const showToast = (window.MyBioSystem && window.MyBioSystem.showToast) || function () { };
const handleCopyAction = (window.MyBioSystem && window.MyBioSystem.handleCopyAction) || function () { };

function initSourceCodeLink() {
    const link = document.getElementById('source-code-link');
    const sourceCodeUrl = CONFIG.context_menu?.source_code_url;
    if (link && sourceCodeUrl) link.href = sourceCodeUrl;
}

// Click animation
function animateClick(el) {
    if (!el) return;
    el.classList.remove('click-press');
    void el.offsetWidth;
    el.classList.add('click-press');
    setTimeout(() => {
        el.classList.remove('click-press');
    }, 160);
}

function copyDiscordNick() {
    const el = document.getElementById('discord-card');
    if (el) {
        el.style.transform = 'scale(0.95)';
        setTimeout(() => el.style.transform = 'scale(1)', 100);
    }

    const copyId = CONFIG.discord?.copy_id || "User";
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
    let icon = 'fa-solid fa-microchip';

    switch (type) {
        case 'cpu':
            value = document.getElementById('mobile-spec-cpu').textContent;
            icon = 'fa-solid fa-microchip';
            break;
        case 'gpu':
            value = document.getElementById('mobile-spec-gpu').textContent;
            icon = 'fa-solid fa-display';
            break;
        case 'ram':
            value = document.getElementById('mobile-spec-ram').textContent;
            icon = 'fa-solid fa-memory';
            break;
        case 'storage':
            value = document.getElementById('mobile-spec-storage').textContent;
            icon = 'fa-solid fa-hard-drive';
            break;
        case 'platform':
            value = CONFIG.system_specs?.platform || 'WINDOWS';
            icon = 'fa-brands fa-windows';
            break;
    }
    if (value && value !== '...') {
        navigator.clipboard.writeText(value).then(() => {
            showToast({ theme: 'dark', icon: icon, title: type.toUpperCase(), message: value + ' copied', position: 'topCenter', progressBarColor: '#22c55e', timeout: 2000 });
        });
    }
}

function copyAllSpecs() {
    const specs = CONFIG.system_specs;
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

// Reboot screen lives in system.js (shared with 404.html). Inline onclick="triggerReboot()"
// still works because system.js exposes it as a global.

// Cinematic mode: original was Insert-only; many laptops/Macs lack that key, so accept H too.
// Skip when the user is typing into a form field.
document.addEventListener('keydown', (e) => {
    const isCinematicKey = e.code === 'Insert' || (e.code === 'KeyH' && !e.ctrlKey && !e.metaKey && !e.altKey);
    if (!isCinematicKey) return;
    if (e.target && e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]')) return;

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
