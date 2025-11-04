import { cars } from './cars.js';
import { clients } from './clients.js';
import { bookings } from './bookings.js';
import { drivers } from './drivers.js';

const toKey = (value) => (value === undefined || value === null ? null : String(value));

const normalizedCars = cars.map(car => ({ ...car }));
const normalizedDrivers = drivers.map(driver => ({ ...driver }));
const normalizedClients = clients.map(client => ({ ...client }));

const carsByIdMap = new Map(normalizedCars.map(car => [toKey(car.id), car]));
const clientsByIdMap = new Map(normalizedClients.map(client => [toKey(client.id), client]));

const normalizedBookings = bookings.map(booking => {
  const client = clientsByIdMap.get(toKey(booking.clientId));
  const car = carsByIdMap.get(toKey(booking.carId));
  return {
    ...booking,
    clientId: client?.id ?? booking.clientId ?? null,
    clientName: client?.name || booking.clientName,
    carId: car?.id ?? booking.carId ?? null,
    carName: car?.name || booking.carName
  };
});

const bookingsByClientIdMap = new Map();
normalizedBookings.forEach(booking => {
  const key = toKey(booking.clientId);
  if (!key) return;
  if (!bookingsByClientIdMap.has(key)) bookingsByClientIdMap.set(key, []);
  bookingsByClientIdMap.get(key).push(booking);
});

normalizedClients.forEach(client => {
  const rentals = (bookingsByClientIdMap.get(toKey(client.id)) || [])
    .map((booking) => ({
      bookingId: booking.id,
      status: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
      carId: booking.carId,
      carName: booking.carName,
      totalAmount: booking.totalAmount
    }))
    .sort((a, b) => {
      const aDate = new Date(a.startDate || 0).getTime();
      const bDate = new Date(b.startDate || 0).getTime();
      return bDate - aDate;
    });
  client.rentals = rentals;
});

const bookingsByIdMap = new Map(normalizedBookings.map(booking => [toKey(booking.id), booking]));

