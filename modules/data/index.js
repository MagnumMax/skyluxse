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
            imageUrl: 'public/images/rolls-royce-ghost.jpg',
            color: 'Black',
            year: 2023,
            insuranceExpiry: '2025-10-05',
            mulkiyaExpiry: '2025-11-20',
            utilization: 0.89,
            revenueYTD: 58200,
            serviceStatus: {
                label: 'Ready for delivery',
                health: 0.92,
                lastService: '2024-08-12',
                nextService: '2024-10-12',
                mileageToService: 850
            },
            documents: [
                { id: 'DOC-GHOST-INS', type: 'insurance', name: 'Insurance policy', expiry: '2025-10-05', status: 'active', url: 'public/images/docs/doc-insurance.jpg', reminderDays: 30, lastCheck: '2024-09-12' },
                { id: 'DOC-GHOST-MUL', type: 'mulkiya', name: 'Mulkiya', expiry: '2025-11-20', status: 'active', url: 'public/images/docs/doc-mulkiya.jpg', reminderDays: 45, lastCheck: '2024-09-10' }
            ],
            documentGallery: ['public/images/docs/doc-insurance.jpg', 'public/images/docs/doc-mulkiya.jpg'],
            inspections: [
                { date: '2024-09-10', driver: 'Ivanov I.', notes: 'Wipe the cabin and check parking sensors', photos: ['public/images/inspections/inspection-damage-1.jpg', 'public/images/inspections/inspection-clean.jpg'] },
                { date: '2024-08-18', driver: 'Petrov P.', notes: 'No remarks', photos: ['public/images/inspections/inspection-clean.jpg'] }
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
            imageUrl: 'public/images/mercedes-g-class.jpg',
            color: 'White',
            year: 2022,
            insuranceExpiry: '2025-08-15',
            mulkiyaExpiry: '2025-09-10',
            utilization: 0.95,
            revenueYTD: 67450,
            serviceStatus: {
                label: 'In rental',
                health: 0.88,
                lastService: '2024-07-30',
                nextService: '2024-09-28',
                mileageToService: 450
            },
            documents: [
                { id: 'DOC-GWAGEN-INS', type: 'insurance', name: 'Insurance policy', expiry: '2025-08-15', status: 'active', url: 'public/images/docs/doc-insurance.jpg', reminderDays: 30, lastCheck: '2024-09-01' },
                { id: 'DOC-GWAGEN-MUL', type: 'mulkiya', name: 'Mulkiya', expiry: '2025-09-10', status: 'active', url: 'public/images/docs/doc-mulkiya.jpg', reminderDays: 30, lastCheck: '2024-09-01' }
            ],
            documentGallery: ['public/images/docs/doc-insurance.jpg', 'public/images/docs/doc-mulkiya.jpg'],
            inspections: [
                { date: '2024-09-14', driver: 'Sidorov S.', notes: 'Polish the rear fender', photos: ['public/images/inspections/inspection-damage-2.jpg'] }
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
            imageUrl: 'public/images/lamborghini-huracan.jpg',
            color: 'Green',
            year: 2023,
            insuranceExpiry: '2026-01-20',
            mulkiyaExpiry: '2026-02-15',
            utilization: 0.74,
            revenueYTD: 41200,
            serviceStatus: {
                label: 'Needs inspection',
                health: 0.81,
                lastService: '2024-07-02',
                nextService: '2024-09-25',
                mileageToService: 350
            },
            documents: [
                { id: 'DOC-HURACAN-INS', type: 'insurance', name: 'Insurance policy', expiry: '2026-01-20', status: 'active', url: 'public/images/docs/doc-insurance.jpg', reminderDays: 60, lastCheck: '2024-08-29' }
            ],
            documentGallery: ['public/images/docs/doc-insurance.jpg'],
            inspections: [
                { date: '2024-09-12', driver: 'Petrov P.', notes: 'Check oil level', photos: ['public/images/inspections/inspection-clean.jpg'] }
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
            imageUrl: 'public/images/bentley-continental.jpg',
            color: 'Silver',
            year: 2021,
            insuranceExpiry: '2025-07-30',
            mulkiyaExpiry: '2025-08-25',
            utilization: 0.63,
            revenueYTD: 38900,
            serviceStatus: {
                label: 'In maintenance',
                health: 0.72,
                lastService: '2024-08-25',
                nextService: '2024-11-01',
                mileageToService: 1800
            },
            documents: [
                { id: 'DOC-BENTLEY-INS', type: 'insurance', name: 'Insurance policy', expiry: '2025-07-30', status: 'active', url: 'public/images/docs/doc-insurance.jpg', reminderDays: 45, lastCheck: '2024-08-30' },
                { id: 'DOC-BENTLEY-MUL', type: 'mulkiya', name: 'Mulkiya', expiry: '2025-08-25', status: 'active', url: 'public/images/docs/doc-mulkiya.jpg', reminderDays: 60, lastCheck: '2024-08-28' }
            ],
            documentGallery: ['public/images/docs/doc-insurance.jpg', 'public/images/docs/doc-mulkiya.jpg'],
            inspections: [
                { date: '2024-09-05', driver: 'Ivanov I.', notes: 'Inspect suspension', photos: ['public/images/inspections/inspection-damage-2.jpg'] }
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
            imageUrl: 'public/images/ferrari-488-spider.jpg',
            color: 'Red',
            year: 2022,
            insuranceExpiry: '2025-12-01',
            mulkiyaExpiry: '2026-01-05',
            utilization: 0.78,
            revenueYTD: 49800,
            serviceStatus: {
                label: 'Ready for delivery',
                health: 0.9,
                lastService: '2024-08-05',
                nextService: '2024-11-05',
                mileageToService: 1600
            },
            documents: [
                { id: 'DOC-FERRARI-INS', type: 'insurance', name: 'Insurance policy', expiry: '2025-12-01', status: 'active', url: 'public/images/docs/doc-insurance.jpg', reminderDays: 60, lastCheck: '2024-09-01' }
            ],
            documentGallery: ['public/images/docs/doc-insurance.jpg'],
            inspections: [
                { date: '2024-09-11', driver: 'Sidorov S.', notes: 'Assess bumper chips', photos: ['public/images/inspections/inspection-damage-1.jpg'] }
            ],
            maintenanceHistory: [
                { id: 'MT-515', date: '2024-08-05', type: 'Maintenance', odometer: 11500, notes: 'Routine maintenance' }
            ],
            reminders: [
                { id: 'RM-ferrari-detail', type: 'detailing', dueDate: '2024-09-30', status: 'scheduled' }
            ]
        }
    ],
    drivers: [
        { id: 1, name: 'Ivan Ivanov', phone: '+971 50 200 1122', status: 'Available', rating: 4.8, tasksToday: 3, metrics: { sla: 0.93, customerScore: 4.9, onTimeDeliveries: 42 }, location: { lat: 25.2048, lng: 55.2708 }, lastSeen: '2024-09-18T10:45:00Z', currentTaskId: 2, skills: ['VIP service', 'Documents'] },
        { id: 2, name: 'Peter Petrov', phone: '+971 50 765 3344', status: 'On Task', rating: 4.6, tasksToday: 4, metrics: { sla: 0.88, customerScore: 4.7, onTimeDeliveries: 36 }, location: { lat: 25.095, lng: 55.171 }, lastSeen: '2024-09-18T10:32:00Z', currentTaskId: 1, skills: ['Sports cars', 'Delivery'] },
        { id: 3, name: 'Sergey Sidorov', phone: '+971 52 554 8899', status: 'Available', rating: 4.7, tasksToday: 2, metrics: { sla: 0.91, customerScore: 4.8, onTimeDeliveries: 31 }, location: { lat: 25.236, lng: 55.315 }, lastSeen: '2024-09-18T10:10:00Z', currentTaskId: null, skills: ['VIP service', 'Inspections'] }
    ],
    clients: [
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
            turnover: 25400,
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
            turnover: 12500,
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
        },
        {
            id: 4,
            name: 'Mia Al Farsi',
            phone: '+971 50 445 8899',
            email: 'mia.alfarsi@gmail.com',
            status: 'VIP',
            segment: 'Resident',
            outstanding: 0,
            turnover: 56200,
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
            turnover: 12800,
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
            turnover: 18800,
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
            turnover: 9400,
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
            turnover: 23800,
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
            turnover: 0,
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
    ],
    bookings: [
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
                { id: 'INV-1052-2', label: 'Security deposit hold', amount: 4000, status: 'Authorized', issuedDate: '2025-10-10', dueDate: '2025-10-13' }
            ],
            documents: [{ type: 'contract', status: 'signed' }, { type: 'deposit', status: 'authorized' }],
            tags: ['vip', 'long-rent'],
            history: [
                { ts: '2025-10-10 11:05', event: 'Запрос получен из Kommo' },
                { ts: '2025-10-11 09:20', event: 'Водитель I.Ivanov назначен' }
            ],
            timeline: [
                { ts: '2025-10-12T15:00:00Z', status: 'preparation', note: 'Детейлинг и проверка комплекта документов', actor: 'operations' },
                { ts: '2025-10-13T08:00:00Z', status: 'delivery', note: 'Авто выехало к клиенту', actor: 'driver' }
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
            pickupLocation: 'Dubai International Airport',
            dropoffLocation: 'SkyLuxse HQ',
            targetTime: Date.parse('2025-10-14T07:30:00Z'),
            serviceLevel: { slaMinutes: 40, promisedAt: '2025-10-14T07:30:00Z', actualAt: '2025-10-14T07:40:00Z' },
            addons: ['chauffeur', 'executive-pack'],
            billing: { base: 8800, addons: 1000, discounts: 0, currency: 'AED' },
            documents: [{ type: 'contract', status: 'signed' }, { type: 'nda', status: 'signed' }],
            tags: ['corporate', 'international'],
            history: [
                { ts: '2025-10-09 13:15', event: 'Лид из Instagram кампании' },
                { ts: '2025-10-10 09:45', event: 'Подтверждение маршрута' }
            ],
            timeline: [
                { ts: '2025-10-14T07:00:00Z', status: 'preparation', note: 'VIP-комплект загружен в авто', actor: 'operations' },
                { ts: '2025-10-14T08:00:00Z', status: 'delivery', note: 'Встреча клиента у терминала 1', actor: 'driver' }
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
        { id: 'EVT-1', carId: 2, type: 'rental', title: 'Аренда BK-1052', start: '2025-10-12T14:00:00Z', end: '2025-10-15T18:00:00Z', status: 'confirmed', priority: 'high' },
        { id: 'EVT-2', carId: 4, type: 'maintenance', title: 'ТО и диагностика', start: '2025-10-20T08:00:00Z', end: '2025-10-20T18:00:00Z', status: 'scheduled', priority: 'medium' },
        { id: 'EVT-3', carId: 3, type: 'inspection', title: 'Инспекция после аренды', start: '2025-10-16T08:00:00Z', end: '2025-10-16T10:00:00Z', status: 'scheduled', priority: 'medium' },
        { id: 'EVT-4', carId: 5, type: 'detailing', title: 'Detailing и полировка', start: '2025-10-18T09:00:00Z', end: '2025-10-18T13:00:00Z', status: 'scheduled', priority: 'low' },
        { id: 'EVT-5', carId: 1, type: 'rental', title: 'Аренда BK-1059', start: '2025-10-23T09:00:00Z', end: '2025-10-26T20:00:00Z', status: 'pending', priority: 'medium' },
        { id: 'EVT-6', carId: 4, type: 'maintenance', title: 'Расширенное ТО подвески', start: '2025-10-14T07:00:00Z', end: '2025-10-14T16:00:00Z', status: 'scheduled', priority: 'high' },
        { id: 'EVT-7', carId: 3, type: 'maintenance', title: 'ТО-60 после трека', start: '2025-10-15T06:30:00Z', end: '2025-10-15T14:30:00Z', status: 'scheduled', priority: 'high' },
        { id: 'EVT-8', carId: 5, type: 'maintenance', title: 'ТО и диагностика КПП', start: '2025-10-16T08:00:00Z', end: '2025-10-16T17:00:00Z', status: 'scheduled', priority: 'medium' },
        { id: 'EVT-9', carId: 2, type: 'maintenance', title: 'Brake pad replacement', start: '2025-10-17T07:30:00Z', end: '2025-10-17T15:30:00Z', status: 'scheduled', priority: 'high' },
        { id: 'EVT-10', carId: 1, type: 'rental', title: 'Аренда BK-1060', start: '2025-10-18T10:00:00Z', end: '2025-10-20T18:00:00Z', status: 'confirmed', priority: 'medium' }
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
    high: { label: 'High', badge: 'bg-rose-100 text-rose-700', border: 'border-rose-200', icon: 'alertTriangle' },
    medium: { label: 'Medium', badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200', icon: 'activity' },
    low: { label: 'Low', badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', icon: 'check' }
};

export const BOOKING_TYPES = {
    vip: { label: 'VIP', badge: 'bg-indigo-100 text-indigo-700', description: 'Personal rental with driver and premium services' },
    short: { label: 'Short-term', badge: 'bg-slate-100 text-slate-700', description: 'Rental up to 48 hours' },
    corporate: { label: 'Corporate', badge: 'bg-sky-100 text-sky-700', description: 'B2B events and long-term contracts' }
};

export const CALENDAR_EVENT_TYPES = {
    rental: { label: 'Rental', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
    maintenance: { label: 'Maintenance', color: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
    inspection: { label: 'Inspection', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
    detailing: { label: 'Detailing', color: 'bg-purple-100 text-purple-700', border: 'border-purple-200' }
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
        group: 'Operations',
        accent: 'bg-violet-100',
        accentBorder: 'border-violet-200',
        allowedTransitions: ['delivery'],
        blockers: ['noDriverAssigned'],
        slaMinutes: 90,
        description: 'Detailing, document verification, key set preparation.'
    },
    delivery: {
        label: 'Awaiting delivery',
        group: 'Operations',
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
        label: 'Operations Manager',
        email: 'ops@skyluxse.ae',
        defaultPage: 'fleet-calendar',
        layout: 'desktop',
        nav: [
            { id: 'fleet-calendar', name: 'Fleet Calendar', icon: 'calendar' },
            { id: 'tasks', name: 'Tasks', icon: 'clipboardCheck' },
            { id: 'fleet-table', name: 'Fleet', icon: 'car' },
            { id: 'clients-table', name: 'Clients', icon: 'users' }
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
        label: 'Sales Manager',
        email: 'sales@skyluxse.ae',
        defaultPage: 'fleet-calendar',
        layout: 'desktop',
        nav: [
            { id: 'fleet-calendar', name: "Fleet Calendar", icon: "calendar" },
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
            { id: 'analytics', name: 'Analytics', icon: 'chart' }
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
