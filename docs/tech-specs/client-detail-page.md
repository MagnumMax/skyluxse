# Client Detail View (/clients/[id])

## 1. Purpose & Success Criteria
- **Goal**: give sales и finance полное досье клиента прямо в веб-приложении, чтобы закрывать долги, готовить бронирования и вести коммуникации без переключений в Kommo.
- **Done when**:
  - Пользователь видит актуальные данные (outstanding, документы, платежи, уведомления) в одном экране.
  - CTA («Open in Kommo», «Create Booking», «Send Reminder») доступны и правильно указывают маршруты.
  - Пустые состояния и skeleton’ы закрывают >95% кейсов (нет документов, нет платежей, нет уведомлений).
  - В PR приложены скриншоты desktop + mobile; `pnpm lint && pnpm typecheck && pnpm test` проходят.

## 2. Personas & Primary Scenarios
| Persona | Scenario | KPI |
| --- | --- | --- |
| Sales manager | Проверяет статус документов перед выдачей авто, отправляет напоминание из уведомлений, открывает клиента в Kommo. | <2 мин на поиск статуса, ≥1 контекстное действие |
| Finance specialist | Сверяет outstanding, историю платежей, отмечает просрочки, переходит в бронирование. | точность сумм, быстрый переход к оплате |
| Customer operations | Читает последние уведомления, историю аренды и предпочтения (язык/каналы). | сокращение ручных вопросов клиенту |

## 3. UX Layout & States
```
┌───────────────────────────────────────────────────────────────────────────────┐
| Header: Client name + segment/status chips + Outstanding widget + Kommo CTA   |
| Metadata badges: Phone • Email • Gender • Nationality                         |
| Audit strip: Created/Updated with actors                                     |
|                                                                               |
| [Left 2/3]                                                                   | [Right 1/3]
| ┌ Documents & Rentals card ───────────────────┐      ┌ Payments card ────────┐
| | Tabs or stacked sections:                   |      | Payments list +        |
| | - Documents (status, expiry, view link)     |      | Notifications feed     |
| | - Recent rentals (dates, car, link)         |      |                        |
| └─────────────────────────────────────────────┘      └───────────────────────┘
|                                                                               |
| AI Panel (insights, prompts, quick actions)                                   |
└───────────────────────────────────────────────────────────────────────────────┘
```
- **Loading**: Skeletons for header, badges, cards (use shadcn Skeleton components or CSS shimmer).
- **Empty data**: Friendly copy in Canadian English, e.g. «No documents uploaded yet»; provide CTA stub («Request Documents»).
- **Error**: Если Supabase вернул ошибку → `notFound()` (404) или компактный error state в карточке (перезагрузка).
- **Audit strip**: две подписи под контактами, каждая показывает дату/время в формате `MMM d, yyyy · HH:mm` и подпись `by <actor>`; когда актор неизвестен — отображаем `—`.

## 4. Data Requirements
| Block | Fields | Source | Notes |
| --- | --- | --- | --- |
| Header | `name`, `segment`, `status`, `outstanding`, `kommoContactUrl` | `getLiveClientById` | Outstanding формат «AED 12,345». Segment/Status отображаются как badges. |
| Contact badges | `phone`, `email`, `gender`, `residencyCountry` | `Client` entity | Поддержать локализацию значений (напр. «Not specified»). |
| Audit metadata | `createdAt`, `updatedAt`, resolved actors (`createdBy`, `updatedBy`) | `clients.created_at/updated_at/created_by/updated_by` | Две подписи под контактами: «Created … · by …» и «Last updated … · by …». |
| Documents | `Client.documents[]` (`name`, `status`, `expiry`, `id`) | `getLiveClientById` via document links | Отображаем до 5; добавить CTA «View All» (будущий роут). |
| Rentals | `Client.rentals[]` (`bookingId`, `bookingCode`, `carName`, `startDate`, `endDate`, `totalAmount`) | Bookings join | Сумма символом «AED», даты в `DD MMM` (например, 02 Sep). |
| Payments | `Client.payments[]` (`amount`, `status`, `type`, `channel`, `date`) | booking_invoices | Показывать максимум 4, сорт DESC по дате. |
| Notifications | `Client.notifications[]` (`subject`, `channel`, `date`) | `client_notifications` | Дата → `new Date().toLocaleString()`, указать канал label. |
| Preferences | `Client.preferences.notifications`, `language`, `timezone` | `clients` | Используем в AI-панели и подсказках. |
| AI panel | `Client` summary fields + `preferences` | AI provider (stub) | Передаём имя, сегмент, outstanding, предпочтения. |