export const MOCK_DATA = {
  cars: normalizedCars,
  clients: normalizedClients,
  bookings: normalizedBookings,
  drivers: normalizedDrivers,
  tasks: [
    {
      id: 1,
      title: 'Доставить G-Wagen #1052',
      type: 'delivery',
      category: 'logistics',
      assigneeId: 2,
      status: 'inprogress',
      deadline: '2024-09-15 14:00',
      bookingId: 1052,
      priority: 'High',
      description: 'Prepare vehicle after washing and deliver to client by 14:00. Check fuel level before departure.',
      checklist: [
        { id: 'chk-1', label: 'Проверить уровень топлива', required: true, completed: true },
        { id: 'chk-2', label: 'Загрузить документы клиента', required: true, completed: true },
        { id: 'chk-3', label: 'Отметить выезд', required: true, completed: false }
      ],
      requiredInputs: [
        { key: 'odometer', label: 'Пробег при выдаче (км)', type: 'number' },
        { key: 'fuelLevel', label: 'Уровень топлива (%)', type: 'number' },
        { key: 'photosBefore', label: 'Фото автомобиля до выдачи', type: 'file', multiple: true, accept: 'image/*' },
        { key: 'clientDocsPhotos', label: 'Фото документов клиента', type: 'file', multiple: true, accept: 'image/*' }
      ],
      geo: { pickup: 'SkyLuxse HQ', dropoff: 'Burj Khalifa Residences', routeDistanceKm: 18 },
      sla: { timerMinutes: 30, startedAt: '2024-09-15T12:45:00Z' }
    },
    {
      id: 2,
      title: 'Забрать Huracan #1053',
      type: 'pickup',
      category: 'logistics',
      assigneeId: 1,
      status: 'todo',
      deadline: '2024-09-17 20:00',
      bookingId: 1053,
      priority: 'Средний',
      description: 'Pick up vehicle after rental completion, record mileage and take body photos.',
      checklist: [
        { id: 'chk-4', label: 'Получить подпись клиента', required: true, completed: false },
        { id: 'chk-5', label: 'Сделать фото кузова', required: true, completed: false }
      ],
      requiredInputs: [
        { key: 'odometer', label: 'Пробег при приёме (км)', type: 'number' },
        { key: 'photosAfter', label: 'Фото кузова после аренды', type: 'file', multiple: true, accept: 'image/*' },
        { key: 'fuelLevel', label: 'Уровень топлива (%)', type: 'number' }
      ],
      geo: { pickup: 'Dubai Marina', dropoff: 'SkyLuxse HQ', routeDistanceKm: 24 },
      sla: { timerMinutes: 45, startedAt: null }
    },
    {
      id: 3,
      title: 'Отвезти Continental в химчистку',
      type: 'maintenance',
      category: 'maintenance',
      assigneeId: 3,
      status: 'todo',
      deadline: '2024-09-18 10:00',
      priority: 'Low',
      description: 'Deliver vehicle to partner dry cleaner and arrange pickup for evening.',
      checklist: [
        { id: 'chk-6', label: 'Отметить приемку химчисткой', required: true, completed: false }
      ],
      requiredInputs: [
        { key: 'odoStart', label: 'Пробег при сдаче (км)', type: 'number' },
        { key: 'odoEnd', label: 'Пробег при возврате (км)', type: 'number' }
      ],
      geo: { pickup: 'SkyLuxse HQ', dropoff: 'Premium Detailing', routeDistanceKm: 12 },
      sla: { timerMinutes: 90, startedAt: null }
    },
    {
      id: 4,
      title: 'Детейлинг Huracan #1058',
      type: 'maintenance',
      category: 'maintenance',
      assigneeId: 3,
      status: 'inprogress',
      deadline: '2024-10-22 14:00',
      bookingId: 1058,
      priority: 'Medium',
      description: 'Провести премиум-мойку и подготовить салон перед мероприятием.',
      checklist: [
        { id: 'chk-9', label: 'Проверить салон после мойки', required: true, completed: false },
        { id: 'chk-10', label: 'Добавить напитки и воду', required: false, completed: false }
      ],
      requiredInputs: [
        { key: 'odoStart', label: 'Пробег до сервиса (км)', type: 'number' },
        { key: 'odoEnd', label: 'Пробег после сервиса (км)', type: 'number' }
      ],
      geo: null,
      sla: { timerMinutes: 150, startedAt: '2024-10-22T10:30:00Z' }
    },
    {
      id: 5,
      title: 'Доставить Huracan #1058 на Atlantis',
      type: 'delivery',
      category: 'logistics',
      assigneeId: 2,
      status: 'todo',
      deadline: '2024-10-22 17:00',
      bookingId: 1058,
      priority: 'High',
      description: 'Доставить автомобиль в Atlantis The Palm и прибыть за 30 минут до начала события.',
      checklist: [
        { id: 'chk-11', label: 'Проверить уровень топлива', required: true, completed: false },
        { id: 'chk-12', label: 'Взять комплект документов клиента', required: true, completed: false }
      ],
      requiredInputs: [
        { key: 'odometer', label: 'Пробег при выдаче (км)', type: 'number' },
        { key: 'fuelLevel', label: 'Уровень топлива (%)', type: 'number' },
        { key: 'photosBefore', label: 'Фото автомобиля перед выдачей', type: 'file', multiple: true, accept: 'image/*' }
      ],
      geo: { pickup: 'SkyLuxse HQ', dropoff: 'Atlantis The Palm', routeDistanceKm: 24 },
      sla: { timerMinutes: 90, startedAt: null }
    }
  ],
  calendarEvents: [
    { id: 'EVT-2', carId: 4, type: 'maintenance', title: 'ТО и диагностика', start: '2025-10-20T08:00:00Z', end: '2025-10-20T18:00:00Z', status: 'scheduled', priority: 'medium' },
    { id: 'EVT-3', carId: 3, type: 'repair', title: 'Кузовной ремонт: оценка', start: '2025-10-16T08:00:00Z', end: '2025-10-16T12:00:00Z', status: 'scheduled', priority: 'high' },
    { id: 'EVT-6', carId: 4, type: 'repair', title: 'Ремонт подвески', start: '2025-10-14T07:00:00Z', end: '2025-10-14T16:00:00Z', status: 'scheduled', priority: 'high' },
    { id: 'EVT-7', carId: 3, type: 'maintenance', title: 'ТО-60 после трека', start: '2025-10-15T06:30:00Z', end: '2025-10-15T14:30:00Z', status: 'scheduled', priority: 'high' },
    { id: 'EVT-8', carId: 5, type: 'maintenance', title: 'ТО и диагностика КПП', start: '2025-10-16T08:00:00Z', end: '2025-10-16T17:00:00Z', status: 'scheduled', priority: 'medium' },
    { id: 'EVT-9', carId: 2, type: 'repair', title: 'Ремонт тормозной системы', start: '2025-10-17T07:30:00Z', end: '2025-10-17T15:30:00Z', status: 'scheduled', priority: 'high' },
    { id: 'EVT-10', carId: 1, type: 'maintenance', title: 'Послепрокатное ТО', start: '2025-10-21T08:00:00Z', end: '2025-10-21T17:00:00Z', status: 'scheduled', priority: 'medium' }
  ],
  salesPipeline: {
    stages: [
      { id: 'new', name: 'Новый', probability: 0.1, slaDays: 2, color: 'bg-slate-100 text-slate-700' },
      { id: 'qualified', name: 'Квалифицирован', probability: 0.25, slaDays: 3, color: 'bg-blue-100 text-blue-700' },
      { id: 'proposal', name: 'Коммерческое предложение', probability: 0.45, slaDays: 4, color: 'bg-indigo-100 text-indigo-700' },
      { id: 'negotiation', name: 'Переговоры', probability: 0.65, slaDays: 5, color: 'bg-amber-100 text-amber-700' },
      { id: 'won', name: 'Закрыто (успех)', probability: 1, slaDays: 0, color: 'bg-emerald-100 text-emerald-700' }
    ],
    owners: [
      { id: 'anna', name: 'Анна Коваль' },
      { id: 'max', name: 'Максим Орлов' },
      { id: 'sara', name: 'Sara Khan' }
    ],
    leads: [
      {
        id: 'LD-1201',
        title: 'Anniversary weekend surprise',
        company: 'Mia Al Farsi',
        clientId: 4,
        stage: 'proposal',
        value: 12400,
        currency: 'AED',
        probability: 0.55,
        ownerId: 'anna',
        source: 'Kommo',
        createdAt: '2024-09-05',
        expectedCloseDate: '2024-09-22',
        requestedStart: '2024-09-26T12:00:00Z',
        requestedEnd: '2024-09-29T18:00:00Z',
        fleetSize: 1,
        nextAction: 'Подтвердить маршрут и время доставки авто',
        velocityDays: 14
      },
      {
        id: 'LD-1202',
        title: 'Desert adventure booking',
        company: 'Luca Moretti',
        clientId: 5,
        stage: 'negotiation',
        value: 9800,
        currency: 'AED',
        probability: 0.65,
        ownerId: 'max',
        source: 'Kommo',
        createdAt: '2024-09-01',
        expectedCloseDate: '2024-09-19',
        requestedStart: '2024-09-20T08:00:00Z',
        requestedEnd: '2024-09-23T20:00:00Z',
        fleetSize: 1,
        nextAction: 'Уточнить время возврата и оформить международное ВУ',
        velocityDays: 18
      },
      {
        id: 'LD-1203',
        title: 'Executive evening chauffeur',
        company: 'Chen Wei',
        clientId: 6,
        stage: 'qualified',
        value: 16800,
        currency: 'AED',
        probability: 0.35,
        ownerId: 'sara',
        source: 'Website',
        createdAt: '2024-09-12',
        expectedCloseDate: '2024-09-28',
        requestedStart: '2024-09-21T18:00:00Z',
        requestedEnd: '2024-09-23T23:00:00Z',
        fleetSize: 2,
        nextAction: 'Согласовать маршрут с водителем и подтвердить VIP-набор напитков',
        velocityDays: 5
      },
      {
        id: 'LD-1204',
        title: 'Content weekend supercar',
        company: 'Olivia Carter',
        clientId: 7,
        stage: 'new',
        value: 7200,
        currency: 'AED',
        probability: 0.1,
        ownerId: 'anna',
        source: 'Referral',
        createdAt: '2024-09-16',
        expectedCloseDate: '2024-09-24',
        requestedStart: '2024-09-27T10:00:00Z',
        requestedEnd: '2024-09-29T22:00:00Z',
        fleetSize: 1,
        nextAction: 'Получить контент-план и согласовать доп. страховку на съемки',
        velocityDays: 2
      },
      {
        id: 'LD-1205',
        title: 'Staycation long weekend',
        company: 'Amina Rahman',
        clientId: 8,
        stage: 'won',
        value: 9800,
        currency: 'AED',
        probability: 1,
        ownerId: 'max',
        source: 'Kommo',
        createdAt: '2024-08-20',
        expectedCloseDate: '2024-09-10',
        requestedStart: '2024-09-12T09:00:00Z',
        requestedEnd: '2024-09-15T18:00:00Z',
        fleetSize: 1,
        closedAt: '2024-09-10',
        nextAction: 'Совместно с операциями подтвердить место возврата',
        velocityDays: 21
      }
    ]
  },
  salesWorkspace: {
    leadDetails: {
      'LD-1201': {
        clientId: 4,
        request: {
          start: '2024-09-26T12:00:00Z',
          end: '2024-09-29T18:00:00Z',
          durationDays: 4,
          fleetSize: 1,
          pickup: 'Dubai Hills Residence',
          dropoff: 'Jumeirah Bay Island',
          notes: 'Сюрприз к годовщине, требуется украшение салона и доставка к ресторану.'
        },
        documents: [
          { name: 'Emirates ID', status: 'verified', source: 'Kommo', updatedAt: '2024-09-12T08:30:00Z' },
          { name: 'Driver License', status: 'verified', source: 'Client upload', updatedAt: '2024-09-17T06:20:00Z' },
          { name: 'Кредитная карта (предавторизация)', status: 'pending', source: 'Zoho', updatedAt: '2024-09-18T09:05:00Z' }
        ],
        financials: {
          outstanding: 0,
          upcoming: [
            { label: 'Предавторизация депозита', amount: 3000, status: 'pending', dueDate: '2024-09-24' },
            { label: 'Оставшаяся сумма аренды', amount: 6800, status: 'pending', dueDate: '2024-09-25' }
          ],
          lastSync: '2024-09-18T07:45:00Z'
        },
        vehicleMatches: [
          { carId: 5, fitScore: 95 },
          { carId: 1, fitScore: 89 },
          { carId: 3, fitScore: 82 }
        ],
        resourceConflicts: [
          { type: 'vehicle', severity: 'low', message: 'Ferrari 488 Spider проходит полировку утром 26 сентября.' },
          { type: 'delivery', severity: 'medium', message: 'Нужен водитель для вечерней доставки 26 сентября в 19:00.' }
        ],
        pricing: {
          base: 9800,
          addons: [
            { label: 'Delivery до ресторана', amount: 220 },
            { label: 'Celebration kit (цветы + конфетти)', amount: 180 }
          ],
          discounts: [
            { label: 'VIP программа (5%)', amount: -515 }
          ],
          total: 9685,
          currency: 'AED'
        },
        timeline: [
          { ts: '2024-09-05T08:15:00Z', type: 'system', label: 'Запрос получен из Kommo' },
          { ts: '2024-09-06T10:30:00Z', type: 'call', label: 'Подтверждены даты и пожелания по украшению', owner: 'Анна К.' },
          { ts: '2024-09-12T09:20:00Z', type: 'proposal', label: 'Отправлено предложение с вариантами авто' },
          { ts: '2024-09-18T11:05:00Z', type: 'task', label: 'Ожидаем предавторизацию карты', owner: 'Анна К.' }
        ],
        tasks: [
          { label: 'Получить подтверждение предавторизации', dueDate: '2024-09-23', status: 'in-progress' },
          { label: 'Забронировать слот детейлинга', dueDate: '2024-09-24', status: 'pending' },
          { label: 'Подтвердить адрес доставки', dueDate: '2024-09-25', status: 'upcoming' }
        ],
        offers: [
          { name: 'Sunset Photoshoot', description: 'Фотосессия у Burj Al Arab + водитель на 1 час', price: 520, margin: '32%' },
          { name: 'Anniversary Chauffeur', description: 'Водитель в смокинге + фруктовая тарелка', price: 680, margin: '29%' }
        ],
        playbook: {
          scenario: 'VIP резидент',
          checklist: [
            { label: 'Выбрать персонального консьержа', done: true },
            { label: 'Подтвердить декор и подарки', done: false },
            { label: 'Согласовать пункт возврата', done: false }
          ],
          quickActions: [
            { label: 'Отправить ссылку на оплату', action: 'payment-link' },
            { label: 'Пригласить в клиентский портал', action: 'portal-invite' },
            { label: 'Запросить видео-подтверждение ID', action: 'request-doc' }
          ],
          templates: [
            { channel: 'email', label: 'Подтверждение планов на уикенд', subject: 'SkyLuxse · Ваш праздничный weekend' },
            { channel: 'whatsapp', label: 'Напоминание о доставке', subject: 'WhatsApp: Delivery авто' }
          ]
        },
        analytics: {
          lossReasons: [
            { reason: 'Предавторизация не подтверждена', impact: 'medium' }
          ],
          vehiclePopularity: [
            { carName: 'Ferrari 488 Spider', share: '38%' },
            { carName: 'Rolls-Royce Ghost', share: '26%' }
          ],
          campaignPerformance: [
            { name: 'Kommo VIP поток', winRate: '54%', revenue: 92000 }
          ]
        }
      },
      'LD-1202': {
        clientId: 5,
        request: {
          start: '2024-09-20T08:00:00Z',
          end: '2024-09-23T20:00:00Z',
          durationDays: 4,
          fleetSize: 1,
          pickup: 'Dubai Marina (Marina Gate)',
          dropoff: 'Dubai Marina (Marina Gate)',
          notes: 'Покататься по городу и поездка в пустыню, нужна консультация по страховке и маршруту.'
        },
        documents: [
          { name: 'Passport', status: 'verified', source: 'Kommo', updatedAt: '2024-09-14T15:40:00Z' },
          { name: 'International Driving Permit', status: 'pending-review', source: 'Client upload', updatedAt: '2024-09-15T09:20:00Z' }
        ],
        financials: {
          outstanding: 1200,
          upcoming: [
            { label: 'Депозит', amount: 2000, status: 'pending', dueDate: '2024-09-18' },
            { label: 'Доплата за пакет в пустыню', amount: 450, status: 'pending', dueDate: '2024-09-19' }
          ],
          lastSync: '2024-09-18T08:10:00Z'
        },
        vehicleMatches: [
          { carId: 2, fitScore: 94 },
          { carId: 3, fitScore: 81 }
        ],
        resourceConflicts: [
          { type: 'vehicle', severity: 'low', message: 'G-Wagen возвращается с аренды 19 сентября в 22:00.' }
        ],
        pricing: {
          base: 7200,
          addons: [
            { label: 'Desert safety kit', amount: 450 },
            { label: 'Premium insurance', amount: 380 }
          ],
          discounts: [
            { label: 'Early booking (3%)', amount: -230 }
          ],
          total: 7800,
          currency: 'AED'
        },
        timeline: [
          { ts: '2024-09-01T11:00:00Z', type: 'system', label: 'Лид создан в Kommo' },
          { ts: '2024-09-10T09:45:00Z', type: 'call', label: 'Обсуждены покрытия страховки и депозит', owner: 'Максим О.' },
          { ts: '2024-09-15T16:30:00Z', type: 'document', label: 'Загружено международное ВУ' }
        ],
        tasks: [
          { label: 'Проверить международное ВУ', dueDate: '2024-09-17', status: 'in-progress' },
          { label: 'Подготовить desert kit', dueDate: '2024-09-19', status: 'pending' }
        ],
        offers: [
          { name: 'Desert Explorer Pack', description: 'Песчаные траки + спутниковый телефон + обучение 30 мин', price: 620, margin: '35%' },
          { name: 'Airport Meet & Drive', description: 'Встретим в DXB, доставим авто к отелю', price: 180, margin: '42%' }
        ],
        playbook: {
          scenario: 'Турист впервые в Дубае',
          checklist: [
            { label: 'Отправить инструкцию по штрафам/Салик', done: true },
            { label: 'Подтвердить тип страховки', done: false },
            { label: 'Добавить контакт поддержки 24/7', done: true }
          ],
          quickActions: [
            { label: 'Отправить ссылку Apple Pay', action: 'payment-link' },
            { label: 'Поделиться гайдом по пустыне', action: 'share-guide' }
          ],
          templates: [
            { channel: 'email', label: 'Гид по отпуску', subject: 'SkyLuxse · Готовы к пустынным приключениям' }
          ]
        },
        analytics: {
          lossReasons: [
            { reason: 'Не подтверждено международное ВУ', impact: 'high' }
          ],
          vehiclePopularity: [
            { carName: 'Mercedes G-Wagen', share: '41%' },
            { carName: 'Lamborghini Huracan', share: '24%' }
          ],
          campaignPerformance: [
            { name: 'Instagram Ads GCC', winRate: '46%', revenue: 64000 }
          ]
        }
      },
      'LD-1203': {
        clientId: 6,
        request: {
          start: '2024-09-21T18:00:00Z',
          end: '2024-09-23T23:00:00Z',
          durationDays: 3,
          fleetSize: 2,
          pickup: 'Four Seasons DIFC',
          dropoff: 'Four Seasons DIFC',
          notes: 'Вечерние выезды с водителем, требуется напитки в салоне и Wi-Fi.'
        },
        documents: [
          { name: 'Passport', status: 'verified', source: 'Kommo', updatedAt: '2024-09-12T08:00:00Z' },
          { name: 'Guest list', status: 'pending', source: 'Client', updatedAt: null }
        ],
        financials: {
          outstanding: 0,
          upcoming: [
            { label: 'Доплата за водителя', amount: 2200, status: 'pending', dueDate: '2024-09-20' }
          ],
          lastSync: '2024-09-17T07:00:00Z'
        },
        vehicleMatches: [
          { carId: 1, fitScore: 93 },
          { carId: 4, fitScore: 88 }
        ],
        resourceConflicts: [
          { type: 'driver', severity: 'medium', message: 'Остался 1 водитель класса VIP на 22 сентября после 23:00.' }
        ],
        pricing: {
          base: 13800,
          addons: [
            { label: 'Водитель премиум', amount: 2200 },
            { label: 'Refreshments set', amount: 280 }
          ],
          discounts: [
            { label: 'Постоянный клиент (3%)', amount: -492 }
          ],
          total: 15688,
          currency: 'AED'
        },
        timeline: [
          { ts: '2024-09-12T08:05:00Z', type: 'call', label: 'Согласован формат вечерних поездок', owner: 'Sara K.' },
          { ts: '2024-09-14T14:15:00Z', type: 'task', label: 'Запрос на список гостей', owner: 'Sara K.' }
        ],
        tasks: [
          { label: 'Получить список гостей', dueDate: '2024-09-18', status: 'pending' },
          { label: 'Зарезервировать водителя', dueDate: '2024-09-19', status: 'in-progress' }
        ],
        offers: [
          { name: 'Executive Evening', description: 'Rolls-Royce + водитель + напитки', price: 16800, margin: '27%' },
          { name: 'Airport Return', description: 'Встреча в DXB + трансфер обратно', price: 520, margin: '38%' }
        ],
        playbook: {
          scenario: 'VIP с водителем',
          checklist: [
            { label: 'Проверить наличие запасного авто', done: true },
            { label: 'Подтвердить dress-code водителя', done: false }
          ],
          quickActions: [
            { label: 'Отправить таймлайн водителю', action: 'share-driver-brief' },
            { label: 'Запросить подтверждение гостей', action: 'request-doc' }
          ],
          templates: [
            { channel: 'email', label: 'Ваш evening plan', subject: 'SkyLuxse · Подтверждение вечерних поездок' }
          ]
        },
        analytics: {
          lossReasons: [
            { reason: 'Не согласован водитель', impact: 'medium' }
          ],
          vehiclePopularity: [
            { carName: 'Rolls-Royce Ghost', share: '45%' },
            { carName: 'Bentley Continental', share: '31%' }
          ],
          campaignPerformance: [
            { name: 'Website VIP form', winRate: '39%', revenue: 54000 }
          ]
        }
      },
      'LD-1204': {
        clientId: 7,
        request: {
          start: '2024-09-27T10:00:00Z',
          end: '2024-09-29T22:00:00Z',
          durationDays: 3,
          fleetSize: 1,
          pickup: 'SkyLuxse HQ',
          dropoff: 'Palm Jumeirah',
          notes: 'Съемки контента, нужен гайд по локациям и разрешение на дрон.'
        },
        documents: [
          { name: 'Passport', status: 'verified', source: 'Kommo', updatedAt: '2024-09-16T16:00:00Z' },
          { name: 'Media release form', status: 'missing', source: 'Client', updatedAt: null }
        ],
        financials: {
          outstanding: 350,
          upcoming: [
            { label: 'Депозит', amount: 2500, status: 'pending', dueDate: '2024-09-25' }
          ],
          lastSync: '2024-09-18T09:15:00Z'
        },
        vehicleMatches: [
          { carId: 3, fitScore: 84 },
          { carId: 5, fitScore: 76 }
        ],
        resourceConflicts: [],
        pricing: {
          base: 7200,
          addons: [
            { label: 'Social media pack', amount: 380 },
            { label: 'Доп. страховка на съемку', amount: 180 }
          ],
          discounts: [
            { label: 'Influencer rate (5%)', amount: -379 }
          ],
          total: 7381,
          currency: 'AED'
        },
        timeline: [
          { ts: '2024-09-16T09:00:00Z', type: 'system', label: 'Лид создан (реферал от клиента Amina)' },
          { ts: '2024-09-17T13:45:00Z', type: 'email', label: 'Отправлен медиагайд и чек-лист' }
        ],
        tasks: [
          { label: 'Получить media release', dueDate: '2024-09-22', status: 'pending' },
          { label: 'Подготовить маршруты для съемок', dueDate: '2024-09-24', status: 'upcoming' }
        ],
        offers: [
          { name: 'Content Support Crew', description: 'Ассистент + свет отражатель + бутылки воды', price: 260, margin: '33%' },
          { name: 'Night Drive Upgrade', description: 'Доплата за ночную съемку и подсветку салона', price: 340, margin: '31%' }
        ],
        playbook: {
          scenario: 'Influencer weekend',
          checklist: [
            { label: 'Согласовать использование дрона', done: false },
            { label: 'Уточнить план постов', done: true }
          ],
          quickActions: [
            { label: 'Отправить подборку локаций', action: 'share-guide' },
            { label: 'Запросить подписанный release', action: 'request-doc' }
          ],
          templates: [
            { channel: 'email', label: 'Подборка лучших локаций', subject: 'SkyLuxse · Ваш контент weekend' }
          ]
        },
        analytics: {
          lossReasons: [
            { reason: 'Нет media release', impact: 'medium' }
          ],
          vehiclePopularity: [
            { carName: 'Lamborghini Huracan', share: '52%' }
          ],
          campaignPerformance: [
            { name: 'Influencer referrals', winRate: '61%', revenue: 22000 }
          ]
        }
      },
      'LD-1205': {
        clientId: 8,
        request: {
          start: '2024-09-12T09:00:00Z',
          end: '2024-09-15T18:00:00Z',
          durationDays: 4,
          fleetSize: 1,
          pickup: 'SkyLuxse HQ',
          dropoff: 'Dubai Hills',
          notes: 'Семейный уикенд, требуется детское кресло и напоминания по Salik.'
        },
        documents: [
          { name: 'Emirates ID', status: 'verified', source: 'Kommo', updatedAt: '2024-09-10T10:00:00Z' },
          { name: 'Driver License', status: 'verified', source: 'Kommo', updatedAt: '2024-09-10T10:02:00Z' }
        ],
        financials: {
          outstanding: 0,
          upcoming: [],
          lastSync: '2024-09-10T18:00:00Z'
        },
        vehicleMatches: [
          { carId: 2, fitScore: 91 },
          { carId: 1, fitScore: 86 }
        ],
        resourceConflicts: [],
        pricing: {
          base: 8200,
          addons: [
            { label: 'Детское кресло', amount: 80 },
            { label: 'Дополнительный водитель', amount: 220 }
          ],
          discounts: [
            { label: 'Repeat guest (4%)', amount: -336 }
          ],
          total: 8164,
          currency: 'AED'
        },
        timeline: [
          { ts: '2024-08-25T11:10:00Z', type: 'system', label: 'Лид импортирован из Kommo', owner: 'Максим О.' },
          { ts: '2024-09-01T09:55:00Z', type: 'success', label: 'Подтверждение бронирования и оплаты' }
        ],
        tasks: [
          { label: 'Отправить приветственный набор', dueDate: '2024-09-11', status: 'done' }
        ],
        offers: [
          { name: 'Family Comfort', description: 'Дополнительная уборка + набор напитков', price: 140, margin: '35%' }
        ],
        playbook: {
          scenario: 'Постоянный клиент',
          checklist: [
            { label: 'Применить бонусную скидку', done: true },
            { label: 'Подтвердить Salik-лимит', done: true }
          ],
          quickActions: [
            { label: 'Отправить ссылку на продление', action: 'extend-rental' }
          ],
          templates: [
            { channel: 'email', label: 'Спасибо за повторный выбор', subject: 'SkyLuxse · Отличных выходных!' }
          ]
        },
        analytics: {
          lossReasons: [],
          vehiclePopularity: [
            { carName: 'Mercedes G-Wagen', share: '58%' }
          ],
          campaignPerformance: [
            { name: 'Loyalty program', winRate: '68%', revenue: 88000 }
          ]
        }
      }
    },
    aggregated: {
      lossReasons: [
        { reason: 'High deposit', percent: 34 },
        { reason: 'Documents not uploaded on time', percent: 27 },
        { reason: 'Авто занято в нужные даты', percent: 21 }
      ],
      vehiclePopularity: [
        { carName: 'Mercedes G-Wagen', winShare: 0.36, avgDeal: 7800 },
        { carName: 'Ferrari 488 Spider', winShare: 0.28, avgDeal: 9600 },
        { carName: 'Rolls-Royce Ghost', winShare: 0.19, avgDeal: 12800 }
      ],
      campaignEfficiency: [
        { name: 'Instagram Ads UAE', winRate: 0.42, revenue: 96000 },
        { name: 'Hotel concierge partners', winRate: 0.51, revenue: 112000 },
        { name: 'Google Ads GCC', winRate: 0.38, revenue: 88000 }
      ]
    }
  },
  analytics: {
    kpis: {
      fleetUtilization: 0.87,
      slaCompliance: 0.86,
      driverAvailability: 0.78,
      tasksCompleted: 124,
      pendingDocuments: 6,
      clientNps: 74,
      avgRevenuePerCar: 245,
      activeBookings: 18
    },
    revenueDaily: [
      { date: '2024-09-11', revenue: 12500, expenses: 4200, bookings: 8, cancellations: 1 },
      { date: '2024-09-12', revenue: 13400, expenses: 3900, bookings: 9, cancellations: 0 },
      { date: '2024-09-13', revenue: 14600, expenses: 4100, bookings: 10, cancellations: 1 },
      { date: '2024-09-14', revenue: 15200, expenses: 4300, bookings: 11, cancellations: 0 },
      { date: '2024-09-15', revenue: 16200, expenses: 4500, bookings: 12, cancellations: 1 },
      { date: '2024-09-16', revenue: 17100, expenses: 4700, bookings: 12, cancellations: 1 },
      { date: '2024-09-17', revenue: 18500, expenses: 4900, bookings: 13, cancellations: 0 }
    ],
    driverPerformance: [
      { driverId: 1, completionRate: 0.95, nps: 4.9, overtimeHours: 1.5, kilometers: 420 },
      { driverId: 2, completionRate: 0.9, nps: 4.7, overtimeHours: 2.2, kilometers: 380 },
      { driverId: 3, completionRate: 0.92, nps: 4.8, overtimeHours: 1.1, kilometers: 340 }
    ],
    segmentMix: [
      { segment: 'Resident', share: 0.44 },
      { segment: 'Tourist', share: 0.38 },
      { segment: 'Special occasions', share: 0.18 }
    ],
    forecast: [
      { week: 'W38', expectedRevenue: 175000, expectedBookings: 42 },
      { week: 'W39', expectedRevenue: 182000, expectedBookings: 44 },
      { week: 'W40', expectedRevenue: 191000, expectedBookings: 46 }
    ]
  },
  knowledgeBase: [
    { id: 'KB-01', category: 'Documents', title: 'How to upload Emirate ID', updatedAt: '2024-09-12' },
    { id: 'KB-02', category: 'Payments', title: 'Deposit refund process', updatedAt: '2024-09-10' },
    { id: 'KB-03', category: 'Rentals', title: 'Rental extension rules', updatedAt: '2024-09-08' }
  ]
};

