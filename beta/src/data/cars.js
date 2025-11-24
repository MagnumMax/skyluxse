/**
 * @fileoverview Данные о машинах в автопарке
 */

export const cars = [
  {
    id: 1,
    name: 'Rolls-Royce Ghost',
    plate: 'X123XX',
    status: 'Available',
    mileage: 15000,
    class: 'Luxury',
    segment: 'Sedan',
    imageUrl: '/images/rolls-royce-ghost.jpg',
    color: 'Black',
    year: 2023,
    insuranceExpiry: '2025-10-05',
    mulkiyaExpiry: '2025-11-20',
    utilization: 0.89,
    revenueYTD: 58200,
    serviceStatus: {
      label: 'Ready for delivery',
      lastService: '2024-08-12',
      nextService: '2024-10-12',
      mileageToService: 850
    },
    documents: [
      { id: 'DOC-GHOST-INS', type: 'insurance', name: 'Insurance policy', expiry: '2025-10-05', status: 'active', url: '/images/docs/doc-insurance.jpg', reminderDays: 30, lastCheck: '2024-09-12' },
      { id: 'DOC-GHOST-MUL', type: 'mulkiya', name: 'Mulkiya', expiry: '2025-11-20', status: 'active', url: '/images/docs/doc-mulkiya.jpg', reminderDays: 45, lastCheck: '2024-09-10' }
    ],
    documentGallery: ['/images/docs/doc-insurance.jpg', '/images/docs/doc-mulkiya.jpg'],
    inspections: [
      { date: '2024-09-10', driver: 'Ivanov I.', notes: 'Wipe the cabin and check parking sensors', photos: ['/images/inspections/inspection-damage-1.jpg', '/images/inspections/inspection-clean.jpg'] },
      { date: '2024-08-18', driver: 'Petrov P.', notes: 'No remarks', photos: ['/images/inspections/inspection-clean.jpg'] }
    ],
    maintenanceHistory: [
      { id: 'MT-120', date: '2024-08-12', type: 'Maintenance', odometer: 14200, notes: 'Service, oil change' }
    ],
    reminders: [
      { id: 'RM-ghost-ins', type: 'insurance', dueDate: '2025-09-05', status: 'scheduled' }
    ]
  },
  {
    id: 2,
    name: 'Mercedes G-Wagen',
    plate: 'Y456YY',
    status: 'In Rent',
    mileage: 25000,
    class: 'SUV',
    segment: 'SUV',
    imageUrl: '/images/mercedes-g-class.jpg',
    color: 'White',
    year: 2022,
    insuranceExpiry: '2025-08-15',
    mulkiyaExpiry: '2025-09-10',
    utilization: 0.95,
    revenueYTD: 67450,
    serviceStatus: {
      label: 'In rental',
      lastService: '2024-07-30',
      nextService: '2024-09-28',
      mileageToService: 450
    },
    documents: [
      { id: 'DOC-GWAGEN-INS', type: 'insurance', name: 'Insurance policy', expiry: '2025-08-15', status: 'active', url: '/images/docs/doc-insurance.jpg', reminderDays: 30, lastCheck: '2024-09-01' },
      { id: 'DOC-GWAGEN-MUL', type: 'mulkiya', name: 'Mulkiya', expiry: '2025-09-10', status: 'active', url: '/images/docs/doc-mulkiya.jpg', reminderDays: 30, lastCheck: '2024-09-01' }
    ],
    documentGallery: ['/images/docs/doc-insurance.jpg', '/images/docs/doc-mulkiya.jpg'],
    inspections: [
      { date: '2024-09-14', driver: 'Sidorov S.', notes: 'Polish the rear fender', photos: ['/images/inspections/inspection-damage-2.jpg'] }
    ],
    maintenanceHistory: [
      { id: 'MT-212', date: '2024-07-30', type: 'Maintenance', odometer: 23200, notes: 'Scheduled maintenance' }
    ],
    reminders: [
      { id: 'RM-gwagen-mul', type: 'mulkiya', dueDate: '2025-08-20', status: 'warning' }
    ]
  },
  {
    id: 3,
    name: 'Lamborghini Huracan',
    plate: 'Z789ZZ',
    status: 'Available',
    mileage: 8000,
    class: 'Sport',
    segment: 'Coupe',
    imageUrl: '/images/lamborghini-huracan.jpg',
    color: 'Green',
    year: 2023,
    insuranceExpiry: '2026-01-20',
    mulkiyaExpiry: '2026-02-15',
    utilization: 0.74,
    revenueYTD: 41200,
    serviceStatus: {
      label: 'Needs inspection',
      lastService: '2024-07-02',
      nextService: '2024-09-25',
      mileageToService: 350
    },
    documents: [
      { id: 'DOC-HURACAN-INS', type: 'insurance', name: 'Insurance policy', expiry: '2026-01-20', status: 'active', url: '/images/docs/doc-insurance.jpg', reminderDays: 60, lastCheck: '2024-08-29' }
    ],
    documentGallery: ['/images/docs/doc-insurance.jpg'],
    inspections: [
      { date: '2024-09-12', driver: 'Petrov P.', notes: 'Check oil level', photos: ['/images/inspections/inspection-clean.jpg'] }
    ],
    maintenanceHistory: [
      { id: 'MT-305', date: '2024-07-02', type: 'Maintenance', odometer: 7200, notes: 'Comprehensive diagnostics' }
    ],
    reminders: [
      { id: 'RM-huracan-service', type: 'maintenance', dueDate: '2024-09-24', status: 'critical' }
    ]
  },
  {
    id: 4,
    name: 'Bentley Continental',
    plate: 'A111AA',
    status: 'Maintenance',
    mileage: 32000,
    class: 'Luxury',
    segment: 'Coupe',
    imageUrl: '/images/bentley-continental.jpg',
    color: 'Silver',
    year: 2021,
    insuranceExpiry: '2025-07-30',
    mulkiyaExpiry: '2025-08-25',
    utilization: 0.63,
    revenueYTD: 38900,
    serviceStatus: {
      label: 'In maintenance',
      lastService: '2024-08-25',
      nextService: '2024-11-01',
      mileageToService: 1800
    },
    documents: [
      { id: 'DOC-BENTLEY-INS', type: 'insurance', name: 'Insurance policy', expiry: '2025-07-30', status: 'active', url: '/images/docs/doc-insurance.jpg', reminderDays: 45, lastCheck: '2024-08-30' },
      { id: 'DOC-BENTLEY-MUL', type: 'mulkiya', name: 'Mulkiya', expiry: '2025-08-25', status: 'active', url: '/images/docs/doc-mulkiya.jpg', reminderDays: 60, lastCheck: '2024-08-28' }
    ],
    documentGallery: ['/images/docs/doc-insurance.jpg', '/images/docs/doc-mulkiya.jpg'],
    inspections: [
      { date: '2024-09-05', driver: 'Ivanov I.', notes: 'Inspect suspension', photos: ['/images/inspections/inspection-damage-2.jpg'] }
    ],
    maintenanceHistory: [
      { id: 'MT-401', date: '2024-08-25', type: 'Repair', odometer: 31800, notes: 'Brake pad replacement' }
    ],
    reminders: [
      { id: 'RM-bentley-maint', type: 'maintenance', dueDate: '2024-09-22', status: 'warning' }
    ]
  },
  {
    id: 5,
    name: 'Ferrari 488 Spider',
    plate: 'B222BB',
    status: 'Available',
    mileage: 12000,
    class: 'Sport',
    segment: 'Convertible',
    imageUrl: '/images/ferrari-488-spider.jpg',
    color: 'Red',
    year: 2022,
    insuranceExpiry: '2025-12-01',
    mulkiyaExpiry: '2026-01-05',
    utilization: 0.78,
    revenueYTD: 49800,
    serviceStatus: {
      label: 'Ready for delivery',
      lastService: '2024-08-05',
      nextService: '2024-11-05',
      mileageToService: 1600
    },
    documents: [
      { id: 'DOC-FERRARI-INS', type: 'insurance', name: 'Insurance policy', expiry: '2025-12-01', status: 'active', url: '/images/docs/doc-insurance.jpg', reminderDays: 60, lastCheck: '2024-09-01' }
    ],
    documentGallery: ['/images/docs/doc-insurance.jpg'],
    inspections: [
      { date: '2024-09-11', driver: 'Sidorov S.', notes: 'Assess bumper chips', photos: ['/images/inspections/inspection-damage-1.jpg'] }
    ],
    maintenanceHistory: [
      { id: 'MT-515', date: '2024-08-05', type: 'Maintenance', odometer: 11500, notes: 'Routine maintenance' }
    ],
    reminders: [
      { id: 'RM-ferrari-detail', type: 'detailing', dueDate: '2024-09-30', status: 'scheduled' }
    ]
  }
];
