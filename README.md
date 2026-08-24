# 👾 engi // system — Personal Bio Link

<div align="center">

[![Russian](https://img.shields.io/badge/lang-ru-red.svg?style=for-the-badge)](#)
[![English](https://img.shields.io/badge/lang-en-blue.svg?style=for-the-badge)](https://github.com/engix3/mybio-rework/blob/main/README.en.md)

![Preview](https://raw.githubusercontent.com/engix3/mybio-rework/refs/heads/main/screenshot.webp?20260214)

> **Футуристичный био-хаб в стиле терминала.**  
> Продвинутая интеграция с Discord и Last.fm, анимированные интерфейсы и кинематографичная атмосфера.

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)

---

### 🔗 [Открыть демонстрацию](https://engi-bio.vercel.app/)

---

</div>

## 💎 Особенности

### 🚀 Технологии и Визуал
*   **Стек:** HTML5, **Tailwind CSS v4**, Vanilla JavaScript.
*   **Aesthetics:** Эффект матового стекла (Glassmorphism), динамический свет (Spotlight), анимации появления элементов.
*   **Interactive Background:** Плавный переход от статичного постера к видео-фону для быстрой загрузки.
*   **Cinematic Mode:** Нажмите `INSERT` (на ПК), чтобы скрыть интерфейс и насладиться фоном.

### 🔌 Живые интеграции (Real-time)
*   **Discord (через Lanyard):**
    *   Живой статус, аватар и никнейм.
    *   Отображение текущей активности/игры.
    *   Цветовая индикация границ аватара в зависимости от статуса.
*   **Last.fm + iTunes API:**
    *   Синхронизация прослушиваемого трека в реальном времени.
    *   **HD-обложки:** Автоматический поиск обложек высокого качества (600x600) в iTunes, если Last.fm отдает «мыло».
    *   Быстрые ссылки для поиска трека в **VK**.

### 🛠 Системные фишки
*   **Security Overlay:** Интерактивный экран входа с «биометрической проверкой».
*   **Custom Context Menu:** Авторское контекстное меню при клике правой кнопкой мыши.
*   **System Reboot:** Секретная функция перезагрузки системы (через меню или горячие клавиши) с имитацией логов терминала.
*   **Typing Effect:** Динамические фразы под никнеймом, настраиваемые в конфиге.

---

## ⚙️ Настройка за 5 минут

### 1. Подготовка
Нажмите кнопку **Fork** в верхней части страницы, чтобы создать свою копию репозитория.

### 2. Конфигурация (config.js)
Все настройки вынесены в файл `config.js`. Отредактируйте следующие поля:

```javascript
window.CONFIG = {
    nickname: "ВАШ_НИК",
    discord: {
        user_id: "123456789012345678", // Ваш Discord ID
        copy_id: "ваш_тег"           // Что скопируется при клике
    },
    lastfm: {
        username: "user",             // Ваш логин Last.fm
        api_key: "ваш_ключ"           // Получить на last.fm/api
    }
    // ... и другие настройки (фон, ссылки, фразы)
};
```

> [!IMPORTANT]
> Чтобы статус Discord работал, вы должны находиться на сервере [Lanyard Discord](https://discord.gg/lanyard).

### 3. Медиа
*   Положите видео в папку `video/` и укажите путь в `background.video` конфигурации.
*   Для современных браузеров можно дополнительно указать лёгкую WebM-версию в `background.video_webm`; MP4 останется резервным форматом.
*   Обновите `image/bg-poster.webp` (скриншот первого кадра видео) для эффекта бесшовной загрузки.

### 4. Деплой
Рекомендуется использовать **Vercel**. Просто подключите свой репозиторий, и сайт будет готов.

### 5. Проверки качества
После клонирования репозитория установите служебные зависимости командой `npm ci`, затем запустите `npm run quality`. Команда проверяет синтаксис JavaScript, правила ESLint и базовые регрессионные тесты. Те же проверки автоматически запускаются для изменений в GitHub.

---

## 👨‍💻 Автор и благодарности

*   **Разработка:** [engi](https://github.com/engix3)
*   **Инструменты:** Tailwind CSS, FontAwesome, iziToast.
*   **AI Support:** Kilo Code (Gemini / Qwen) — логика API и рефакторинг.
https://vsllm.com/i/3RjQ
---

<div align="center">

**[LICENSE: MIT](file:///LICENSE)**  
*System Status: ALL SYSTEMS OPERATIONAL* 🟢

</div>
