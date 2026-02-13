# 👾 engi // system — Personal Bio Link

<div align="center">

[![Russian](https://img.shields.io/badge/lang-ru-red.svg?style=for-the-badge)](https://github.com/engix3/mybio-rework/blob/main/README.md)
[![English](https://img.shields.io/badge/lang-en-blue.svg?style=for-the-badge)](#)

![Preview](https://raw.githubusercontent.com/engix3/mybio-rework/refs/heads/main/screenshot.webp?20260214)

> **Futuristic bio-hub in a terminal style.**  
> Advanced integration with Discord and Last.fm, animated interfaces, and a cinematic atmosphere.

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)

---

### 🔗 [Open Demo](https://engi-bio.vercel.app/)

---

</div>

## 💎 Features

### 🚀 Technology & Visuals
*   **Stack:** HTML5, **Tailwind CSS v4**, Vanilla JavaScript.
*   **Aesthetics:** Glassmorphism, dynamic spotlight, smooth entry animations.
*   **Interactive Background:** Seamless transition from static poster to video background for fast loading.
*   **Cinematic Mode:** Press `INSERT` (on PC) to hide the UI and enjoy the background.

### 🔌 Live Integrations (Real-time)
*   **Discord (via Lanyard):**
    *   Live status, avatar, and nickname.
    *   Current activity/game display.
    *   Dynamic avatar border color based on status.
*   **Last.fm + iTunes API:**
    *   Real-time track synchronization.
    *   **HD Artwork:** Automatic HD cover search (600x600) via iTunes API if Last.fm provides low-res images.
    *   Quick links to find tracks on **VK**.

### 🛠 System Perks
*   **Security Overlay:** Interactive login screen with "biometric verification".
*   **Custom Context Menu:** Unique right-click menu.
*   **System Reboot:** Secret reboot sequence (via menu or hotkeys) with terminal log simulation.
*   **Typing Effect:** Dynamic phrases under the nickname, configurable via `config.js`.

---

## ⚙️ 5-Minute Setup

### 1. Preparation
Click the **Fork** button at the top of the page to create your own copy of the repository.

### 2. Configuration (config.js)
All settings are moved to `config.js`. You don't need to touch the main code. Edit the following fields:

```javascript
window.CONFIG = {
    nickname: "YOUR_NICKNAME",
    discord: {
        user_id: "123456789012345678", // Your Discord ID
        copy_id: "your_tag"           // Text to copy on click
    },
    lastfm: {
        username: "user",             // Your Last.fm username
        api_key: "your_key"           // Get it at last.fm/api
    }
    // ... other settings (background, links, phrases)
};
```

> [!IMPORTANT]
> For Discord status to work, you must be a member of the [Lanyard Discord] (https://discord.gg/lanyard) server.

### 3. Media
*   Place your video in the `video/` folder and set the path in the config.
*   Update `image/bg-poster.webp` (a screenshot of the first frame of the video) for a seamless loading effect.

### 4. Deployment
**Vercel** is recommended. Just connect your repository, and the site is ready.

---

## 👨‍💻 Author & Credits

*   **Development:** [engi](https://github.com/engix3)
*   **Tools:** Tailwind CSS, FontAwesome, iziToast.
*   **AI Support:** Kilo Code (Gemini / Qwen) — API logic and refactoring.

---

<div align="center">

**[LICENSE: MIT](file:///LICENSE)**  
*System Status: ALL SYSTEMS OPERATIONAL* 🟢

</div>