### Potential schema deltas
- Если потребуется credit score / risk flag → добавить поля `clients.credit_score`, `clients.risk_level` (миграция + docs/schema) **позже**. Сейчас ограничиваемся существующей моделью.

### 4.1 Data audit (11 Nov 2025)
- `Client` тип (`lib/domain/entities.ts:95-138`) покрывает все поля для UI: `status` из `tier`, `segment` нормализуется `formatSegment`, `residencyCountry` и `gender` приходят напрямую.
- `getLiveClients` (`lib/data/live-data.ts:335-420`) агрегирует документы, аренды, платежи и уведомления, но усекaет списки (`slice(0,5)` для документов; `slice(0,4)` для payments/notifications). Для `/clients/[id]` нужен fetch без лимитов или переключатель `full=true`.
- `preferences` собираются из `preferred_channels`, `preferred_language`, `timezone`; таблица `client_preferences` пока не подключена. Если понадобятся доп. флаги (VIP concierge и т.п.), потребуется join + расширение `ClientPreferences`.
- Outstanding/платежи строятся на `booking_invoices`; `mapInvoiceToPayment` берёт `amount`, `status`, `invoice_type` (как channel) и `issued_at`. Для aging buckets понадобится доп. поле или расчёт.
- Notifications (`client_notifications`) обрабатываются `mapNotificationRow`, дата = `sent_at`. Желательно дополнительно сортировать в UI, чтобы избежать расхождений при отсутствии ORDER BY в запросе.
- AI панель использует только `preferences.notifications`; язык/таймзона уже есть, но не передаются в компонент — учесть при обновлении `ClientAiPanel`.
- `getLiveClientById` фильтрует результат `getLiveClients()`. Это дорого при росте базы и не позволяет гибко управлять кэшем. План: реализовать `getLiveClientByIdFromDb` с прямым `eq("id", clientId)` запросом и возможностью выбирать стратегию кэширования (`cache: "no-store"` для чувствительных сумм).
- В схеме появились `clients.created_by` и `clients.updated_by` (uuid → `staff_accounts`), поэтому UI больше не зависит от эвристики «Kommo import» — если актор не найден, просто отображаем `—`.

## 5. Data Flow & Caching
1. `app/(dashboard)/clients/[clientId]/page.tsx` — серверный компонент.
2. Вызов `getLiveClientById(clientId)` (уже кэширован через `cache`).  
3. **Caching**: функция возвращает все клиенты; при растущем объёме потребуется отдельный `getLiveClientByIdFromDb` с `eq("id", clientId)` и `cache: "no-store"` для чувствительных сумм. Записать TODO в коде.
4. При `null` → `notFound()`.  
5. Дочерние компоненты получают готовый `Client`. Критичные суммы (outstanding) не форматировать на клиенте повторно (только отображение).  
6. Любые CTA, требующие клиентских действий (например, AI генерация), реализуются клиентскими компонентами со state.

### 5.1 Fetching strategy (planned)
- **Новый helper**: `getLiveClientByIdFromDb(clientId: string)` → прямой Supabase запрос к `clients`, `booking_invoices`, `document_links`, `client_notifications`. Позволяет убрать лимиты и сократить объём данных. Реализация повторяет текущие мапперы, но без глобального cache.
- **Кэширование**: для суммы outstanding и платежей используем `fetch` с `cache: "no-store"` (см. Next.js App Router best practices) либо `revalidateTag("client:"+id)` после платежных операций.
- **Локальные оптимизации**: 
  - `getLiveClients()` остаётся для списков и может работать с `cache()`/ISR.
  - В detail-странице разрешаем streaming: загрузить клиента на сервере, затем передать в клиентские панели (например, AI) через props без доп. запросов.
