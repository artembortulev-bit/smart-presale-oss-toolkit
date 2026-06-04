# DECISIONS.md

## Ключевые решения по архитектуре и MVP

### 1. Не переписывать проект с нуля
Текущий код уже содержит полезное presale-ядро, import foundation, cost layer, draft proposal pipeline и scene foundation. Задача этапа — не ломать это, а переводить в operational product.

### 2. Operational core важнее визуальной полировки
Главный фокус — persistence, auth, manager workspace, proposal lifecycle и sales handoff. Secondary pages, декоративный UI и “вау”-слой вторичны.

### 3. Prisma schema — целевая operational model
Схема данных уже сильнее, чем текущий runtime. Следующий этап — переводить реальные сценарии с JSON/file stores на Prisma/Postgres, а не плодить новые временные хранилища.

### 4. Presale — это flow, а не экран
Центр продукта:
Client Request → Qualification → Recommendation → Scene → Proposal → Handoff.
Каталог и витрина важны, но не являются сердцем продукта.

### 5. Rule-based логика сейчас правильнее, чем premature AI
Parser, scoring, cost inference и placement heuristics уже дают ценность. До operational core не нужно уводить проект в AI / RAG / vector search.

### 6. 3D развивать только после укрепления process layer
3D registry, lifecycle и scene foundation уже есть. Массовый 3D rollout имеет смысл только после укрепления manager workflow, proposal lifecycle и transactional persistence.

### 7. Каждая доработка должна усиливать коммерческий контур
Если изменение не улучшает qualification, recommendation quality, scene, proposal, manager efficiency или handoff, оно не является приоритетом текущего этапа.
