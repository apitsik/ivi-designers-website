# ivi designers website

Сайт команды дизайнеров ivi.

## Запуск

```
npm install
npm run dev
```

Шрифты IVI Sans в репозиторий не входят. Положите `IVI_Sans_Base_Regular.woff2` и `IVI_Sans_Base_Medium.woff2` в `public/fonts/`, иначе сайт покажет системный шрифт.

## Деплой

Сайт статичный. Собирать на машине, где есть `public/fonts/` (в репозиторий они не входят):

```
git pull
npm install
npm run build
```

Содержимое `dist/` заливается в корень сайта на сервере. Сайт должен лежать в корне домена (пути абсолютные: `/images/…`); для подпапки собирать с `vite build --base /подпапка/`.

Готовый конфиг nginx (https, gzip, кэш, заголовки) — `deploy/nginx.conf`, инструкция в его шапке.

Новые картинки перед коммитом жать: `npm run media:compress`.

## Деплой

Сайт статичный. Собрать на маке (`npm run build`, шрифты в `public/fonts/` должны лежать), залить содержимое `dist/` в корень домена. Конфиг nginx с кэшем, сжатием и HTTPS — в `deploy/nginx.conf`, инструкция в его шапке.

Новые картинки перед коммитом жмутся командой `npm run media:compress`.
