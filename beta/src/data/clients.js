/**
 * @fileoverview Данные о клиентах
 */

export const clients = [
  {
    id: 1,
    name: 'John Doe',
    phone: '+971 50 123 4567',
    email: 'john.doe@email.com',
    status: 'VIP',
    segment: 'Resident',
    residencyCountry: 'UAE',
    birthDate: '1982-03-14',
    outstanding: 0,
    lifetimeValue: 72000,
    nps: 72,
    documents: [
      { id: 'CL-1-EID', type: 'emirates-id', name: 'Emirates ID', url: 'https://picsum.photos/seed/id1/400/300', expiry: '2026-02-20', status: 'verified', number: '784-1982-1234567-0' },
      { id: 'CL-1-LIC', type: 'license', name: 'Driving License', url: 'https://picsum.photos/seed/lic1/400/300', expiry: '2025-12-01', status: 'verified', number: 'DL-852014' }
    ],
    rentals: [
      { bookingId: 1052, status: 'active', startDate: '2024-09-15', endDate: '2024-09-18', carName: 'Mercedes G-Wagen', totalAmount: 3200 },
      { bookingId: 1058, status: 'scheduled', startDate: '2024-09-21', endDate: '2024-09-22', carName: 'Lamborghini Huracan', totalAmount: 4500 }
    ],
    payments: [
      { id: 'PAY-2101', type: 'invoice', amount: 3200, status: 'paid', channel: 'card', date: '2024-09-14' },
      { id: 'PAY-2102', type: 'deposit', amount: 1000, status: 'held', channel: 'card', date: '2024-09-14' }
    ],
    notifications: [
      { id: 'NT-101', channel: 'email', subject: 'Rental confirmation', date: '2024-09-14T10:07:00Z', status: 'delivered' },
      { id: 'NT-102', channel: 'sms', subject: 'Return reminder', date: '2024-09-18T08:00:00Z', status: 'scheduled' }
    ],
    preferences: {
      notifications: ['email', 'sms'],
      language: 'ru',
      timezone: 'Asia/Dubai'
    }
  },
  {
    id: 2,
    name: 'Jane Smith',
    phone: '+971 55 987 6543',
    email: 'jane.smith@email.com',
    status: 'Gold',
    segment: 'Leisure',
    residencyCountry: 'UK',
    birthDate: '1990-07-22',
    outstanding: 150,
    lifetimeValue: 28000,
    nps: 68,
    documents: [
      { id: 'CL-2-PAS', type: 'passport', name: 'Passport', url: 'https://picsum.photos/seed/id2/400/300', expiry: '2025-05-10', status: 'needs-review', number: 'UK-9900775' }
    ],
    rentals: [
      { bookingId: 1053, status: 'completed', startDate: '2024-09-16', endDate: '2024-09-17', carName: 'Lamborghini Huracan', totalAmount: 4500 },
      { bookingId: 1056, status: 'scheduled', startDate: '2024-09-20', endDate: '2024-09-21', carName: 'Bentley Continental', totalAmount: 3800 }
    ],
    payments: [
      { id: 'PAY-2210', type: 'invoice', amount: 4500, status: 'partially-paid', channel: 'card', date: '2024-09-15' },
      { id: 'PAY-2211', type: 'deposit', amount: 500, status: 'due', channel: 'cash', date: '2024-09-20' }
    ],
    notifications: [
      { id: 'NT-201', channel: 'email', subject: 'Documents для аренды', date: '2024-09-15T09:45:00Z', status: 'delivered' }
    ],
    preferences: {
      notifications: ['email'],
      language: 'en',
      timezone: 'Asia/Dubai'
    }
  },
  {
    id: 3,
    name: 'Alex Johnson',
    phone: '+971 52 555 8899',
    email: 'alex.j@email.com',
    status: 'Silver',
    segment: 'Leisure',
    residencyCountry: 'Canada',
    birthDate: '1988-11-05',
    outstanding: 0,
    lifetimeValue: 15000,
    nps: 64,
    documents: [],
    rentals: [
      { bookingId: 1054, status: 'scheduled', startDate: '2024-09-18', endDate: '2024-09-21', carName: 'Rolls-Royce Ghost', totalAmount: 8000 }
    ],
    payments: [
      { id: 'PAY-2301', type: 'invoice', amount: 8000, status: 'pending', channel: 'bank-transfer', date: '2024-09-16' }
    ],
    notifications: [],
    preferences: {
      notifications: ['email'],
      language: 'en',
      timezone: 'Asia/Dubai'
    }
  },
  {
    id: 4,
    name: 'Mia Al Farsi',
    phone: '+971 50 445 8899',
    email: 'mia.alfarsi@gmail.com',
    status: 'VIP',
    segment: 'Resident',
    outstanding: 0,
    lifetimeValue: 91000,
    nps: 84,
    documents: [
      { id: 'CL-4-EID', type: 'emirates-id', name: 'Emirates ID', url: 'https://picsum.photos/seed/mia-id/400/300', expiry: '2026-04-12', status: 'verified', number: '784-1989-4455667-2' },
      { id: 'CL-4-LIC', type: 'license', name: 'UAE Driver License', url: 'https://picsum.photos/seed/mia-lic/400/300', expiry: '2025-11-03', status: 'verified', number: 'DL-993210' }
    ],
    rentals: [
      { bookingId: 1038, status: 'completed', startDate: '2024-07-18', endDate: '2024-07-20', carName: 'Rolls-Royce Ghost', totalAmount: 9800 },
      { bookingId: 1046, status: 'completed', startDate: '2024-08-22', endDate: '2024-08-24', carName: 'Ferrari 488 Spider', totalAmount: 11200 }
    ],
    payments: [
      { id: 'PAY-3101', type: 'invoice', amount: 11200, status: 'paid', channel: 'card', date: '2024-08-20' },
      { id: 'PAY-3102', type: 'deposit', amount: 4000, status: 'returned', channel: 'card', date: '2024-08-25' }
    ],
    notifications: [
      { id: 'NT-401', channel: 'whatsapp', subject: 'Vehicle handover reminder', date: '2024-08-21T18:30:00Z', status: 'delivered' }
    ],
    preferences: {
      notifications: ['whatsapp', 'email'],
      language: 'ar',
      timezone: 'Asia/Dubai'
    }
  },
  {
    id: 5,
    name: 'Luca Moretti',
    phone: '+39 392 118 2277',
    email: 'luca.moretti@gmail.com',
    status: 'Gold',
    segment: 'Tourist',
    residencyCountry: 'Italy',
    birthDate: '1992-10-19',
    outstanding: 1200,
    lifetimeValue: 15400,
    nps: 72,
    documents: [
      { id: 'CL-5-PAS', type: 'passport', name: 'Passport (Italy)', url: 'https://picsum.photos/seed/luca-passport/400/300', expiry: '2032-01-15', status: 'verified', number: 'YA1234567' },
      { id: 'CL-5-INTL', type: 'intl-license', name: 'International Driving Permit', url: 'https://picsum.photos/seed/luca-idp/400/300', expiry: '2024-12-01', status: 'needs-review', number: 'IDP-2024-558' }
    ],
    rentals: [
      { bookingId: 1042, status: 'completed', startDate: '2024-06-05', endDate: '2024-06-08', carName: 'Lamborghini Huracan', totalAmount: 6600 }
    ],
    payments: [
      { id: 'PAY-3201', type: 'invoice', amount: 6600, status: 'paid', channel: 'card', date: '2024-06-03' },
      { id: 'PAY-3202', type: 'deposit', amount: 2000, status: 'held', channel: 'card', date: '2024-06-03' }
    ],
    notifications: [
      { id: 'NT-402', channel: 'email', subject: 'Deposit return instructions', date: '2024-06-08T21:10:00Z', status: 'delivered' }
    ],
    preferences: {
      notifications: ['email'],
      language: 'en',
      timezone: 'Europe/Rome'
    }
  },
  {
    id: 6,
    name: 'Chen Wei',
    phone: '+86 139 5500 9922',
    email: 'chen.wei@icloud.com',
    status: 'VIP',
    segment: 'Business Traveller',
    residencyCountry: 'China',
    birthDate: '1984-06-28',
    outstanding: 0,
    lifetimeValue: 30500,
    nps: 80,
    documents: [
      { id: 'CL-6-PAS', type: 'passport', name: 'Passport (China)', url: 'https://picsum.photos/seed/chen-passport/400/300', expiry: '2030-09-10', status: 'verified', number: 'E12345678' },
      { id: 'CL-6-LIC', type: 'intl-license', name: 'International Driving Permit', url: 'https://picsum.photos/seed/chen-idp/400/300', expiry: '2025-02-01', status: 'verified', number: 'IDP-CH-5521' }
    ],
    rentals: [
      { bookingId: 1048, status: 'completed', startDate: '2024-07-01', endDate: '2024-07-04', carName: 'Bentley Continental', totalAmount: 18500 }
    ],
    payments: [
      { id: 'PAY-3301', type: 'invoice', amount: 18500, status: 'paid', channel: 'card', date: '2024-06-28' }
    ],
    notifications: [
      { id: 'NT-403', channel: 'sms', subject: 'Напоминание о встрече водителя', date: '2024-07-01T08:00:00Z', status: 'delivered' }
    ],
    preferences: {
      notifications: ['sms', 'email'],
      language: 'en',
      timezone: 'Asia/Shanghai'
    }
  },
  {
    id: 7,
    name: 'Olivia Carter',
    phone: '+44 7700 993422',
    email: 'olivia.carter@gmail.com',
    status: 'Silver',
    segment: 'Influencer',
    residencyCountry: 'United Kingdom',
    birthDate: '1995-01-30',
    outstanding: 350,
    lifetimeValue: 12600,
    nps: 68,
    documents: [
      { id: 'CL-7-PAS', type: 'passport', name: 'Passport (UK)', url: 'https://picsum.photos/seed/olivia-passport/400/300', expiry: '2031-05-04', status: 'verified', number: 'UK-7766554' }
    ],
    rentals: [
      { bookingId: 1051, status: 'completed', startDate: '2024-08-08', endDate: '2024-08-10', carName: 'Ferrari 488 Spider', totalAmount: 7200 }
    ],
    payments: [
      { id: 'PAY-3401', type: 'invoice', amount: 7200, status: 'paid', channel: 'card', date: '2024-08-06' },
      { id: 'PAY-3402', type: 'deposit', amount: 2500, status: 'returned', channel: 'card', date: '2024-08-11' }
    ],
    notifications: [
      { id: 'NT-404', channel: 'whatsapp', subject: 'Скидка на продление аренды', date: '2024-08-09T17:15:00Z', status: 'delivered' }
    ],
    preferences: {
      notifications: ['whatsapp'],
      language: 'en',
      timezone: 'Europe/London'
    }
  },
  {
    id: 8,
    name: 'Amina Rahman',
    phone: '+971 55 889 0021',
    email: 'amina.rahman@outlook.com',
    status: 'Gold',
    segment: 'Resident',
    residencyCountry: 'UAE',
    birthDate: '1987-08-12',
    outstanding: 0,
    lifetimeValue: 40200,
    nps: 77,
    documents: [
      { id: 'CL-8-EID', type: 'emirates-id', name: 'Emirates ID', url: 'https://picsum.photos/seed/amina-id/400/300', expiry: '2025-09-22', status: 'verified', number: '784-1987-8899001-4' },
      { id: 'CL-8-LIC', type: 'license', name: 'UAE Driver License', url: 'https://picsum.photos/seed/amina-lic/400/300', expiry: '2026-02-17', status: 'verified', number: 'DL-778320' }
    ],
    rentals: [
      { bookingId: 1035, status: 'completed', startDate: '2024-05-20', endDate: '2024-05-23', carName: 'Rolls-Royce Ghost', totalAmount: 8450 },
      { bookingId: 1044, status: 'completed', startDate: '2024-06-29', endDate: '2024-07-02', carName: 'Mercedes G-Wagen', totalAmount: 9600 }
    ],
    payments: [
      { id: 'PAY-3501', type: 'invoice', amount: 8450, status: 'paid', channel: 'card', date: '2024-05-18' },
      { id: 'PAY-3502', type: 'invoice', amount: 9600, status: 'paid', channel: 'card', date: '2024-06-27' }
    ],
    notifications: [
      { id: 'NT-405', channel: 'email', subject: 'Ваш бонус за повторное бронирование', date: '2024-07-05T11:45:00Z', status: 'delivered' }
    ],
    preferences: {
      notifications: ['email', 'sms'],
      language: 'en',
      timezone: 'Asia/Dubai'
    }
  },
  {
    id: 9,
    name: 'Nina Petrovna',
    phone: '+971 58 332 1180',
    email: 'nina.petrovna@email.com',
    status: 'Gold',
    segment: 'Resident',
    residencyCountry: 'UAE',
    birthDate: '1993-05-08',
    outstanding: 0,
    lifetimeValue: 0,
    nps: null,
    documents: [
      { id: 'CL-9-EID', type: 'emirates-id', name: 'Emirates ID', url: 'https://picsum.photos/seed/nina-id/400/300', expiry: '2026-06-10', status: 'in-review', number: '784-1993-3344556-1' }
    ],
    rentals: [],
    payments: [],
    notifications: [],
    preferences: {
      notifications: ['email'],
      language: 'ru',
      timezone: 'Asia/Dubai'
    }
  }
];
