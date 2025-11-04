/**
 * @fileoverview Данные о бронированиях
 */

export const bookings = [
  {
    id: 1052,
    code: 'BK-1052',
    clientId: 4,
    clientName: 'Mia Al Farsi',
    carName: 'Rolls-Royce Ghost',
    startDate: '2025-10-13',
    endDate: '2025-10-16',
    startTime: '09:00',
    endTime: '18:00',
    driverId: 1,
    status: 'delivery',
    carId: 1,
    totalAmount: 14800,
    paidAmount: 6800,
    deposit: 4000,
    priority: 'high',
    type: 'vip',
    channel: 'Kommo',
    ownerId: 'anna',
    segment: 'Resident',
    salesService: {
      rating: 9,
      feedback: 'Handled VIP extension proactively, client praised speed.',
      ratedBy: 'ceo',
      ratedAt: '2025-10-12T18:45:00Z'
    },
    pickupLocation: 'SkyLuxse HQ',
    dropoffLocation: 'Burj Khalifa Residences',
    targetTime: Date.parse('2025-10-13T08:30:00Z'),
    serviceLevel: { slaMinutes: 30, promisedAt: '2025-10-13T08:30:00Z', actualAt: '2025-10-13T08:25:00Z' },
    addons: ['chauffeur', 'insurance-premium'],
    billing: { base: 13200, addons: 1600, discounts: 0, currency: 'AED' },
    pickupMileage: 15200,
    pickupFuel: 'Full',
    returnMileage: 15420,
    returnFuel: '3/4',
    invoices: [
      { id: 'INV-1052-1', label: 'Rental invoice', amount: 14800, status: 'Partially Paid', issuedDate: '2025-10-10', dueDate: '2025-10-12' },
      { id: 'INV-1052-2', label: 'Security deposit hold', amount: 4000, status: 'Authorized', issuedDate: '2025-10-10', dueDate: '2025-10-13' },
      { id: 'INV-1052-EXT1', label: 'Extension invoice · 16-18 Oct', amount: 3600, status: 'Partially Paid', issuedDate: '2025-10-12', dueDate: '2025-10-16', scope: 'extension' }
    ],
    documents: [
      { type: 'contract', status: 'signed', url: '/public/images/docs/doc-contract.jpg', name: 'Rental contract' },
      { type: 'deposit', status: 'authorized', url: '/public/images/docs/doc-deposit.jpg', name: 'Deposit authorization' },
      { type: 'extension-addendum', status: 'signed', url: '/public/images/docs/doc-insurance.jpg', name: 'Extension addendum Oct' }
    ],
    tags: ['vip', 'long-rent'],
    history: [
      { ts: '2025-10-10 11:05', event: 'Запрос получен из Kommo' },
      { ts: '2025-10-11 09:20', event: 'Водитель I.Ivanov назначен' },
      { ts: '2025-10-12 14:45', event: 'Extension EXT-1052-1 confirmed for Oct 16-18' }
    ],
    timeline: [
      { ts: '2025-10-12T15:00:00Z', status: 'preparation', note: 'Детейлинг и проверка комплекта документов', actor: 'operations' },
      { ts: '2025-10-13T08:00:00Z', status: 'delivery', note: 'Авто выехало к клиенту', actor: 'driver' },
      { ts: '2025-10-12T14:45:00Z', status: 'extension', note: 'Extension EXT-1052-1 approved. Driver schedule updated.', actor: 'operations' }
    ],
    extensions: [
      {
        id: 'EXT-1052-1',
        label: 'Weekend celebration',
        startDate: '2025-10-16',
        startTime: '18:00',
        endDate: '2025-10-18',
        endTime: '20:00',
        status: 'confirmed',
        createdAt: '2025-10-12T14:30:00Z',
        createdBy: 'Anna Koval',
        note: 'Client extending booking for anniversary photoshoot and dinners.',
        pricing: { base: 3200, addons: 400, fees: 0, discounts: 0, currency: 'AED', total: 3600 },
        payments: { paidAmount: 2000, outstandingAmount: 1600, lastPaymentAt: '2025-10-13', depositAdjustment: 0 },
        invoiceId: 'INV-1052-EXT1',
        tasks: [
          { id: 'EXT-TASK-1052-1', title: 'Adjust driver rota for extension', type: 'delivery', status: 'done', deadline: '2025-10-16 17:00' },
          { id: 'EXT-TASK-1052-2', title: 'Prepare Anniversary amenities', type: 'preparation', status: 'todo', deadline: '2025-10-16 12:00' }
        ],
        timeline: [
          { ts: '2025-10-12T14:32:00Z', status: 'request', note: 'Extension request received via WhatsApp', actor: 'sales' },
          { ts: '2025-10-12T14:45:00Z', status: 'extension', note: 'Extension confirmed. Invoice issued.', actor: 'operations' }
        ],
        notifications: [
          { channel: 'email', ts: '2025-10-12T14:50:00Z', status: 'sent', template: 'extension-confirmation' },
          { channel: 'whatsapp', ts: '2025-10-12T14:55:00Z', status: 'delivered', template: 'extension-summary' }
        ]
      }
    ]
  },
  {
    id: 1053,
    code: 'BK-1053',
    clientId: 5,
    clientName: 'Luca Moretti',
    carName: 'Lamborghini Huracan',
    startDate: '2025-10-13',
    endDate: '2025-10-15',
    startTime: '12:00',
    endTime: '20:00',
    driverId: 2,
    status: 'preparation',
    carId: 3,
    totalAmount: 6200,
    paidAmount: 3200,
    deposit: 1800,
    priority: 'medium',
    type: 'short',
    channel: 'Website',
    ownerId: 'max',
    segment: 'Tourist',
    salesService: {
      rating: 6,
      feedback: 'Need clearer updates before pickup, otherwise ok.',
      ratedBy: 'ceo',
      ratedAt: '2025-10-11T20:10:00Z'
    },
    pickupLocation: 'Dubai Marina Mall',
    dropoffLocation: 'Dubai Marina Mall',
    targetTime: Date.parse('2025-10-13T10:30:00Z'),
    serviceLevel: { slaMinutes: 45, promisedAt: '2025-10-13T10:30:00Z', actualAt: null },
    addons: ['international-insurance'],
    billing: { base: 5600, addons: 600, discounts: 0, currency: 'AED' },
    pickupMileage: 8300,
    pickupFuel: 'Full',
    returnMileage: null,
    returnFuel: null,
    invoices: [
      { id: 'INV-1053-1', label: 'Rental invoice', amount: 6200, status: 'Pending', issuedDate: '2025-10-11', dueDate: '2025-10-14' },
      { id: 'INV-1053-2', label: 'Deposit authorization', amount: 1800, status: 'Authorized', issuedDate: '2025-10-11', dueDate: '2025-10-13' }
    ],
    documents: [{ type: 'contract', status: 'pending-signature' }],
    tags: ['new-channel', 'tourist'],
    history: [
      { ts: '2025-10-11 17:40', event: 'Онлайн-бронь с сайта' }
    ],
    timeline: [
      { ts: '2025-10-13T07:30:00Z', status: 'preparation', note: 'Авто в мойке, проверка давления шин', actor: 'operations' }
    ]
  },
  {
    id: 1054,
    code: 'BK-1054',
    clientId: 6,
    clientName: 'Chen Wei',
    carName: 'Mercedes G-Wagen',
    startDate: '2025-10-14',
    endDate: '2025-10-17',
    startTime: '08:30',
    endTime: '18:30',
    driverId: 3,
    status: 'in-rent',
    carId: 2,
    totalAmount: 9800,
    paidAmount: 5200,
    deposit: 2500,
    priority: 'high',
    type: 'corporate',
    channel: 'Instagram Ads',
    ownerId: 'sara',
    segment: 'Business Traveller',
    salesService: {
      rating: 4,
      feedback: 'Client escalated twice about route confirmation delays.',
      ratedBy: 'ceo',
      ratedAt: '2025-10-15T11:05:00Z'
    },
    pickupLocation: 'Dubai International Airport',
    dropoffLocation: 'SkyLuxse HQ',
    targetTime: Date.parse('2025-10-14T07:30:00Z'),
    serviceLevel: { slaMinutes: 40, promisedAt: '2025-10-14T07:30:00Z', actualAt: '2025-10-14T07:40:00Z' },
    addons: ['chauffeur', 'executive-pack'],
    billing: { base: 8800, addons: 1000, discounts: 0, currency: 'AED' },
    documents: [
      { type: 'contract', status: 'signed', url: '/public/images/docs/doc-contract.svg', name: 'Rental contract' },
      { type: 'nda', status: 'signed', url: '/public/images/docs/doc-nda.svg', name: 'NDA' },
      { type: 'extension-addendum', status: 'pending-signature', name: 'Extension draft addendum' }
    ],
    tags: ['corporate', 'international'],
    history: [
      { ts: '2025-10-09 13:15', event: 'Лид из Instagram кампании' },
      { ts: '2025-10-10 09:45', event: 'Подтверждение маршрута' },
      { ts: '2025-10-15 10:05', event: 'Extension EXT-1054-2 drafted for Oct 17-19' }
    ],
    timeline: [
      { ts: '2025-10-14T07:00:00Z', status: 'preparation', note: 'VIP-комплект загружен в авто', actor: 'operations' },
      { ts: '2025-10-14T08:00:00Z', status: 'delivery', note: 'Встреча клиента у терминала 1', actor: 'driver' },
      { ts: '2025-10-15T10:05:00Z', status: 'extension', note: 'Новый запрос на продление до 19 Oct (draft)', actor: 'sales' }
    ],
    extensions: [
      {
        id: 'EXT-1054-1',
        label: 'Airport transfer buffer',
        startDate: '2025-10-17',
        startTime: '19:00',
        endDate: '2025-10-17',
        endTime: '23:30',
        status: 'cancelled',
        createdAt: '2025-10-13T18:20:00Z',
        createdBy: 'Sara Khan',
        note: 'Initially booked extra evening with chauffeur, later cancelled by client.',
        pricing: { base: 1600, addons: 0, fees: 0, discounts: 0, currency: 'AED', total: 1600 },
        payments: { paidAmount: 1600, outstandingAmount: 0, lastPaymentAt: '2025-10-13', depositAdjustment: 0 },
        invoiceId: 'INV-1054-EXT1',
        timeline: [
          { ts: '2025-10-13T18:22:00Z', status: 'extension', note: 'Extension confirmed and invoiced', actor: 'sales' },
          { ts: '2025-10-14T09:45:00Z', status: 'cancelled', note: 'Client cancelled, refund processed', actor: 'finance' }
        ],
        notifications: [
          { channel: 'email', ts: '2025-10-13T18:25:00Z', status: 'sent', template: 'extension-confirmation' },
          { channel: 'email', ts: '2025-10-14T09:50:00Z', status: 'sent', template: 'extension-cancellation' }
        ]
      },
      {
        id: 'EXT-1054-2',
        label: 'Corporate summit overrun',
        startDate: '2025-10-17',
        startTime: '18:30',
        endDate: '2025-10-19',
        endTime: '19:00',
        status: 'draft',
        createdAt: '2025-10-15T10:05:00Z',
        createdBy: 'Sara Khan',
        note: 'Awaiting client confirmation. Chauffeur requires overtime approval.',
        pricing: { base: 5200, addons: 600, fees: 200, discounts: 0, currency: 'AED', total: 6000 },
        payments: { paidAmount: 0, outstandingAmount: 6000, lastPaymentAt: null, depositAdjustment: 1500 },
        invoiceId: 'INV-1054-EXT2',
        riskFlags: ['awaiting-deposit', 'conflicts-calendar'],
        timeline: [
          { ts: '2025-10-15T10:05:00Z', status: 'draft', note: 'Extension draft created, pending signed addendum', actor: 'sales' }
        ],
        notifications: [
          { channel: 'whatsapp', ts: '2025-10-15T10:10:00Z', status: 'delivered', template: 'extension-proposal' }
        ]
      }
    ],
    invoices: [
      { id: 'INV-1054-1', label: 'Rental invoice', amount: 9800, status: 'Partially Paid', issuedDate: '2025-10-10', dueDate: '2025-10-14' },
      { id: 'INV-1054-2', label: 'Security deposit', amount: 2500, status: 'Authorized', issuedDate: '2025-10-10', dueDate: '2025-10-14' },
      { id: 'INV-1054-EXT1', label: 'Extension invoice · 17 Oct (cancelled)', amount: 1600, status: 'Refunded', issuedDate: '2025-10-13', dueDate: '2025-10-13', scope: 'extension' },
      { id: 'INV-1054-EXT2', label: 'Extension invoice draft · 17-19 Oct', amount: 6000, status: 'Draft', issuedDate: '2025-10-15', dueDate: '2025-10-17', scope: 'extension' }
    ]
  },
  {
    id: 1055,
    code: 'BK-1055',
    clientId: 7,
    clientName: 'Olivia Carter',
    carName: 'Ferrari 488 Spider',
    startDate: '2025-10-16',
    endDate: '2025-10-18',
    startTime: '16:00',
    endTime: '16:00',
    driverId: 3,
    status: 'delivery',
    carId: 5,
    totalAmount: 7200,
    paidAmount: 7200,
    deposit: 1200,
    priority: 'medium',
    type: 'short',
    channel: 'Referral',
    ownerId: 'anna',
    segment: 'Leisure',
    pickupLocation: 'SkyLuxse HQ',
    dropoffLocation: 'Jumeirah Beach Residence',
    targetTime: Date.parse('2025-10-16T14:30:00Z'),
    serviceLevel: { slaMinutes: 30, promisedAt: '2025-10-16T14:30:00Z', actualAt: '2025-10-16T14:45:00Z' },
    addons: ['chauffeur', 'anniversary-kit'],
    billing: { base: 6600, addons: 600, discounts: 0, currency: 'AED' },
    documents: [{ type: 'contract', status: 'signed' }],
    tags: ['vip', 'content'],
    history: [
      { ts: '2025-10-12 18:30', event: 'Реферальное обращение от действующего клиента' },
      { ts: '2025-10-13 10:20', event: 'Утвержден маршрут съемки' }
    ],
    timeline: [
      { ts: '2025-10-16T12:00:00Z', status: 'preparation', note: 'Проверка уровня топлива и шин', actor: 'operations' }
    ]
  },
  {
    id: 1056,
    code: 'BK-1056',
    clientId: 8,
    clientName: 'Amina Rahman',
    carName: 'Bentley Continental',
    startDate: '2025-10-18',
    endDate: '2025-10-20',
    startTime: '09:00',
    endTime: '19:00',
    driverId: 2,
    status: 'preparation',
    carId: 4,
    totalAmount: 8400,
    paidAmount: 4200,
    deposit: 1500,
    priority: 'medium',
    type: 'medium',
    channel: 'CRM',
    ownerId: 'max',
    segment: 'Resident',
    pickupLocation: 'SkyLuxse HQ',
    dropoffLocation: 'Dubai Hills',
    targetTime: Date.parse('2025-10-18T07:45:00Z'),
    serviceLevel: { slaMinutes: 45, promisedAt: '2025-10-18T07:45:00Z', actualAt: null },
    addons: ['baby-seat'],
    billing: { base: 7800, addons: 600, discounts: 0, currency: 'AED' },
    documents: [{ type: 'contract', status: 'in-review' }],
    tags: ['family', 'staycation'],
    history: [
      { ts: '2025-10-15 09:00', event: 'Повторный запрос через CRM' },
      { ts: '2025-10-16 16:30', event: 'Подтверждена программа staycation' }
    ],
    timeline: []
  },
  {
    id: 1057,
    code: 'BK-1057',
    clientId: 6,
    clientName: 'Chen Wei',
    carName: 'Mercedes G-Wagen',
    startDate: '2025-10-20',
    endDate: '2025-10-21',
    startTime: '14:00',
    endTime: '20:00',
    driverId: 1,
    status: 'settlement',
    carId: 2,
    totalAmount: 3600,
    paidAmount: 3600,
    deposit: 600,
    priority: 'low',
    type: 'short',
    channel: 'Offline Event',
    ownerId: 'sara',
    segment: 'Business Traveller',
    pickupLocation: 'Dubai Marina',
    dropoffLocation: 'SkyLuxse HQ',
    targetTime: Date.parse('2025-10-20T12:30:00Z'),
    serviceLevel: { slaMinutes: 25, promisedAt: '2025-10-20T12:30:00Z', actualAt: '2025-10-20T12:40:00Z' },
    addons: ['chauffeur'],
    billing: { base: 3600, addons: 0, discounts: 0, currency: 'AED' },
    documents: [{ type: 'contract', status: 'signed' }],
    tags: ['event'],
    history: [
      { ts: '2025-10-18 19:15', event: 'Договоренность после оффлайн-мероприятия' }
    ],
    timeline: [
      { ts: '2025-10-20T11:30:00Z', status: 'preparation', note: 'Комплект сувениров добавлен в салон', actor: 'operations' }
    ]
  },
  {
    id: 1058,
    code: 'BK-1058',
    clientId: 9,
    clientName: 'Nina Petrovna',
    carName: 'Lamborghini Huracan',
    startDate: '2025-10-22',
    endDate: '2025-10-22',
    startTime: '17:00',
    endTime: '23:00',
    driverId: 2,
    status: 'new',
    carId: 3,
    totalAmount: 4200,
    paidAmount: 0,
    deposit: 900,
    priority: 'high',
    type: 'event',
    channel: 'Partnership',
    ownerId: 'max',
    segment: 'Resident',
    pickupLocation: 'SkyLuxse HQ',
    dropoffLocation: 'Atlantis The Palm',
    targetTime: Date.parse('2025-10-22T15:30:00Z'),
    serviceLevel: { slaMinutes: 35, promisedAt: '2025-10-22T15:30:00Z', actualAt: null },
    addons: ['chauffeur', 'photo-pack'],
    billing: { base: 3900, addons: 300, discounts: 0, currency: 'AED' },
    pickupMileage: 15480,
    pickupFuel: 'Full',
    returnMileage: null,
    returnFuel: null,
    invoices: [
      { id: 'INV-1058-1', label: 'Event rental invoice', amount: 4200, status: 'Pending', issuedDate: '2025-10-19', dueDate: '2025-10-21' },
      { id: 'INV-1058-2', label: 'Deposit authorization', amount: 900, status: 'Authorized', issuedDate: '2025-10-19', dueDate: '2025-10-22' }
    ],
    documents: [{ type: 'contract', status: 'draft' }],
    tags: ['vip', 'evening'],
    history: [
      { ts: '2025-10-19 10:05', event: 'Партнерский запрос от отеля Atlantis' }
    ],
    timeline: []
  },
  {
    id: 1061,
    code: 'BK-1061',
    clientId: 3,
    clientName: 'Amir Rahman',
    carName: 'Rolls-Royce Ghost',
    startDate: '2025-10-22',
    endDate: '2025-10-24',
    startTime: '10:00',
    endTime: '19:00',
    driverId: 1,
    status: 'new',
    carId: 1,
    totalAmount: 15600,
    paidAmount: 5400,
    deposit: 4000,
    priority: 'medium',
    type: 'vip',
    channel: 'Website',
    ownerId: 'anna',
    segment: 'Resident',
    pickupLocation: 'SkyLuxse HQ',
    dropoffLocation: 'Address Downtown',
    targetTime: Date.parse('2025-10-22T08:30:00Z'),
    serviceLevel: { slaMinutes: 35, promisedAt: '2025-10-22T08:30:00Z', actualAt: null },
    addons: ['chauffeur', 'welcome-pack'],
    billing: { base: 14600, addons: 1000, discounts: 0, currency: 'AED' },
    documents: [{ type: 'contract', status: 'draft' }],
    tags: ['vip', 'return-client'],
    history: [
      { ts: '2025-10-19 12:10', event: 'Онлайн-бронь через сайт' }
    ],
    timeline: [
      { ts: '2025-10-21T15:00:00Z', status: 'preparation', note: 'Проверка комплекта напитков', actor: 'operations' }
    ]
  },
  {
    id: 1062,
    code: 'BK-1062',
    clientId: 6,
    clientName: 'Chen Wei',
    carName: 'Lamborghini Huracan',
    startDate: '2025-10-23',
    endDate: '2025-10-25',
    startTime: '13:00',
    endTime: '22:00',
    driverId: 2,
    status: 'preparation',
    carId: 3,
    totalAmount: 7200,
    paidAmount: 3600,
    deposit: 1800,
    priority: 'high',
    type: 'short',
    channel: 'Instagram Ads',
    ownerId: 'max',
    segment: 'Business Traveller',
    pickupLocation: 'Dubai Marina Mall',
    dropoffLocation: 'SkyLuxse HQ',
    targetTime: Date.parse('2025-10-23T11:30:00Z'),
    serviceLevel: { slaMinutes: 40, promisedAt: '2025-10-23T11:30:00Z', actualAt: null },
    addons: ['international-insurance'],
    billing: { base: 6600, addons: 600, discounts: 0, currency: 'AED' },
    documents: [{ type: 'contract', status: 'pending-signature' }],
    tags: ['repeat', 'executive'],
    history: [
      { ts: '2025-10-19 14:45', event: 'Повторный запрос через рекламную кампанию' }
    ],
    timeline: [
      { ts: '2025-10-23T08:00:00Z', status: 'preparation', note: 'Детейлинг салона и кузова', actor: 'operations' }
    ]
  },
  {
    id: 1063,
    code: 'BK-1063',
    clientId: 2,
    clientName: 'Olivia Carter',
    carName: 'Bentley Continental',
    startDate: '2025-10-24',
    endDate: '2025-10-27',
    startTime: '09:30',
    endTime: '18:00',
    driverId: 3,
    status: 'delivery',
    carId: 4,
    totalAmount: 9100,
    paidAmount: 9100,
    deposit: 1500,
    priority: 'medium',
    type: 'medium',
    channel: 'Referral',
    ownerId: 'anna',
    segment: 'Leisure',
    pickupLocation: 'SkyLuxse HQ',
    dropoffLocation: 'Palm Jumeirah Villas',
    targetTime: Date.parse('2025-10-24T08:00:00Z'),
    serviceLevel: { slaMinutes: 30, promisedAt: '2025-10-24T08:00:00Z', actualAt: '2025-10-24T08:05:00Z' },
    addons: ['baby-seat', 'wifi-router'],
    billing: { base: 8600, addons: 500, discounts: 0, currency: 'AED' },
    documents: [{ type: 'contract', status: 'signed' }],
    tags: ['family', 'weekend'],
    history: [
      { ts: '2025-10-20 11:20', event: 'Рекомендация от постоянного клиента' }
    ],
    timeline: [
      { ts: '2025-10-23T16:00:00Z', status: 'preparation', note: 'Проверка детского кресла', actor: 'operations' }
    ]
  },
  {
    id: 1064,
    code: 'BK-1064',
    clientId: 7,
    clientName: 'Luca Moretti',
    carName: 'Ferrari 488 Spider',
    startDate: '2025-10-22',
    endDate: '2025-10-24',
    startTime: '15:00',
    endTime: '21:00',
    driverId: 1,
    status: 'in-rent',
    carId: 5,
    totalAmount: 9800,
    paidAmount: 7200,
    deposit: 2000,
    priority: 'high',
    type: 'event',
    channel: 'Website',
    ownerId: 'sara',
    segment: 'Tourist',
    pickupLocation: 'Dubai International Airport',
    dropoffLocation: 'SkyLuxse HQ',
    targetTime: Date.parse('2025-10-22T13:30:00Z'),
    serviceLevel: { slaMinutes: 45, promisedAt: '2025-10-22T13:30:00Z', actualAt: '2025-10-22T13:20:00Z' },
    addons: ['chauffeur', 'photo-pack'],
    billing: { base: 9000, addons: 800, discounts: 0, currency: 'AED' },
    documents: [{ type: 'contract', status: 'signed' }],
    tags: ['tourist', 'vip'],
    history: [
      { ts: '2025-10-18 17:55', event: 'Онлайн-бронирование с предоплатой' }
    ],
    timeline: [
      { ts: '2025-10-22T12:00:00Z', status: 'delivery', note: 'Водитель выехал в аэропорт', actor: 'driver' }
    ]
  },
  {
    id: 1065,
    code: 'BK-1065',
    clientId: 4,
    clientName: 'Sara Khan',
    carName: 'Mercedes G-Wagen',
    startDate: '2025-10-25',
    endDate: '2025-10-26',
    startTime: '08:00',
    endTime: '18:00',
    driverId: 2,
    status: 'settlement',
    carId: 2,
    totalAmount: 4800,
    paidAmount: 4800,
    deposit: 800,
    priority: 'medium',
    type: 'corporate',
    channel: 'CRM',
    ownerId: 'max',
    segment: 'Corporate',
    pickupLocation: 'SkyLuxse HQ',
    dropoffLocation: 'Dubai Media City',
    targetTime: Date.parse('2025-10-25T06:45:00Z'),
    serviceLevel: { slaMinutes: 30, promisedAt: '2025-10-25T06:45:00Z', actualAt: '2025-10-25T06:50:00Z' },
    addons: ['event-badge-access'],
    billing: { base: 4800, addons: 0, discounts: 0, currency: 'AED' },
    documents: [{ type: 'contract', status: 'signed' }],
    tags: ['corporate', 'conference'],
    history: [
      { ts: '2025-10-21 09:40', event: 'Бронь оформлена через CRM после звонка' }
    ],
    timeline: [
      { ts: '2025-10-26T19:00:00Z', status: 'settlement', note: 'Ожидание расчета с корпоративным отделом', actor: 'finance' }
    ]
  }
];
