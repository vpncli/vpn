/** Russian translations, keyed by the English source string. */

export const ru: Record<string, string> = {
  // Banner / app
  "manage every VPN from your terminal": "управляй всеми VPN из терминала",

  // Main menu
  Logs: "Логи",
  Language: "Язык",
  "Select language": "Выберите язык",

  // Services dashboard
  "Disconnect all": "Отключить всё",
  "Enable xray": "Включить xray",
  "Enable {name}": "Включить {name}",
  "Add xray server": "Добавить xray-сервер",
  "↵ enable {name}": "↵ включить {name}",
  "↵ add xray server": "↵ добавить xray-сервер",
  "⇥ settings": "⇥ настройки",
  Settings: "Настройки",
  "Manage routing": "Управление маршрутами",
  "Add server": "Добавить сервер",
  "Add server or subscription": "Добавить сервер или подписку",
  "↵ connect": "↵ подключить",
  "↵ disconnect": "↵ отключить",
  "↵ active": "↵ активен",
  "↵ switch": "↵ выбрать",
  "⇥ configure": "⇥ настроить",
  servers: "серверов",
  "Tab to pick a server": "Tab — выбрать сервер",
  "⇥ manage routing": "⇥ управление маршрутами",
  "⇥ open": "⇥ открыть",
  "↵ add server": "↵ добавить сервер",
  "↵ add server / subscription": "↵ добавить сервер / подписку",
  "↵ settings": "↵ настройки",
  "↵ add rule": "↵ добавить правило",
  "⌫ remove": "⌫ удалить",
  "↵ toggle": "↵ переключить",
  "↵ select": "↵ выбрать",
  "↵ apply": "↵ применить",
  "Space toggle": "Space отметить",
  "Add rule": "Добавить правило",
  "No rules yet.": "Правил пока нет.",
  "↑↓←→/wasd navigate · q/Esc quit": "↑↓←→/wasd навигация · q/Esc выход",
  "↑↓←→/wasd navigate · q/Esc back": "↑↓←→/wasd навигация · q/Esc назад",
  // Routes summary
  presets: "пресеты",
  direct: "Direct",
  proxy: "Proxy",
  block: "Block",
  "No VPN services detected.": "VPN-сервисы не обнаружены.",
  "disconnecting all…": "отключение всего…",
  "connecting {name}…": "подключение {name}…",
  "disconnecting {name}…": "отключение {name}…",
  // Class chips (tunnel vs proxy)
  "🌐 ALL TRAFFIC": "🌐 ВЕСЬ ТРАФИК",
  "tunnel · captures all OS traffic": "туннель · перехватывает весь трафик ОС",
  "⚡ BY RULES": "⚡ ПО ПРАВИЛАМ",
  "proxy · splits traffic by rules": "прокси · делит трафик по правилам",
  "⇥ servers": "⇥ серверы",
  "⇥ servers & routes": "⇥ серверы и маршруты",
  // Navigation hints
  "↑↓←→/wasd pick · Enter switch · q/Esc back": "↑↓←→/wasd выбор · Enter переключить · q/Esc назад",
  // Context-aware Enter hint
  "↵ disconnect everything": "↵ отключить всё",
  "nothing is connected": "ничего не подключено",

  // Check Point connect form
  "🔐 Connect {name}": "🔐 Подключить {name}",
  "Sign in with your corporate credentials and OTP.": "Войдите с корпоративными учётными данными и OTP.",
  Username: "Логин",
  Password: "Пароль",
  "One-time code (OTP)": "Одноразовый код (OTP)",
  "your password": "ваш пароль",
  "6-digit code": "6-значный код",

  // Power toggle

  // Busy labels
  "adding server…": "добавление сервера…",
  "adding subscription…": "добавление подписки…",
  "activating {name}…": "активация {name}…",
  "removing {name}…": "удаление {name}…",
  "applying presets…": "применение пресетов…",
  "adding {rule}…": "добавление {rule}…",
  "removing {rule}…": "удаление {rule}…",
  "renaming…": "переименование…",

  // Servers
  Servers: "Серверы",
  "+ Add server": "+ Добавить сервер",
  "+ Add server or subscription": "+ Добавить сервер или подписку",
  "↑↓/ws move · Enter open · q/Esc back": "↑↓/ws выбор · Enter открыть · q/Esc назад",
  "★ active": "★ активен",
  "ping…": "пинг…",
  ping: "пинг",
  "pinging…": "пингую…",
  offline: "недоступен",

  // Server detail
  address: "адрес",
  security: "защита",
  "Set active": "Сделать активным",
  Rename: "Переименовать",
  Remove: "Удалить",

  // Rename
  "Rename “{name}”": "Переименовать «{name}»",
  "Rename subscription “{name}”": "Переименовать подписку «{name}»",
  "new name": "новое имя",
  "Rename subscription": "Переименовать подписку",
  "Delete subscription": "Удалить подписку",
  "↵ rename": "↵ переименовать",
  "↵ delete subscription": "↵ удалить подписку",
  "removing subscription…": "удаление подписки…",

  // Add server flow
  "+ Add server — paste a vless:// link": "+ Добавить сервер — вставьте vless:// ссылку",
  "Add a VPN": "Добавить VPN",
  "Single server": "Отдельный сервер",
  Subscription: "Подписка",
  "paste a vless:// link": "вставьте vless:// ссылку",
  "paste a subscription link — adds every server": "вставьте ссылку подписки — добавит все серверы",
  "Paste a vless:// link": "Вставьте vless:// ссылку",
  "Paste a vless:// link or subscription URL": "Вставьте vless:// ссылку или URL подписки",
  "Paste a subscription URL": "Вставьте URL подписки",
  "Name this server": "Название сервера",

  // Routing
  Routing: "Маршруты",
  "bypass the VPN": "мимо VPN",
  "force through VPN": "через VPN",
  "drop traffic": "блокировать",
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

  // Add-rule wizard
  "What should {action}?": "Что должно {action}?",
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
  "q/Esc back": "q/Esc назад",

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

  // Tunnels panel

  // Shared widget hints
  "Enter submit · Esc cancel · Ctrl-U clear": "Enter принять · Esc отмена · Ctrl-U очистить",

  // Update notifier
  "vpn {latest} is available — you have {current}":
    "доступна новая версия vpn {latest} — у вас {current}",
  "update:": "обновитесь:",
};
