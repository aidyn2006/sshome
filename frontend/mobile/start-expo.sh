#!/usr/bin/env bash
# Запускает Expo dev-сервер и показывает QR-код для Expo Go.
#
# Использование:
#   ./start-expo.sh           — LAN-режим (телефон должен быть в той же Wi-Fi сети)
#   ./start-expo.sh tunnel    — туннель через ngrok (работает из любой сети, чуть медленнее)
#
# Адрес бэкенда можно переопределить:
#   EXPO_PUBLIC_API_BASE_URL=https://sshome.almatherm.kz/api ./start-expo.sh

set -euo pipefail
cd "$(dirname "$0")"

# Первый запуск — ставим зависимости
if [ ! -d node_modules ]; then
  echo "[setup] node_modules не найден — устанавливаю зависимости..."
  npm install
fi

MODE_FLAG="--lan"
if [ "${1:-}" = "tunnel" ]; then
  MODE_FLAG="--tunnel"
fi

echo ""
echo "================================================================"
echo "  Запускаю Expo (${MODE_FLAG})."
echo "  Отсканируй QR-код ниже:"
echo "    Android — приложением Expo Go"
echo "    iOS     — обычной камерой"
echo ""
echo "  Если QR не открывается в LAN-режиме (другая сеть / firewall),"
echo "  перезапусти так:  ./start-expo.sh tunnel"
echo "================================================================"
echo ""

npx expo start "$MODE_FLAG" --go
