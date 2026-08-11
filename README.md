# Календарь звонков

[![Actions Status](https://github.com/artemu78/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/artemu78/ai-for-developers-project-386/actions)

Приложение для записи на звонки: API-контракт на TypeSpec и отдельный фронтенд
на React + TypeScript + Vite. Источник правды API находится в [`main.tsp`](main.tsp),
а OpenAPI генерируется из него автоматически.

Контракт описывает:

- единственного заранее заданного владельца календаря без авторизации;
- создание типов событий и просмотр всех предстоящих бронирований владельцем;
- публичный каталог типов событий и свободных слотов для гостя;
- запись гостя в 14-дневном окне без регистрации;
- запрет пересекающихся бронирований, в том числе для разных типов событий.

## Установка и проверка

```bash
npm install
npm run check
npm run build
npm run test:e2e
```

Сгенерированная спецификация появится в `generated/openapi/openapi.yaml`.

## Фронтенд

```bash
npm run dev
```

По умолчанию Vite проксирует запросы `/api` на `http://localhost:3000`. Для
другого адреса бэкенда задайте `API_PROXY_TARGET` при запуске dev-сервера либо
`VITE_API_URL` при сборке. Интерфейс включает публичную запись гостя и панель
владельца с предстоящими встречами и созданием типов встреч.

## GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` собирает и публикует фронтенд при
каждом обновлении ветки `main`. В настройках репозитория GitHub Pages должен
использовать источник **GitHub Actions**.

## Бэкенд в AWS Lambda

Node.js-бэкенд реализует маршруты из `main.tsp`, хранит типы встреч и записи в
памяти Lambda-контейнера и возвращает `409 Conflict`, если выбранный слот уже
занят. Инфраструктура описана в AWS SAM-файле `template.yaml`.

```bash
sam build
sam deploy --guided
```

После развёртывания значение `ApiUrl` из outputs стека можно передать фронтенду
как `VITE_API_URL` при сборке. Так как хранилище находится в памяти, данные могут
сброситься после холодного старта или масштабирования Lambda, что соответствует
ограничению текущего шага проекта.

Текущий стек `call-calendar-backend` развёрнут в `us-east-1`, а GitHub Pages
workflow уже собирает фронтенд с адресом этого API.

## Интеграционные проверки и релизы

Основной путь бронирования описан в [`docs/user-scenarios.md`](docs/user-scenarios.md)
и проверяется Playwright в настоящем браузере. Workflow
`.github/workflows/e2e.yml` запускает статические, серверные и e2e-проверки для
pull request и после изменений в `main`.

Сообщения коммитов должны соответствовать Conventional Commits; правила для
разработчиков и агентов зафиксированы в [`AGENTS.md`](AGENTS.md). После попадания
таких коммитов в `main` workflow `.github/workflows/release-please.yml` создаёт
или обновляет release-PR с новой версией и `CHANGELOG.md`.