- **TODO**: добавить telemetry/logging вокруг Supabase вызовов (включая timing) и fallback для `isMissingTableError`, аналогично `fetchMaintenanceJobRows`.

## 6. Component Breakdown
| Component | Type | Responsibility |
| --- | --- | --- |
| `SalesClientWorkspace` (existing) | Server | Обёртка + layout. Расширяется новыми секциями и prop’ами. |
| `ClientSummaryCard` | Server | Хедер, meta badges, CTA «Open in Kommo», «Create Booking». |
| `DocumentList` | Client/Server (no state) | Отображает документы, статусы, expiry, кнопка «View document». |
| `RentalList` | Server | Недавние аренды с `Link` на `/bookings/[bookingId]?view=operations`. |
| `PaymentPanel` | Server | Платежи (amount/status/type/channel/date), fallback «No payments recorded». |
| `NotificationFeed` | Client (optional) | Scrollable список уведомлений. Поддержать «Load more» (будущее). |
| `ClientAiPanel` (existing) | Client | Обновить prop’ы (добавить preferred language/timezone). |
| `SectionCard` (utility) | Server | Общий каркас с border/heading, чтобы не дублировать markup. |

## 7. States & Interactions
- **Actions**:
  - `Open in Kommo` → `client.kommoContactUrl`.
  - `Create Booking` → `/bookings/new?clientId=<id>` (stub, можно `Link` с TODO).
  - `Send Reminder` (future) → кнопка в Payments или Notifications, пока disabled.
- **Empty states**: строки с иконкой + текст (Canadian English), например «No notifications have been sent yet».
- **Responsiveness**: mobile stack (grid → single column), text wraps <320px.
- **Accessibility**: semantic headings (`h1` для имени, `h2` для секций), aria-labels для кнопок, readable contrast.

## 8. Testing Strategy
- **Unit**: форматтеры (`formatCurrency`, `formatDateRange`), компоненты без данных (snapshot). Инструмент: `node --test` + `@testing-library/react` (если уже подключён).
- **Integration**: добавить тест на страницу (рендер с mock client, проверка ключевых секций).
- **Manual**:
  1. Client с полным набором данных → проверить все списки.
  2. Client без документов/платежей → empty states.
  3. Broken Kommo URL → кнопка скрыта.
  4. Mobile viewport (Chrome devtools 375px) → layout без горизонтального скролла.
- **CI**: `pnpm lint`, `pnpm typecheck`, `pnpm test`.

## 9. Task Breakdown (Incremental)
1. **Spec & scaffolding (current)** – документ, UX outline, TODO markers.
2. **Data audit** – убедиться, что `getLiveClientById` возвращает всё нужное; при необходимости расширить `Client` тип и mapper (Unit tests).  
3. **Page structure** – обновить `SalesClientWorkspace`, добавить каркасные секции + placeholders.  
4. **Documents & Rentals section** – реализовать списки, ссылки, empty states.  
5. **Payments & Notifications panel** – добавить карточку, форматирование сумм/дат.  
6. **AI panel enhancements** – передать preferences, расширить prompt/UX.  
7. **State handling** – skeletons, error boundaries (при необходимости).  
8. **Testing & QA** – автоматические тесты + ручной чеклист.  
9. **Docs & PR** – обновить `/docs/schemas` при изменении данных, приложить скриншоты.

## 10. Risks & Follow-ups
- **Performance**: текущее `getLiveClients()` грузит до 500 клиентов и фильтрует в памяти → может стать bottleneck. План: выделить специализированный запрос и включить `cache: "no-store"` для чувствительных сумм.
- **Data freshness**: Outstanding/Payments отображают агрегаты из `booking_invoices`. Нужна договорённость по обновлению ETL (см. PRD §3.6).  
- **AI privacy**: перед передачей данных в AI убедиться, что нет персональных идентификаторов без согласия. Возможно, ограничить через feature flag.
- **Kommo link**: использовать env `KOMMO_BASE_URL`; fallback скрывает кнопку.

---
_Последнее обновление: 11 Nov 2025_
