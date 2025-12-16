import { Employee, Notification, NotificationType } from './types';

// Simulate an external database of employees
export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'emp-001',
    rfidTag: 'RFID-001',
    firstName: 'Jan',
    lastName: 'Kowalski',
    position: 'Senior Engineer',
    department: 'Production',
    color: '#2563eb', // blue-600
    workStatus: 'inactive'
  },
  {
    id: 'emp-002',
    rfidTag: 'RFID-002',
    firstName: 'Anna',
    lastName: 'Nowak',
    position: 'HR Specialist',
    department: 'Human Resources',
    color: '#db2777', // pink-600
    workStatus: 'active'
  },
  {
    id: 'emp-003',
    rfidTag: 'RFID-003',
    firstName: 'Piotr',
    lastName: 'Wisniewski',
    position: 'Logistics Manager',
    department: 'Logistics',
    color: '#059669', // emerald-600
    workStatus: 'inactive'
  }
];

// Initial mock notifications
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'not-001',
    employeeId: 'emp-001',
    type: NotificationType.MEDICAL,
    title: 'Badania Okresowe',
    description: 'Twoje badania okresowe tracą ważność za 14 dni. Zgłoś się do HR po skierowanie.',
    createdAt: new Date().toISOString(),
    dueDate: '2023-12-31',
    isRead: false
  },
  {
    id: 'not-002',
    employeeId: 'emp-001',
    type: NotificationType.TRAINING,
    title: 'Szkolenie BHP',
    description: 'Przypomnienie o obowiązkowym szkoleniu BHP online.',
    createdAt: new Date().toISOString(),
    isRead: false
  },
  {
    id: 'not-003',
    employeeId: 'emp-002',
    type: NotificationType.INFO,
    title: 'Spotkanie Zespołowe',
    description: 'Jutro o 9:00 spotkanie całego działu w sali 102.',
    createdAt: new Date().toISOString(),
    isRead: false
  }
];