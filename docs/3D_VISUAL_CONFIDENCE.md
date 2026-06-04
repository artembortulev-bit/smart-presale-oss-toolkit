# Track V: 3D Visual Confidence

## Цель
Track V усиливает демо и доверие менеджера через ограниченный, но настоящий 3D слой.
Это не массовая 3D-оцифровка каталога и не новый редактор площадок.

## Канонический demo-ready SKU
Единственный SKU, который считается demo-ready в Track V:

- `СКП.О.021 Bank with stairs`
- route: `/catalog/skeyt-park/skpo021-skpo021-oborudovanie-dlya-skeyt-parka-bank-with-stairs`
- showcase: `/showcase/3d-visual-confidence`
- asset rule: только опубликованный real OBJ asset с MTL и annotation manifest

`ЭКО.ГК006` остается только QA candidate. Он не входит в demo-ready flow до отдельного QA-подтверждения или стабильной browser-safe конвертации.

## No-proxy policy
В demo/showcase mode запрещен тихий fallback на proxy/procedural 3D.

Если real asset не готов или не грузится, интерфейс должен показать честное состояние:

`3D unavailable / asset not ready`

Обычный каталог может сохранять технический fallback, но Track V success criteria на него не опираются.

## V2 scene preset
V2 использует один детерминированный showcase preset:

- участок: `10 x 8 м`
- placement: `X 5 / Y 4`
- rotation: `0°`
- footprint: `5.3 x 4.8 м`
- safety zone: `7.3 x 6.8 м`
- camera: fixed position/target/FOV
- controls: orbit, zoom, pan
- overlay: fixed footprint/safety colors

Эта сцена является visual proof, а не полноценным 3D editor.

## V3
V3 proposal visual pack отложен.

Не вставлять в КП fake-render, proxy-render или нестабильный screenshot flow.
V3 можно начинать только после отдельного подтверждения стабильного visual artifact из real scene.

## Проверка
Команда:

```powershell
cmd /c npm run verify:3d-visual-confidence
```

Проверяет:

- canonical SKU существует в generated catalog;
- real OBJ asset и MTL доступны в `public`;
- annotation manifest существует;
- viewer spec использует real OBJ;
- material/hotspot matchers резолвятся в ожидаемые узлы;
- scene preset не изменил bounds/placement/camera controls;
- missing asset не проходит readiness;
- `ЭКО.ГК006` остается QA candidate;
- showcase viewer имеет честный no-proxy unavailable state.