export const BOOKING_PRIORITIES = {
  high: { label: 'High', badge: 'sl-badge sl-badge-danger', cardAccent: 'border-l-4 border-rose-200', icon: 'alertTriangle' },
  medium: { label: 'Medium', badge: 'sl-badge sl-badge-warning', cardAccent: 'border-l-4 border-amber-200', icon: 'activity' },
  low: { label: 'Low', badge: 'sl-badge sl-badge-success', cardAccent: 'border-l-4 border-emerald-200', icon: 'check' }
};

export const BOOKING_TYPES = {
  vip: { label: 'VIP', badge: 'sl-badge sl-badge-primary', description: 'Personal rental with driver and premium services' },
  short: { label: 'Short-term', badge: 'sl-badge sl-badge-neutral', description: 'Rental up to 48 hours' },
  corporate: { label: 'Corporate', badge: 'sl-badge sl-badge-info', description: 'B2B events and long-term contracts' }
};

export const CALENDAR_EVENT_TYPES = {
  rental: { label: 'Rental', color: 'calendar-event-surface-rental', border: 'calendar-event-border-rental' },
  maintenance: { label: 'Maintenance', color: 'calendar-event-surface-maintenance', border: 'calendar-event-border-maintenance' },
  repair: { label: 'Repair', color: 'calendar-event-surface-repair', border: 'calendar-event-border-repair' }
};

