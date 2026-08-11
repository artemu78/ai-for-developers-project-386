# Календарь звонков

[![Actions Status](https://github.com/artemu78/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/artemu78/ai-for-developers-project-386/actions)

Design First API-контракт сервиса записи на звонки. Источник правды находится в
[`main.tsp`](main.tsp), а OpenAPI генерируется из него автоматически.

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
```

Сгенерированная спецификация появится в `generated/openapi/openapi.yaml`.
