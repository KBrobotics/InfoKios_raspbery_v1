import { Employee, Notification, WorkStatus } from '../types';
import { MOCK_EMPLOYEES, MOCK_NOTIFICATIONS } from '../constants';

// FLAGA KONFIGURACYJNA
const USE_REAL_API = false;
const API_BASE_URL = "http://localhost:3000/api"; 

// --- IMPLEMENTACJA MOCK (Testowa) ---
const DELAY = 600;
let mockEmployees = [...MOCK_EMPLOYEES];
let mockNotifications = [...MOCK_NOTIFICATIONS];

const mockImplementation = {
  getEmployeeByRFID: (rfidTag: string): Promise<Employee | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const employee = mockEmployees.find(e => e.rfidTag === rfidTag);
        resolve(employee ? { ...employee } : null); // Return copy to update UI correctly
      }, DELAY);
    });
  },

  getAllEmployees: (): Promise<Employee[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockEmployees), DELAY / 2);
    });
  },

  updateEmployee: (updatedEmployee: Employee): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        mockEmployees = mockEmployees.map(e => e.id === updatedEmployee.id ? updatedEmployee : e);
        resolve();
      }, DELAY / 2);
    });
  },

  importEmployees: (employees: Employee[]): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        mockEmployees = employees;
        resolve();
      }, DELAY);
    });
  },

  getNotificationsForEmployee: (employeeId: string): Promise<Notification[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const userNotes = mockNotifications.filter(n => n.employeeId === employeeId);
        userNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(userNotes);
      }, DELAY);
    });
  },

  addNotification: (notification: Notification): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        mockNotifications = [notification, ...mockNotifications];
        resolve();
      }, DELAY / 2);
    });
  },

  deleteNotification: (notificationId: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        mockNotifications = mockNotifications.filter(n => n.id !== notificationId);
        resolve();
      }, DELAY / 2);
    });
  },

  // Nowa metoda RCP
  registerWorkLog: (employeeId: string, status: WorkStatus): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        mockEmployees = mockEmployees.map(e => {
          if (e.id === employeeId) {
            return { ...e, workStatus: status, lastWorkAction: new Date().toISOString() };
          }
          return e;
        });
        resolve();
      }, DELAY / 2);
    });
  }
};

// --- IMPLEMENTACJA REAL (Prawdziwa Baza Danych) ---
const apiImplementation = {
  getEmployeeByRFID: async (rfidTag: string): Promise<Employee | null> => {
    const res = await fetch(`${API_BASE_URL}/employees/rfid/${rfidTag}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("API Error");
    return res.json();
  },

  getAllEmployees: async (): Promise<Employee[]> => {
    const res = await fetch(`${API_BASE_URL}/employees`);
    return res.json();
  },

  updateEmployee: async (updatedEmployee: Employee): Promise<void> => {
    await fetch(`${API_BASE_URL}/employees/${updatedEmployee.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedEmployee)
    });
  },

  importEmployees: async (employees: Employee[]): Promise<void> => {
    await fetch(`${API_BASE_URL}/employees/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employees })
    });
  },

  getNotificationsForEmployee: async (employeeId: string): Promise<Notification[]> => {
    const res = await fetch(`${API_BASE_URL}/employees/${employeeId}/notifications`);
    return res.json();
  },

  addNotification: async (notification: Notification): Promise<void> => {
    await fetch(`${API_BASE_URL}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification)
    });
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
      method: 'DELETE'
    });
  },

  registerWorkLog: async (employeeId: string, status: WorkStatus): Promise<void> => {
    await fetch(`${API_BASE_URL}/worklogs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, status, timestamp: new Date().toISOString() })
    });
  }
};

export const dbService = USE_REAL_API ? apiImplementation : mockImplementation;