export const BOOKING_STATUS_PHASES = {
  reservation: { label: 'Reservation', badge: 'sl-pill sl-pill-compact sl-pill-neutral' },
  booking: { label: 'Booking', badge: 'sl-pill sl-pill-compact sl-pill-warning' },
  rental: { label: 'Rental', badge: 'sl-pill sl-pill-compact sl-pill-success' }
};

export const BOOKING_STATUS_STAGE_MAP = {
  new: 'reservation',
  preparation: 'booking',
  delivery: 'booking',
  settlement: 'booking',
  'in-rent': 'rental'
};

export const TASK_TYPES = {
  delivery: {
    label: 'Delivery',
    icon: 'navigation',
    color: 'bg-indigo-50 text-indigo-700',
    required: [
      { key: 'odometer', label: 'Odometer', type: 'number' },
      { key: 'fuelLevel', label: 'Fuel level (%)', type: 'number' },
      { key: 'photosBefore', label: 'Vehicle photos before delivery', type: 'file', multiple: true, accept: 'image/*' },
      { key: 'clientDocsPhotos', label: 'Client documents (photos)', type: 'file', multiple: true, accept: 'image/*' }
    ],
    slaMinutes: 120,
    checklist: [
      { idSuffix: 'fuel', label: 'Check fuel level', required: true },
      { idSuffix: 'documents', label: 'Verify document set', required: true },
      { idSuffix: 'photos', label: 'Take photos before delivery', required: false }
    ]
  },
  pickup: {
    label: 'Vehicle pickup',
    icon: 'truck',
    color: 'bg-sky-50 text-sky-700',
    required: [
      { key: 'odometer', label: 'Odometer', type: 'number' },
      { key: 'photosAfter', label: 'Vehicle photos after return', type: 'file', multiple: true, accept: 'image/*' },
      { key: 'fuelLevel', label: 'Fuel level (%)', type: 'number' }
    ],
    slaMinutes: 90,
    checklist: [
      { idSuffix: 'signature', label: 'Get client signature', required: true },
      { idSuffix: 'damage', label: 'Record damages', required: true }
    ]
  },
  maintenance: {
    label: 'Maintenance',
    icon: 'wrench',
    color: 'bg-amber-50 text-amber-700',
    required: [
      { key: 'odoStart', label: 'Odometer start', type: 'number' },
      { key: 'odoEnd', label: 'Odometer end', type: 'number' }
    ],
    slaMinutes: 240,
    checklist: [
      { idSuffix: 'inspection', label: 'Complete maintenance checklist', required: true },
      { idSuffix: 'report', label: 'Add mechanic report', required: false }
    ]
  }
};

