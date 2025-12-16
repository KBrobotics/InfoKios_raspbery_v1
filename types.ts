export enum NotificationType {
  MEDICAL = 'MEDICAL',
  TRAINING = 'TRAINING',
  INFO = 'INFO',
  URGENT = 'URGENT'
}

export interface Notification {
  id: string;
  employeeId: string;
  type: NotificationType;
  title: string;
  description: string;
  createdAt: string;
  dueDate?: string;
  isRead: boolean;
}

export type WorkStatus = 'active' | 'inactive';

export interface Employee {
  id: string;
  rfidTag: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  color: string;
  workStatus: WorkStatus; // Czy pracownik jest aktualnie "w pracy"
  lastWorkAction?: string; // Data ostatniej akcji
}

export interface AppState {
  view: 'KIOSK' | 'ADMIN';
  currentUser: Employee | null;
  notifications: Notification[];
}