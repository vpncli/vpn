/** Russian translations, keyed by the English source string. */

export const ru: Record<string, string> = {
  // Banner / app
  "xray VPN manager": "менеджер VPN на xray",
  "intuitive xray VPN manager": "удобный менеджер VPN на xray",

  // Main menu
  "What do you want to do?": "Что вы хотите сделать?",
  "Press Enter to connect": "Нажмите Enter для подключения",
  Status: "Статус",
  "Servers…": "Серверы…",
  "Routing…": "Маршруты…",
  Logs: "Логи",
  Quit: "Выход",
  "active: {name}": "активен: {name}",
  none: "нет",
  Language: "Язык",
  "Select language": "Выберите язык",
  "↑/↓ move · Enter select · q quit": "↑/↓ выбор · Enter выбрать · q выход",

  // Power toggle
  connect: "подключить",
  disconnect: "отключить",

  // Busy labels
  "starting…": "запуск…",
  "stopping…": "остановка…",
  "adding server…": "добавление сервера…",
  "activating {name}…": "активация {name}…",
  "removing {name}…": "удаление {name}…",
  "applying presets…": "применение пресетов…",
  "adding {rule}…": "добавление {rule}…",
  "removing {rule}…": "удаление {rule}…",
  "renaming…": "переименование…",

  // Servers
  Servers: "Серверы",
  "➕ Add server": "➕ Добавить сервер",
  "↑/↓ move · Enter open · Esc back": "↑/↓ выбор · Enter открыть · Esc назад",
  "★ active": "★ активен",
  "ping…": "пинг…",
  offline: "недоступен",

  // Server detail
  address: "адрес",
  security: "защита",
  "Set active": "Сделать активным",
  Rename: "Переименовать",
  Remove: "Удалить",
  Back: "Назад",

  // Rename
  "Rename “{name}”": "Переименовать «{name}»",
  "new name": "новое имя",

  // Add server flow
  "➕ Add server — paste a vless:// link": "➕ Добавить сервер — вставьте vless:// ссылку",
  "Name this server": "Название сервера",

  // Routing
  Routing: "Маршруты",
  "Presets…": "Пресеты…",
  "Direct list": "Direct — мимо VPN",
  "Proxy list": "Proxy — через VPN",
  "Block list": "Block — блокировка",
  "toggle rule bundles": "наборы правил",
  "bypass the VPN": "мимо VPN",
  "force through VPN": "через VPN",
  "drop traffic": "блокировать",
  "Toggle routing presets": "Пресеты маршрутов",
  "Routing presets": "Пресеты маршрутов",
  // Preset titles
  "Russian sites direct": "Рос. сайты — direct",
  "AI via VPN": "ИИ через VPN",
  "Streaming via VPN": "Стриминг через VPN",
  "Block ads": "Блок рекламы",
  "Local & dev direct": "Локалка/dev — direct",
  // Preset descriptions
  "Russian domains & IPs → direct": "Рос. домены и IP → direct",
  "OpenAI, Claude, Gemini → VPN": "OpenAI, Claude, Gemini → VPN",
  "Netflix, YouTube, Spotify → VPN": "Netflix, YouTube, Spotify → VPN",
  "Block ads & trackers": "Блок рекламы и трекеров",
  "Localhost & private nets → direct": "Localhost и приватные сети → direct",
  "Список {target}": "Список {target}",
  "{target} list": "Список: {target}",
  "➕ Add rule": "➕ Добавить правило",
  "Enter removes": "Enter — удалить",

  // Add-rule wizard
  "What should {action}?": "Что должно {action}?",
  "bypass the VPN ": "идти мимо VPN", // (unused guard)
  "go through the VPN": "идти через VPN",
  "be blocked": "блокироваться",
  "🌐 Website / domain": "🌐 Сайт / домен",
  "e.g. youtube.com": "напр. youtube.com",
  "📦 Known service": "📦 Известный сервис",
  "🏳  Country": "🏳  Страна",
  "all IPs of a country": "все IP страны",
  "🔢 IP or subnet": "🔢 IP или подсеть",
  "⌨  Custom rule": "⌨  Своё правило",
  "raw xray syntax": "синтаксис xray",
  "Pick a service": "Выберите сервис",
  "Pick a country": "Выберите страну",
  "Enter a website": "Введите сайт",
  "Enter an IP or subnet": "Введите IP или подсеть",
  "Custom rule (xray syntax)": "Своё правило (синтаксис xray)",
  "🚫 Ads & trackers": "🚫 Реклама и трекеры",
  "🇷🇺 Russian sites": "🇷🇺 Российские сайты",
  Russia: "Россия",
  "United States": "США",
  Germany: "Германия",
  Netherlands: "Нидерланды",
  Finland: "Финляндия",
  "United Kingdom": "Великобритания",
  China: "Китай",
  Japan: "Япония",

  // Logs
  "xray log (last {n})": "лог xray (последние {n})",
  empty: "пусто",
  "Esc back": "Esc назад",

  // Status dashboard
  "VPN status": "Статус VPN",
  "Active server": "Активный сервер",
  Presets: "Пресеты",
  "App proxy env": "Прокси для приложений",
  "Terminal env file": "Env для терминала",
  "🏠 Real IP": "🏠 Реальный IP",
  "probing…": "проверка…",
  unavailable: "недоступно",
  "xray stopped": "xray остановлен",

  // Traffic panel
  "VPN active": "VPN активен",
  "traffic this session": "трафик за сессию",
  Direct: "Напрямую",
  Total: "Итого",
  "locating…": "определение…",

  // Shared widget hints
  "↑/↓ move · Enter select · Esc cancel": "↑/↓ выбор · Enter выбрать · Esc отмена",
  "↑/↓ move · Space toggle · Enter confirm · Esc cancel": "↑/↓ · Space отметить · Enter применить · Esc отмена",
  "Enter submit · Esc cancel · Ctrl-U clear": "Enter принять · Esc отмена · Ctrl-U очистить",
};