export const KANBAN_STATUS_META = {
  new: {
    label: 'New booking',
    group: 'Intake',
    accent: 'bg-slate-100',
    accentBorder: 'border-slate-200',
    allowedTransitions: ['preparation'],
    blockers: ['missingDocuments'],
    slaMinutes: 120,
    description: 'Booking created manually or imported from Kommo.'
  },
  preparation: {
    label: 'Vehicle preparation',
    group: 'Fleet',
    accent: 'bg-violet-100',
    accentBorder: 'border-violet-200',
    allowedTransitions: ['delivery'],
    blockers: ['noDriverAssigned'],
    slaMinutes: 90,
    description: 'Detailing, document verification, key set preparation.'
  },
  delivery: {
    label: 'Awaiting delivery',
    group: 'Fleet',
    accent: 'bg-indigo-100',
    accentBorder: 'border-indigo-200',
    allowedTransitions: ['in-rent', 'settlement'],
    blockers: ['paymentPending'],
    slaMinutes: 60,
    description: 'Driver en route or waiting for client.'
  },
  'in-rent': {
    label: 'In rental',
    group: 'Live',
    accent: 'bg-blue-100',
    accentBorder: 'border-blue-200',
    allowedTransitions: ['settlement'],
    blockers: [],
    slaMinutes: 0,
    description: 'Аренда активна, отслеживаем SLA и платежи.'
  },
  settlement: {
    label: 'Return and settlement',
    group: 'Closing',
    accent: 'bg-emerald-100',
    accentBorder: 'border-emerald-200',
    allowedTransitions: [],
    blockers: ['finesPending'],
    slaMinutes: 45,
    description: 'Final inspection, record fines and deposit return.'
  }
};

