# UI Gaps Log

_Last updated: 10 Nov 2025_

## Coverage snapshot
- **Shadcn primitives в использовании:** Button, Card, Dialog, Sheet, Navigation Menu, Badge, Input, Label, Select, Checkbox, Toast. Все новые поверхности из блока 4 строятся поверх этих примитивов + композиции (канбан, календари, аналитика) из Card/Grid.
- **Layout shell:** `DashboardPageShell` → App Router страницы с сайдбаром/хедерами; `DashboardPageHeader` задаёт title/meta/description (eyebrow удалён после ревью 11 Nov 2025). `DriverPageShell` зеркалит подход в мобильном приложении (единыe `space-y-5`, max-width 480px). Страницы календарей и документ-вьюера подключены к shell и наследуют общие отступы.
- **Login / landing:** `/login` теперь использует стандартные Card/Button/Input/Select + tailwind utility-отступы без bespoke классов, градиент вынесен в inline-style токен.
- **Login redirect (11 Nov 2025):** Кнопка `Sign in` маршрутизирует пользователя в App Router по выбранной роли (`operations → /fleet-calendar`, `sales → /fleet-calendar`, `ceo → /exec/dashboard`, `driver → /driver/tasks`) с валидацией email, пока Supabase Auth не подключен.
- **Modals / drawers:** документ-вьюер, Zoho OAuth sheet, sales workspace панели собраны через `Sheet`/`Dialog` API + Card контент.
- **Fleet detail refactor (11 Nov 2025):** `/fleet/[carId]` использует модульные компоненты (`VehicleProfileHero`, `VehicleRemindersCard`, `VehicleMaintenanceCard`, и т.д.) в `components/fleet`, поэтому новые поверхности должны переиспользовать эти карточки вместо adhoc-разметки.

## Spacing & composition правила
- Горизонтальные поля: `main` в `app/(dashboard)/layout.tsx` использует `px-4 lg:px-10`; внутренние секции не дублируют `px-*`, только `p-*` у Card.
- Вертикальный ритм: page-level контейнеры = `DashboardPageShell` (`space-y-6`), карточные разделы = `gap-4`/`space-y-4`. Если нужен другой шаг (мобильные driver-страницы) — использовать `DriverPageShell` (`space-y-5`) вместо произвольных значений.
- Заголовки страниц: `DashboardPageHeader` принимает `title`, `meta`, `description`; любые новые страницы обязаны использовать компонент и настраивать бейджики через `meta`, а не отдельные `div`. Eyebrow удалён, чтобы топ-блоки оставались минималистичными.
- Календари: допустим кастомный CSS для сетки, но цвета/бордеры должны ссылаться на Tailwind токены (`hsl(var(--...))`).

## Известные отклонения
| Surface | Причина | План закрытия |
| --- | --- | --- |
| Fleet calendar board | Основная сетка реализована вручную (CSS Grid) из-за сложных слоёв/tooltip — shadcn таблицы здесь не подходят. | Оставить как есть до реальной интеграции Realtime; токены/отступы уже приведены к теме. |
| Sales workspace вкладки | Используется собственная вкладочная панель, т.к. нужно одновременно показывать большое количество секций + AI колонки. | Рассмотреть миграцию на shadcn Tabs после parity sign-off. |

## Notes
- Любые новые поверхности должны сперва появиться здесь, если не удаётся собрать их на shadcn primitives.
- После закрытия всех отклонений обновлять `docs/TODO.md` (блок 4) и удалять соответствующие записи из таблицы.
