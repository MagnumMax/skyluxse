// --- MOCK DATA ---
export const MOCK_DATA = {
    cars: [
        {
            id: 1,
            name: 'Rolls-Royce Ghost',
            plate: 'X123XX',
            status: 'Available',
            mileage: 15000,
            class: 'Luxury',
            segment: 'Sedan',
            imageUrl: 'https://picsum.photos/seed/ghost/100/60',
            color: 'Black',
            year: 2023,
            insuranceExpiry: '2025-10-05',
            mulkiyaExpiry: '2025-11-20',
            utilization: 0.89,
            revenueYTD: 58200,
            serviceStatus: {
                label: 'Готов к выдаче',
                health: 0.92,
                lastService: '2024-08-12',
                nextService: '2024-10-12',
                mileageToService: 850
            },
            documents: [
                { id: 'DOC-GHOST-INS', type: 'insurance', name: 'Страховой полис', expiry: '2025-10-05', status: 'active', url: 'https://picsum.photos/seed/doc1/400/300', reminderDays: 30, lastCheck: '2024-09-12' },
                { id: 'DOC-GHOST-MUL', type: 'mulkiya', name: 'Mulkiya', expiry: '2025-11-20', status: 'active', url: 'https://picsum.photos/seed/doc2/400/300', reminderDays: 45, lastCheck: '2024-09-10' }
            ],
            documentGallery: ['https://picsum.photos/seed/doc1/400/300', 'https://picsum.photos/seed/doc2/400/300'],
            inspections: [
                { date: '2024-09-10', driver: 'Иванов И.', notes: 'Протереть салон, проверить датчики парковки', photos: ['https://picsum.photos/seed/dmg1/100/80', 'https://picsum.photos/seed/dmg2/100/80'] },
                { date: '2024-08-18', driver: 'Петров П.', notes: 'Без замечаний', photos: [] }
            ],
            maintenanceHistory: [
                { id: 'MT-120', date: '2024-08-12', type: 'Maintenance', odometer: 14200, notes: 'ТО, замена масла' }
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
            imageUrl: 'https://picsum.photos/seed/gwagen/100/60',
            color: 'White',
            year: 2022,
            insuranceExpiry: '2025-08-15',
            mulkiyaExpiry: '2025-09-10',
            utilization: 0.95,
            revenueYTD: 67450,
            serviceStatus: {
                label: 'В аренде',
                health: 0.88,
                lastService: '2024-07-30',
                nextService: '2024-09-28',
                mileageToService: 450
            },
            documents: [
                { id: 'DOC-GWAGEN-INS', type: 'insurance', name: 'Страховой полис', expiry: '2025-08-15', status: 'active', url: 'https://picsum.photos/seed/doc3/400/300', reminderDays: 30, lastCheck: '2024-09-01' },
                { id: 'DOC-GWAGEN-MUL', type: 'mulkiya', name: 'Mulkiya', expiry: '2025-09-10', status: 'active', url: 'https://picsum.photos/seed/doc4/400/300', reminderDays: 30, lastCheck: '2024-09-01' }
            ],
            documentGallery: ['https://picsum.photos/seed/doc3/400/300', 'https://picsum.photos/seed/doc4/400/300'],
            inspections: [
                { date: '2024-09-14', driver: 'Сидоров С.', notes: 'Отполировать заднее крыло', photos: ['https://picsum.photos/seed/dmg3/100/80'] }
            ],
            maintenanceHistory: [
                { id: 'MT-212', date: '2024-07-30', type: 'Maintenance', odometer: 23200, notes: 'Регламентное ТО' }
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
            imageUrl: 'https://picsum.photos/seed/huracan/100/60',
            color: 'Green',
            year: 2023,
            insuranceExpiry: '2026-01-20',
            mulkiyaExpiry: '2026-02-15',
            utilization: 0.74,
            revenueYTD: 41200,
            serviceStatus: {
                label: 'Требует проверки',
                health: 0.81,
                lastService: '2024-07-02',
                nextService: '2024-09-25',
                mileageToService: 350
            },
            documents: [
                { id: 'DOC-HURACAN-INS', type: 'insurance', name: 'Страховой полис', expiry: '2026-01-20', status: 'active', url: 'https://picsum.photos/seed/doc5/400/300', reminderDays: 60, lastCheck: '2024-08-29' }
            ],
            documentGallery: ['https://picsum.photos/seed/doc5/400/300'],
            inspections: [
                { date: '2024-09-12', driver: 'Петров П.', notes: 'Проверить уровень масла', photos: [] }
            ],
            maintenanceHistory: [
                { id: 'MT-305', date: '2024-07-02', type: 'Maintenance', odometer: 7200, notes: 'Комплексная диагностика' }
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
            imageUrl: 'https://picsum.photos/seed/bentley/100/60',
            color: 'Silver',
            year: 2021,
            insuranceExpiry: '2025-07-30',
            mulkiyaExpiry: '2025-08-25',
            utilization: 0.63,
            revenueYTD: 38900,
            serviceStatus: {
                label: 'На обслуживании',
                health: 0.72,
                lastService: '2024-08-25',
                nextService: '2024-11-01',
                mileageToService: 1800
            },
            documents: [
                { id: 'DOC-BENTLEY-INS', type: 'insurance', name: 'Страховой полис', expiry: '2025-07-30', status: 'active', url: 'https://picsum.photos/seed/doc6/400/300', reminderDays: 45, lastCheck: '2024-08-30' },
                { id: 'DOC-BENTLEY-MUL', type: 'mulkiya', name: 'Mulkiya', expiry: '2025-08-25', status: 'active', url: 'https://picsum.photos/seed/doc7/400/300', reminderDays: 60, lastCheck: '2024-08-28' }
            ],
            documentGallery: ['https://picsum.photos/seed/doc6/400/300', 'https://picsum.photos/seed/doc7/400/300'],
            inspections: [
                { date: '2024-09-05', driver: 'Иванов И.', notes: 'Проверить подвеску', photos: [] }
            ],
            maintenanceHistory: [
                { id: 'MT-401', date: '2024-08-25', type: 'Repair', odometer: 31800, notes: 'Замена тормозных колодок' }
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
            imageUrl: 'https://picsum.photos/seed/ferrari/100/60',
            color: 'Red',
            year: 2022,
            insuranceExpiry: '2025-12-01',
            mulkiyaExpiry: '2026-01-05',
            utilization: 0.78,
            revenueYTD: 49800,
            serviceStatus: {
                label: 'Готов к выдаче',
                health: 0.9,
                lastService: '2024-08-05',
                nextService: '2024-11-05',
                mileageToService: 1600
            },
            documents: [
                { id: 'DOC-FERRARI-INS', type: 'insurance', name: 'Страховой полис', expiry: '2025-12-01', status: 'active', url: 'https://picsum.photos/seed/doc8/400/300', reminderDays: 60, lastCheck: '2024-09-01' }
            ],
            documentGallery: ['https://picsum.photos/seed/doc8/400/300'],
            inspections: [
                { date: '2024-09-11', driver: 'Сидоров С.', notes: 'Уточнить сколы на бампере', photos: ['https://picsum.photos/seed/dmg4/100/80'] }
            ],
            maintenanceHistory: [
                { id: 'MT-515', date: '2024-08-05', type: 'Maintenance', odometer: 11500, notes: 'Стандартное ТО' }
            ],
            reminders: [
                { id: 'RM-ferrari-detail', type: 'detailing', dueDate: '2024-09-30', status: 'scheduled' }
            ]
        }
    ],
    drivers: [
        { id: 1, name: 'Иванов Иван', phone: '+971 50 200 1122', status: 'Available', rating: 4.8, tasksToday: 3, metrics: { sla: 0.93, customerScore: 4.9, onTimeDeliveries: 42 }, location: { lat: 25.2048, lng: 55.2708 }, lastSeen: '2024-09-18T10:45:00Z', currentTaskId: 2, skills: ['VIP сервис', 'Документы'] },
        { id: 2, name: 'Петров Петр', phone: '+971 50 765 3344', status: 'On Task', rating: 4.6, tasksToday: 4, metrics: { sla: 0.88, customerScore: 4.7, onTimeDeliveries: 36 }, location: { lat: 25.095, lng: 55.171 }, lastSeen: '2024-09-18T10:32:00Z', currentTaskId: 1, skills: ['Спорткары', 'Доставка'] },
        { id: 3, name: 'Сидоров Сидор', phone: '+971 52 554 8899', status: 'Available', rating: 4.7, tasksToday: 2, metrics: { sla: 0.91, customerScore: 4.8, onTimeDeliveries: 31 }, location: { lat: 25.236, lng: 55.315 }, lastSeen: '2024-09-18T10:10:00Z', currentTaskId: null, skills: ['VIP сервис', 'Инспекции'] }
    ],
    clients: [
        {
            id: 1,
            name: 'John Doe',
            phone: '+971 50 123 4567',
            email: 'john.doe@email.com',
            status: 'VIP',
            segment: 'Corporate',
            outstanding: 0,
            turnover: 25400,
            lifetimeValue: 72000,
            nps: 72,
            documents: [
                { id: 'CL-1-EID', type: 'emirates-id', name: 'Emirates ID', url: 'https://picsum.photos/seed/id1/400/300', expiry: '2026-02-20', status: 'verified' },
                { id: 'CL-1-LIC', type: 'license', name: 'Driving License', url: 'https://picsum.photos/seed/lic1/400/300', expiry: '2025-12-01', status: 'verified' }
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
                { id: 'NT-101', channel: 'email', subject: 'Подтверждение аренды', date: '2024-09-14T10:07:00Z', status: 'delivered' },
                { id: 'NT-102', channel: 'sms', subject: 'Напоминание о возврате', date: '2024-09-18T08:00:00Z', status: 'scheduled' }
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
            outstanding: 150,
            turnover: 12500,
            lifetimeValue: 28000,
            nps: 68,
            documents: [
                { id: 'CL-2-PAS', type: 'passport', name: 'Passport', url: 'https://picsum.photos/seed/id2/400/300', expiry: '2025-05-10', status: 'needs-review' }
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
                { id: 'NT-201', channel: 'email', subject: 'Документы для аренды', date: '2024-09-15T09:45:00Z', status: 'delivered' }
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
            outstanding: 0,
            turnover: 3200,
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
        }
    ],
    bookings: [
        {
            id: 1052,
            code: 'BK-1052',
            clientId: 1,
            clientName: 'John Doe',
            carName: 'Mercedes G-Wagen',
            startDate: '2024-09-15',
            endDate: '2024-09-18',
            startTime: '14:00',
            endTime: '18:00',
            driverId: 2,
            status: 'in-rent',
            carId: 2,
            totalAmount: 3200,
            paidAmount: 3200,
            deposit: 1000,
            priority: 'high',
            type: 'vip',
            channel: 'crm',
            segment: 'Corporate',
            pickupLocation: 'SkyLuxse HQ',
            dropoffLocation: 'Burj Khalifa Residences',
            targetTime: new Date().getTime() + 6 * 60 * 60 * 1000,
            serviceLevel: { slaMinutes: 30, promisedAt: '2024-09-15T13:30:00Z', actualAt: '2024-09-15T13:20:00Z' },
            addons: ['chauffeur', 'insurance-premium'],
            billing: { base: 2800, addons: 400, discounts: 0, currency: 'USD' },
            documents: [{ type: 'contract', status: 'signed' }],
            tags: ['vip', 'long-rent'],
            history: [
                { ts: '2024-09-14 10:05', event: 'Заказ создан' },
                { ts: '2024-09-14 10:15', event: 'Водитель П.Петров назначен' }
            ],
            timeline: [
                { ts: '2024-09-15T09:00:00Z', status: 'preparation', note: 'Авто в детейлинг боксе', actor: 'operations' },
                { ts: '2024-09-15T12:45:00Z', status: 'delivery', note: 'Водитель выехал', actor: 'driver' }
            ]
        },
        {
            id: 1053,
            code: 'BK-1053',
            clientId: 2,
            clientName: 'Jane Smith',
            carName: 'Lamborghini Huracan',
            startDate: '2024-09-16',
            endDate: '2024-09-17',
            startTime: '10:00',
            endTime: '20:00',
            driverId: 1,
            status: 'preparation',
            carId: 3,
            totalAmount: 4500,
            paidAmount: 2000,
            deposit: 800,
            priority: 'medium',
            type: 'short',
            channel: 'website',
            segment: 'Leisure',
            pickupLocation: 'Dubai Marina',
            dropoffLocation: 'Dubai Marina',
            targetTime: new Date().getTime() + 2 * 60 * 60 * 1000,
            serviceLevel: { slaMinutes: 45, promisedAt: '2024-09-16T09:15:00Z', actualAt: null },
            addons: ['basic-inspection'],
            billing: { base: 4200, addons: 300, discounts: 0, currency: 'USD' },
            documents: [{ type: 'contract', status: 'pending' }],
            tags: ['repeat-client'],
            history: [
                { ts: '2024-09-15 11:30', event: 'Заказ создан' }
            ],
            timeline: [
                { ts: '2024-09-16T07:30:00Z', status: 'preparation', note: 'Авто в мойке', actor: 'operations' }
            ]
        },
        {
            id: 1054,
            code: 'BK-1054',
            clientId: 3,
            clientName: 'Alex Johnson',
            carName: 'Rolls-Royce Ghost',
            startDate: '2024-09-18',
            endDate: '2024-09-21',
            startTime: '11:00',
            endTime: '11:00',
            driverId: null,
            status: 'new',
            carId: 1,
            totalAmount: 8000,
            paidAmount: 0,
            deposit: 1200,
            priority: 'high',
            type: 'vip',
            channel: 'referral',
            segment: 'Leisure',
            pickupLocation: 'SkyLuxse HQ',
            dropoffLocation: 'Palm Jumeirah',
            targetTime: new Date().getTime() + 1 * 24 * 60 * 60 * 1000,
            serviceLevel: { slaMinutes: 60, promisedAt: '2024-09-18T09:00:00Z', actualAt: null },
            addons: ['chauffeur'],
            billing: { base: 7200, addons: 800, discounts: 0, currency: 'USD' },
            documents: [{ type: 'contract', status: 'draft' }],
            tags: ['new-client'],
            history: [
                { ts: '2024-09-16 09:00', event: 'Заказ создан' }
            ],
            timeline: []
        },
        {
            id: 1055,
            code: 'BK-1055',
            clientId: 1,
            clientName: 'John Doe',
            carName: 'Ferrari 488 Spider',
            startDate: '2024-09-17',
            endDate: '2024-09-19',
            startTime: '16:00',
            endTime: '16:00',
            driverId: 3,
            status: 'delivery',
            carId: 5,
            totalAmount: 5500,
            paidAmount: 5500,
            deposit: 500,
            priority: 'medium',
            type: 'short',
            channel: 'crm',
            segment: 'Corporate',
            pickupLocation: 'SkyLuxse HQ',
            dropoffLocation: 'Jumeirah Beach Residence',
            targetTime: new Date().getTime() + 4 * 60 * 60 * 1000,
            serviceLevel: { slaMinutes: 30, promisedAt: '2024-09-17T15:30:00Z', actualAt: '2024-09-17T15:40:00Z' },
            addons: ['chauffeur'],
            billing: { base: 5000, addons: 500, discounts: 0, currency: 'USD' },
            documents: [{ type: 'contract', status: 'signed' }],
            tags: ['vip'],
            history: [
                { ts: '2024-09-16 14:25', event: 'Заказ создан' },
                { ts: '2024-09-16 14:30', event: 'Водитель С.Сидоров назначен' }
            ],
            timeline: [
                { ts: '2024-09-17T13:00:00Z', status: 'preparation', note: 'Авто доставлено в SkyLuxse HQ', actor: 'driver' }
            ]
        },
        {
            id: 1056,
            code: 'BK-1056',
            clientId: 2,
            clientName: 'Jane Smith',
            carName: 'Bentley Continental',
            startDate: '2024-09-20',
            endDate: '2024-09-21',
            startTime: '09:00',
            endTime: '19:00',
            driverId: 2,
            status: 'preparation',
            carId: 4,
            totalAmount: 3800,
            paidAmount: 3800,
            deposit: 600,
            priority: 'medium',
            type: 'short',
            channel: 'crm',
            segment: 'Leisure',
            pickupLocation: 'SkyLuxse HQ',
            dropoffLocation: 'Dubai Hills',
            targetTime: new Date().getTime() + 2 * 24 * 60 * 60 * 1000,
            serviceLevel: { slaMinutes: 45, promisedAt: '2024-09-20T08:15:00Z', actualAt: null },
            addons: ['basic-inspection'],
            billing: { base: 3600, addons: 200, discounts: 0, currency: 'USD' },
            documents: [{ type: 'contract', status: 'in-review' }],
            tags: ['maintenance'],
            history: [
                { ts: '2024-09-19 18:00', event: 'Заказ создан' },
                { ts: '2024-09-19 18:05', event: 'Водитель П.Петров назначен' }
            ],
            timeline: []
        },
        {
            id: 1057,
            code: 'BK-1057',
            clientId: 3,
            clientName: 'Alex Johnson',
            carName: 'Mercedes G-Wagen',
            startDate: '2024-09-20',
            endDate: '2024-09-20',
            startTime: '15:00',
            endTime: '22:00',
            driverId: 2,
            status: 'settlement',
            carId: 2,
            totalAmount: 1200,
            paidAmount: 1200,
            deposit: 400,
            priority: 'low',
            type: 'short',
            channel: 'crm',
            segment: 'Leisure',
            pickupLocation: 'SkyLuxse HQ',
            dropoffLocation: 'SkyLuxse HQ',
            targetTime: null,
            serviceLevel: { slaMinutes: 20, promisedAt: '2024-09-20T14:30:00Z', actualAt: '2024-09-20T14:35:00Z' },
            addons: [],
            billing: { base: 1200, addons: 0, discounts: 0, currency: 'USD' },
            documents: [{ type: 'contract', status: 'signed' }],
            tags: ['repeat-client'],
            history: [
                { ts: '2024-09-19 18:00', event: 'Заказ создан' },
                { ts: '2024-09-19 18:05', event: 'Водитель П.Петров назначен' }
            ],
            timeline: []
        },
        {
            id: 1058,
            code: 'BK-1058',
            clientId: 1,
            clientName: 'John Doe',
            carName: 'Lamborghini Huracan',
            startDate: '2024-09-21',
            endDate: '2024-09-22',
            startTime: '12:00',
            endTime: '12:00',
            driverId: 2,
            status: 'delivery',
            carId: 3,
            totalAmount: 4500,
            paidAmount: 4500,
            deposit: 900,
            priority: 'high',
            type: 'vip',
            channel: 'crm',
            segment: 'Corporate',
            pickupLocation: 'SkyLuxse HQ',
            dropoffLocation: 'Atlantis The Palm',
            targetTime: new Date().getTime() + 3 * 24 * 60 * 60 * 1000,
            serviceLevel: { slaMinutes: 30, promisedAt: '2024-09-21T11:30:00Z', actualAt: null },
            addons: ['chauffeur'],
            billing: { base: 4200, addons: 300, discounts: 0, currency: 'USD' },
            documents: [{ type: 'contract', status: 'draft' }],
            tags: ['vip'],
            history: [
                { ts: '2024-09-20 10:00', event: 'Заказ создан' }
            ],
            timeline: []
        }
    ],
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
            priority: 'Высокий',
            description: 'Подготовить автомобиль после мойки и доставить клиенту к 14:00. Проверить уровень топлива перед выездом.',
            checklist: [
                { id: 'chk-1', label: 'Проверить уровень топлива', required: true, completed: true },
                { id: 'chk-2', label: 'Загрузить документы клиента', required: true, completed: true },
                { id: 'chk-3', label: 'Отметить выезд', required: true, completed: false }
            ],
            requiredInputs: ['odometer', 'fuelLevel', 'photosBefore'],
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
            description: 'Забрать автомобиль после завершения аренды, зафиксировать пробег и сделать фото кузова.',
            checklist: [
                { id: 'chk-4', label: 'Получить подпись клиента', required: true, completed: false },
                { id: 'chk-5', label: 'Сделать фото кузова', required: true, completed: false }
            ],
            requiredInputs: ['odometer', 'photosAfter'],
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
            priority: 'Низкий',
            description: 'Доставить автомобиль в партнерскую химчистку и договориться о выдаче на вечер.',
            checklist: [
                { id: 'chk-6', label: 'Отметить приемку химчисткой', required: true, completed: false }
            ],
            requiredInputs: ['odoStart', 'odoEnd'],
            geo: { pickup: 'SkyLuxse HQ', dropoff: 'Premium Detailing', routeDistanceKm: 12 },
            sla: { timerMinutes: 90, startedAt: null }
        },
        {
            id: 4,
            title: 'Документы от клиента A.Johnson',
            type: 'documents',
            category: 'compliance',
            assigneeId: 2,
            status: 'done',
            deadline: '2024-09-14 18:00',
            bookingId: 1057,
            priority: 'Средний',
            description: 'Проверить оригиналы документов клиента и загрузить сканы в систему.',
            checklist: [
                { id: 'chk-7', label: 'Скан Emirates ID', required: true, completed: true },
                { id: 'chk-8', label: 'Скан водительского удостоверения', required: true, completed: true }
            ],
            requiredInputs: ['documentUpload'],
            geo: null,
            sla: { timerMinutes: 60, startedAt: '2024-09-14T16:00:00Z' }
        }
    ],
    calendarEvents: [
        { id: 'EVT-1', carId: 2, type: 'rental', title: 'Аренда BK-1052', start: '2024-09-15T14:00:00Z', end: '2024-09-18T18:00:00Z', status: 'confirmed', priority: 'high' },
        { id: 'EVT-2', carId: 4, type: 'maintenance', title: 'ТО и диагностика', start: '2024-09-20T08:00:00Z', end: '2024-09-20T18:00:00Z', status: 'scheduled', priority: 'medium' },
        { id: 'EVT-3', carId: 3, type: 'inspection', title: 'Инспекция после аренды', start: '2024-09-18T08:00:00Z', end: '2024-09-18T10:00:00Z', status: 'scheduled', priority: 'medium' },
        { id: 'EVT-4', carId: 5, type: 'detailing', title: 'Детейлинг и полировка', start: '2024-09-19T09:00:00Z', end: '2024-09-19T13:00:00Z', status: 'scheduled', priority: 'low' }
    ],
    notifications: [
        { id: 'NTC-001', title: 'Напоминание о возврате авто', channel: 'sms', priority: 'high', roleScope: ['operations', 'sales'], createdAt: '2024-09-15T08:00:00Z', status: 'scheduled' },
        { id: 'NTC-002', title: 'Документы клиента требуют проверки', channel: 'email', priority: 'medium', roleScope: ['operations', 'ceo'], createdAt: '2024-09-15T09:30:00Z', status: 'pending' },
        { id: 'NTC-003', title: 'Новая заявка из Kommo', channel: 'webhook', priority: 'medium', roleScope: ['sales'], createdAt: '2024-09-15T10:05:00Z', status: 'delivered' },
        { id: 'NTC-004', title: 'Рекомендован продлить страховку', channel: 'email', priority: 'low', roleScope: ['operations'], createdAt: '2024-09-14T19:45:00Z', status: 'delivered' }
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
                title: 'Fleet renewal for Royal Group',
                company: 'Royal Group Holdings',
                stage: 'proposal',
                value: 42000,
                currency: 'USD',
                probability: 0.55,
                ownerId: 'anna',
                source: 'Kommo',
                createdAt: '2024-09-05',
                expectedCloseDate: '2024-09-25',
                nextAction: 'Подписать SLA и согласовать предоплату',
                velocityDays: 14
            },
            {
                id: 'LD-1202',
                title: 'Event shuttle for Art Dubai',
                company: 'Art Dubai',
                stage: 'negotiation',
                value: 28500,
                currency: 'USD',
                probability: 0.65,
                ownerId: 'max',
                source: 'Kommo',
                createdAt: '2024-09-01',
                expectedCloseDate: '2024-09-21',
                nextAction: 'Утвердить финальную конфигурацию автомобилей',
                velocityDays: 18
            },
            {
                id: 'LD-1203',
                title: 'VIP Chauffeur package',
                company: 'Emirates NBD',
                stage: 'qualified',
                value: 18500,
                currency: 'USD',
                probability: 0.35,
                ownerId: 'sara',
                source: 'Website',
                createdAt: '2024-09-12',
                expectedCloseDate: '2024-09-28',
                nextAction: 'Назначить demo-выезд на 20 сентября',
                velocityDays: 5
            },
            {
                id: 'LD-1204',
                title: 'Corporate subscription for SkyTech',
                company: 'SkyTech Innovations',
                stage: 'new',
                value: 9600,
                currency: 'USD',
                probability: 0.1,
                ownerId: 'anna',
                source: 'Referral',
                createdAt: '2024-09-16',
                expectedCloseDate: '2024-10-05',
                nextAction: 'Назначить вводный звонок',
                velocityDays: 2
            },
            {
                id: 'LD-1205',
                title: 'Luxury wedding fleet',
                company: 'Wedding Planners ME',
                stage: 'won',
                value: 35800,
                currency: 'USD',
                probability: 1,
                ownerId: 'max',
                source: 'Kommo',
                createdAt: '2024-08-20',
                expectedCloseDate: '2024-09-10',
                closedAt: '2024-09-10',
                nextAction: 'Совместная с операциями подготовка расписания',
                velocityDays: 21
            }
        ]
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
            { segment: 'Corporate', share: 0.45 },
            { segment: 'Leisure', share: 0.4 },
            { segment: 'Events', share: 0.15 }
        ],
        forecast: [
            { week: 'W38', expectedRevenue: 175000, expectedBookings: 42 },
            { week: 'W39', expectedRevenue: 182000, expectedBookings: 44 },
            { week: 'W40', expectedRevenue: 191000, expectedBookings: 46 }
        ]
    },
    knowledgeBase: [
        { id: 'KB-01', category: 'Документы', title: 'Как загрузить Emirate ID', updatedAt: '2024-09-12' },
        { id: 'KB-02', category: 'Платежи', title: 'Процесс возврата депозита', updatedAt: '2024-09-10' },
        { id: 'KB-03', category: 'Аренды', title: 'Правила продления аренды', updatedAt: '2024-09-08' }
    ]
};
export const BOOKING_PRIORITIES = {
    high: { label: 'Высокий', badge: 'bg-rose-100 text-rose-700', border: 'border-rose-200', icon: 'alertTriangle' },
    medium: { label: 'Средний', badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200', icon: 'activity' },
    low: { label: 'Низкий', badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', icon: 'check' }
};

export const BOOKING_TYPES = {
    vip: { label: 'VIP', badge: 'bg-indigo-100 text-indigo-700', description: 'Персональная аренда с водителем и премиальными услугами' },
    short: { label: 'Краткосрочная', badge: 'bg-slate-100 text-slate-700', description: 'Аренда до 48 часов' },
    corporate: { label: 'Корпоративная', badge: 'bg-sky-100 text-sky-700', description: 'B2B мероприятия и долгосрочные контракты' }
};

export const CALENDAR_EVENT_TYPES = {
    rental: { label: 'Аренда', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
    maintenance: { label: 'Обслуживание', color: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
    inspection: { label: 'Инспекция', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
    detailing: { label: 'Детейлинг', color: 'bg-purple-100 text-purple-700', border: 'border-purple-200' }
};

export const TASK_TYPES = {
    delivery: {
        label: 'Доставка',
        icon: 'navigation',
        color: 'bg-indigo-50 text-indigo-700',
        required: ['odometer', 'fuelLevel', 'photosBefore'],
        slaMinutes: 120,
        checklist: [
            { idSuffix: 'fuel', label: 'Проверить уровень топлива', required: true },
            { idSuffix: 'documents', label: 'Убедиться в комплекте документов', required: true },
            { idSuffix: 'photos', label: 'Сделать фото перед выдачей', required: false }
        ]
    },
    pickup: {
        label: 'Забор авто',
        icon: 'truck',
        color: 'bg-sky-50 text-sky-700',
        required: ['odometer', 'photosAfter'],
        slaMinutes: 90,
        checklist: [
            { idSuffix: 'signature', label: 'Получить подпись клиента', required: true },
            { idSuffix: 'damage', label: 'Зафиксировать повреждения', required: true }
        ]
    },
    maintenance: {
        label: 'Обслуживание',
        icon: 'wrench',
        color: 'bg-amber-50 text-amber-700',
        required: ['odoStart', 'odoEnd'],
        slaMinutes: 240,
        checklist: [
            { idSuffix: 'inspection', label: 'Заполнить чек-лист ТО', required: true },
            { idSuffix: 'report', label: 'Добавить отчет механика', required: false }
        ]
    },
    documents: {
        label: 'Документы',
        icon: 'fileText',
        color: 'bg-emerald-50 text-emerald-700',
        required: ['documentUpload'],
        slaMinutes: 60,
        checklist: [
            { idSuffix: 'scan', label: 'Загрузить сканы', required: true },
            { idSuffix: 'review', label: 'Отметить результат проверки', required: true }
        ]
    }
};

export const NOTIFICATION_CHANNELS = {
    email: { label: 'Email', badge: 'bg-blue-100 text-blue-700', icon: 'mail' },
    sms: { label: 'SMS', badge: 'bg-emerald-100 text-emerald-700', icon: 'messageCircle' },
    push: { label: 'Push', badge: 'bg-indigo-100 text-indigo-700', icon: 'bell' },
    webhook: { label: 'Webhook', badge: 'bg-slate-100 text-slate-700', icon: 'cloud' }
};

export const KANBAN_STATUS_META = {
    new: {
        label: 'Новая заявка',
        group: 'Intake',
        accent: 'bg-slate-100',
        accentBorder: 'border-slate-200',
        allowedTransitions: ['preparation'],
        blockers: ['missingDocuments'],
        slaMinutes: 120,
        description: 'Заявка создана вручную или импортирована из Kommo.'
    },
    preparation: {
        label: 'Подготовка авто',
        group: 'Operations',
        accent: 'bg-violet-100',
        accentBorder: 'border-violet-200',
        allowedTransitions: ['delivery'],
        blockers: ['noDriverAssigned'],
        slaMinutes: 90,
        description: 'Детейлинг, проверка документов, подготовка комплекта ключей.'
    },
    delivery: {
        label: 'Ожидает доставки',
        group: 'Operations',
        accent: 'bg-indigo-100',
        accentBorder: 'border-indigo-200',
        allowedTransitions: ['in-rent', 'settlement'],
        blockers: ['paymentPending'],
        slaMinutes: 60,
        description: 'Водитель в пути или ожидает клиента.'
    },
    'in-rent': {
        label: 'В аренде',
        group: 'Live',
        accent: 'bg-blue-100',
        accentBorder: 'border-blue-200',
        allowedTransitions: ['settlement'],
        blockers: [],
        slaMinutes: 0,
        description: 'Аренда активна, отслеживаем SLA и платежи.'
    },
    settlement: {
        label: 'Возврат и расчет',
        group: 'Closing',
        accent: 'bg-emerald-100',
        accentBorder: 'border-emerald-200',
        allowedTransitions: [],
        blockers: ['finesPending'],
        slaMinutes: 45,
        description: 'Финальная инспекция, фиксируем штрафы и возврат депозита.'
    }
};

export const ROLE_EMAIL_PRESETS = {
    operations: 'ops@skyluxse.ae',
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
        name: 'Operations Manager',
        label: 'Операционный менеджер',
        email: 'ops@skyluxse.ae',
        defaultPage: 'bookings',
        layout: 'desktop',
        nav: [
            { id: 'bookings', name: 'Заказы', icon: 'kanban' },
            { id: 'tasks', name: 'Задачи', icon: 'clipboardCheck' },
            { id: 'fleet-calendar', name: 'Календарь парка', icon: 'calendar' },
            { id: 'fleet-table', name: 'Автопарк', icon: 'car' },
            { id: 'clients-table', name: 'Клиенты', icon: 'users' },
            { id: 'notifications', name: 'Уведомления', icon: 'bell' }
        ],
        permissions: {
            canAssignDrivers: true,
            canManageCalendar: true,
            canAccessReports: false,
            canViewClientPortal: false
        }
    },
    sales: {
        name: 'Sales Manager',
        label: 'Менеджер по продажам',
        email: 'sales@skyluxse.ae',
        defaultPage: 'sales-pipeline',
        layout: 'desktop',
        nav: [
            { id: 'sales-pipeline', name: 'Pipeline', icon: 'pipeline' },
            { id: 'bookings', name: 'Заказы', icon: 'kanban' },
            { id: 'clients-table', name: 'Клиенты', icon: 'users' },
            { id: 'analytics', name: 'Аналитика', icon: 'chart' }
        ],
        permissions: {
            canAssignDrivers: false,
            canManageCalendar: false,
            canAccessReports: true,
            canViewClientPortal: true
        }
    },
    ceo: {
        name: 'CEO',
        label: 'Руководство',
        email: 'ceo@skyluxse.ae',
        defaultPage: 'dashboard',
        layout: 'desktop',
        nav: [
            { id: 'dashboard', name: 'Дашборд', icon: 'layoutDashboard' },
            { id: 'analytics', name: 'Аналитика', icon: 'chart' },
            { id: 'reports', name: 'Отчеты', icon: 'fileText' },
            { id: 'notifications', name: 'Уведомления', icon: 'bell' }
        ],
        permissions: {
            canAssignDrivers: false,
            canManageCalendar: false,
            canAccessReports: true,
            canViewClientPortal: true
        }
    },
    driver: {
        name: 'Водитель',
        label: 'Водитель',
        email: 'driver@skyluxse.ae',
        defaultPage: 'driver-tasks',
        layout: 'mobile',
        nav: []
    },
    client: {
        name: 'Клиент',
        label: 'Клиент',
        email: 'client@skyluxse.ae',
        defaultPage: 'client-dashboard',
        layout: 'portal',
        nav: [
            { id: 'client-dashboard', name: 'Обзор', icon: 'layoutDashboard' },
            { id: 'client-rentals', name: 'Аренды', icon: 'calendar' },
            { id: 'client-payments', name: 'Платежи', icon: 'creditCard' },
            { id: 'client-documents', name: 'Документы', icon: 'fileText' },
            { id: 'client-faq', name: 'FAQ', icon: 'helpCircle' }
        ],
        permissions: {
            canAssignDrivers: false,
            canManageCalendar: false,
            canAccessReports: false,
            canViewClientPortal: true
        }
    }
};