export const ROLE_EMAIL_PRESETS = {
  operations: 'fleet@skyluxse.ae',
  sales: 'sales@skyluxse.ae',
  ceo: 'ceo@skyluxse.ae',
  driver: 'driver@skyluxse.ae',
  client: 'client@skyluxse.ae'
};

export const KANBAN_STATUSES = Object.fromEntries(
  Object.entries(KANBAN_STATUS_META).map(([key, meta]) => [key, meta.label])
);

export const ROLES_CONFIG = {
  operations: {
    name: 'Fleet manager',
    label: 'Fleet manager',
    email: 'fleet@skyluxse.ae',
    defaultPage: 'fleet-calendar',
    layout: 'desktop',
    nav: [
      { id: 'fleet-calendar', name: 'Fleet Calendar', icon: 'calendar' },
      { id: 'tasks', name: 'Tasks', icon: 'clipboardCheck' },
      { id: 'fleet-table', name: 'Fleet', icon: 'car' }
    ],
    blockedPages: ['clients-table', 'client-detail'],
    permissions: {
      canAssignDrivers: true,
      canManageCalendar: true,
      canAccessReports: false,
      canViewClientPortal: false
    }
  },
  sales: {
    name: 'Sales Manager',
    label: 'Sales Manager',
    email: 'sales@skyluxse.ae',
    defaultPage: 'fleet-calendar',
    layout: 'desktop',
    nav: [
      { id: 'fleet-calendar', name: 'Fleet Calendar', icon: 'calendar' },
      { id: 'bookings', name: 'Bookings', icon: 'kanban' },
      { id: 'clients-table', name: 'Clients', icon: 'users' },
      { id: 'analytics', name: 'Analytics', icon: 'chart' }
    ],
    permissions: {
      canAssignDrivers: false,
      canManageCalendar: true,
      canAccessReports: true,
      canViewClientPortal: true
    }
  },
  ceo: {
    name: 'CEO',
    label: 'CEO',
    email: 'ceo@skyluxse.ae',
    defaultPage: 'dashboard',
    layout: 'desktop',
    nav: [
      { id: 'dashboard', name: 'Dashboard', icon: 'layoutDashboard' },
      { id: 'reports', name: 'Reports', icon: 'fileText' },
      { id: 'analytics', name: 'Analytics', icon: 'chart' },
      { id: 'bookings', name: 'Bookings', icon: 'kanban' },
      { id: 'fleet-calendar', name: 'Fleet Calendar', icon: 'calendar' }
    ],
    permissions: {
      canAssignDrivers: false,
      canManageCalendar: false,
      canAccessReports: true,
      canViewClientPortal: true
    }
  },
  driver: {
    name: 'Driver',
    label: 'Driver',
    email: 'driver@skyluxse.ae',
    defaultPage: 'driver-tasks',
    layout: 'mobile',
    nav: []
  }
};

export const getCarById = (id) => carsByIdMap.get(toKey(id)) || null;
export const getClientById = (id) => clientsByIdMap.get(toKey(id)) || null;
export const getBookingById = (id) => bookingsByIdMap.get(toKey(id)) || null;
export const getBookingsByClientId = (clientId) => {
  const list = bookingsByClientIdMap.get(toKey(clientId));
  return list ? [...list] : [];
};

// Document registry for mapping IDs to URLs
const documentRegistry = new Map();

// Function to register a document and get its ID
export const registerDocument = (url) => {
  if (!url) return null;
  // Check if already registered
  for (const [id, existingUrl] of documentRegistry) {
    if (existingUrl === url) return id;
  }
  // Generate new ID
  const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  documentRegistry.set(id, url);
  return id;
};

// Function to get URL by ID
export const getDocumentUrl = (id) => {
  return documentRegistry.get(id) || null;
};

// Initialize document registry with existing documents
const initializeDocumentRegistry = () => {
  // Register client documents
  normalizedClients.forEach(client => {
    if (client.documents && Array.isArray(client.documents)) {
      client.documents.forEach(doc => {
        if (doc.url) {
          doc.id = registerDocument(doc.url);
        }
      });
    }
  });

  // Register car documents (if any)
  normalizedCars.forEach(car => {
    if (car.documents && Array.isArray(car.documents)) {
      car.documents.forEach(doc => {
        if (doc.url) {
          doc.id = registerDocument(doc.url);
        }
      });
    }
  });
};

initializeDocumentRegistry();
