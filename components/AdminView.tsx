import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/dbService';
import { nodeRedSocket } from '../services/nodeRedSocket';
import { Employee, Notification, NotificationType } from '../types';
import { 
  User, 
  ArrowLeft, 
  Search, 
  Save, 
  Plus, 
  Trash2, 
  Bell, 
  Briefcase, 
  CreditCard,
  Building,
  Settings,
  Wifi,
  WifiOff,
  Server,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  Palette,
  Timer,
  CheckCircle2,
  Gamepad2
} from 'lucide-react';
import { NotificationCard } from './NotificationCard';

interface AdminViewProps {
  onBack: () => void;
}

const AVATAR_COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#d97706', // amber
  '#059669', // emerald
  '#7c3aed', // violet
  '#db2777', // pink
  '#0891b2', // cyan
  '#475569', // slate
];

export const AdminView: React.FC<AdminViewProps> = ({ onBack }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Employee Data
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeNotifications, setEmployeeNotifications] = useState<Notification[]>([]);
  
  // Notification Form State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteMsg, setNoteMsg] = useState('');
  const [noteType, setNoteType] = useState<NotificationType>(NotificationType.INFO);
  const [noteDate, setNoteDate] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // System Settings State
  const [wsUrl, setWsUrl] = useState(nodeRedSocket.getUrl());
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | undefined>(undefined);
  const [savedWsUrl, setSavedWsUrl] = useState(false);

  // App Settings State
  const [logoutTime, setLogoutTime] = useState(15);
  const [showSimulator, setShowSimulator] = useState(true);
  const [savedAppSettings, setSavedAppSettings] = useState(false);

  useEffect(() => {
    loadEmployees();
    
    // Load config
    const savedTime = localStorage.getItem('kiosk_logout_time');
    if (savedTime) setLogoutTime(parseInt(savedTime, 10));

    const savedSim = localStorage.getItem('kiosk_show_simulator');
    if (savedSim !== null) setShowSimulator(savedSim === 'true');

    // Subscribe to WS status
    const unsub = nodeRedSocket.onStatusChange((status, error) => {
      setIsWsConnected(status);
      setWsError(error);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedEmpId) {
      loadEmployeeDetails(selectedEmpId);
    } else {
      setEditingEmployee(null);
      setEmployeeNotifications([]);
    }
  }, [selectedEmpId]);

  const loadEmployees = () => {
    setLoading(true);
    dbService.getAllEmployees().then((data) => {
      setEmployees(data);
      setLoading(false);
    });
  };

  const loadEmployeeDetails = async (id: string) => {
    const emp = employees.find(e => e.id === id);
    if (emp) setEditingEmployee({ ...emp });
    
    const notes = await dbService.getNotificationsForEmployee(id);
    setEmployeeNotifications(notes);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setSavingProfile(true);
    await dbService.updateEmployee(editingEmployee);
    
    // Update local list
    setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? editingEmployee : emp));
    setSavingProfile(false);
    alert("Dane pracownika zostały zaktualizowane.");
  };

  const handleAddNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !noteTitle || !noteMsg) return;

    setSendingNote(true);
    const newNote: Notification = {
      id: `not-${Date.now()}`,
      employeeId: selectedEmpId,
      type: noteType,
      title: noteTitle,
      description: noteMsg,
      createdAt: new Date().toISOString(),
      dueDate: noteDate || undefined,
      isRead: false
    };

    await dbService.addNotification(newNote);
    
    // Refresh list
    const notes = await dbService.getNotificationsForEmployee(selectedEmpId);
    setEmployeeNotifications(notes);
    
    // Reset form
    setNoteTitle('');
    setNoteMsg('');
    setNoteDate('');
    setSendingNote(false);
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć to powiadomienie?")) return;
    await dbService.deleteNotification(id);
    if (selectedEmpId) {
      const notes = await dbService.getNotificationsForEmployee(selectedEmpId);
      setEmployeeNotifications(notes);
    }
  };

  const handleSaveWsSettings = (e: React.FormEvent) => {
    e.preventDefault();
    nodeRedSocket.setUrl(wsUrl);
    setSavedWsUrl(true);
    setTimeout(() => setSavedWsUrl(false), 2000);
  };

  const handleSaveAppSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('kiosk_logout_time', logoutTime.toString());
    localStorage.setItem('kiosk_show_simulator', String(showSimulator));
    setSavedAppSettings(true);
    setTimeout(() => setSavedAppSettings(false), 2000);
  };

  // --- CSV IMPORT LOGIC ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      alert("Proszę wybrać plik CSV.");
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const importedEmployees = parseCSV(text);
        if (importedEmployees.length > 0) {
          if (confirm(`Znaleziono ${importedEmployees.length} pracowników. Czy chcesz zaimportować ich do bazy? Istniejąca baza zostanie zaktualizowana.`)) {
             await dbService.importEmployees(importedEmployees);
             await loadEmployees();
             alert("Import zakończony sukcesem!");
          }
        } else {
          alert("Nie znaleziono poprawnych danych w pliku CSV.");
        }
      } catch (error) {
        console.error(error);
        alert("Błąd podczas przetwarzania pliku CSV. Sprawdź format.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    
    reader.readAsText(file);
  };

  const parseCSV = (csvText: string): Employee[] => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    // Oczekiwany format nagłówka: uid,name1,name2,idx,parent,flag
    
    // Zakładamy, że pierwszy wiersz to nagłówek
    const newEmployees: Employee[] = [];
    
    // Iterujemy od 2 linii (index 1), pomijając nagłówek
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      
      if (cols.length < 3) continue;

      const uid = cols[0];
      const name1 = cols[1]; // Imię
      const name2 = cols[2]; // Nazwisko
      // const idx = cols[3];
      // const parent = cols[4];
      const flag = cols[5];

      const sysId = `emp-${Date.now()}-${i}`;
      
      // Random color
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

      newEmployees.push({
        id: sysId,
        rfidTag: uid,
        firstName: name1,
        lastName: name2,
        // Wartości domyślne
        position: 'Pracownik',
        department: 'Ogólny',
        color: randomColor,
        workStatus: 'inactive'
      });
    }

    return newEmployees;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const filteredEmployees = employees.filter(e => 
    e.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.rfidTag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Panel Administratora</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
            {employees.length} Pracowników
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Employee List */}
        <div className="w-1/3 max-w-sm bg-white border-r flex flex-col z-0">
          {/* Action Buttons */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Szukaj pracownika..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            {/* Import Button */}
            <div>
              <input 
                type="file" 
                accept=".csv"
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isImporting ? 'Przetwarzanie...' : (
                  <>
                    <Upload size={16} />
                    Importuj z CSV
                  </>
                )}
              </button>
              <p className="text-[10px] text-gray-400 mt-1 text-center">
                Format: uid, name1, name2, idx, parent, flag
              </p>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            <button 
                onClick={() => setSelectedEmpId(null)}
                className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors flex items-center gap-3 ${selectedEmpId === null ? 'bg-slate-100 border-l-4 border-l-slate-600' : ''}`}
            >
                <div className="bg-slate-200 p-2 rounded-full">
                    <Settings size={20} className="text-slate-600" />
                </div>
                <div>
                    <div className="font-semibold text-gray-800">Ustawienia Systemu</div>
                    <div className="text-xs text-gray-500">Konfiguracja NodeRED</div>
                </div>
            </button>
            <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Pracownicy</div>
            {loading ? (
              <div className="p-8 text-center text-gray-500">Ładowanie...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Brak wyników</div>
            ) : (
              filteredEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmpId(emp.id)}
                  className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors flex items-center gap-3 ${selectedEmpId === emp.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                    style={{ backgroundColor: emp.color }}
                  >
                    {getInitials(emp.firstName, emp.lastName)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{emp.firstName} {emp.lastName}</div>
                    <div className="text-xs text-gray-500">{emp.position}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          
          {/* SYSTEM SETTINGS VIEW (When no employee selected) */}
          {!selectedEmpId && (
            <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Settings size={28} className="text-slate-700" />
                        Konfiguracja Systemu
                    </h2>
                    
                    {/* NodeRED Settings */}
                    <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                             <Server size={18} /> Integracja z NodeRED (RFID)
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Wprowadź adres IP i port urządzenia, na którym działa NodeRED.
                        </p>
                        
                        <form onSubmit={handleSaveWsSettings} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Adres WebSocket (WS)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={wsUrl}
                                        onChange={(e) => setWsUrl(e.target.value)}
                                        placeholder="192.168.1.XX:1880/ws/rfid"
                                        className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                    />
                                    <button 
                                        type="submit"
                                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium transition-colors"
                                    >
                                        Połącz
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Format: <code>IP:PORT/ścieżka</code>. Np: <code>192.168.1.15:1880/ws/rfid</code>
                                </p>
                                {savedWsUrl && <p className="text-green-600 text-sm mt-1">Próba łączenia...</p>}
                            </div>
                        </form>
                    </div>

                    <div className="flex flex-col gap-2 p-4 bg-white border rounded-lg mb-8">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600 font-medium">Status Połączenia:</span>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${isWsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {isWsConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
                                {isWsConnected ? 'Połączono (Online)' : 'Brak połączenia'}
                            </div>
                        </div>
                        {wsError && (
                            <div className="mt-2 bg-red-50 text-red-700 p-3 rounded text-sm flex gap-2 items-start">
                                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                <div>
                                    <span className="font-bold">Błąd:</span> {wsError}
                                    <div className="mt-1 text-xs opacity-90">
                                        Sprawdź czy NodeRED jest uruchomiony, czy IP jest poprawne oraz czy kliknąłeś "Deploy" w NodeRED.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* App Settings */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                             <Timer size={18} /> Ustawienia Aplikacji
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Konfiguracja zachowania kiosku.
                        </p>
                        
                        <form onSubmit={handleSaveAppSettings} className="space-y-6">
                            {/* Auto Logout */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Czas Automatycznego Wylogowania
                                </label>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="number" 
                                        min="5"
                                        max="60"
                                        value={logoutTime}
                                        onChange={(e) => setLogoutTime(parseInt(e.target.value, 10))}
                                        className="w-24 p-2 border rounded focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <span className="text-sm text-gray-500">sekund</span>
                                </div>
                            </div>

                            {/* Show Simulator Toggle */}
                            <div className="flex items-center justify-between border-t pt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-0.5 flex items-center gap-2">
                                        <Gamepad2 size={16} className="text-purple-600"/>
                                        Pokaż Symulator Hardware
                                    </label>
                                    <p className="text-xs text-gray-500">
                                        Wyświetla panel symulacji kart RFID i przycisków na dole ekranu.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowSimulator(!showSimulator)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${showSimulator ? 'bg-blue-600' : 'bg-gray-200'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showSimulator ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                            
                            <div className="flex justify-end pt-2">
                                <button 
                                    type="submit"
                                    className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800 font-medium transition-colors flex items-center gap-2"
                                >
                                    {savedAppSettings ? <CheckCircle2 size={16}/> : <Save size={16} />}
                                    Zapisz
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileSpreadsheet size={20} className="text-emerald-600" />
                    Instrukcja Importu CSV
                  </h3>
                  <div className="space-y-4 text-sm text-gray-600">
                    <p>Aby dodać pracowników, wgraj plik CSV o następującej strukturze:</p>
                    <div className="bg-gray-100 p-3 rounded font-mono text-xs overflow-x-auto">
                      uid,name1,name2,idx,parent,flag<br/>
                      E203512,Jan,Kowalski,1,-1,1<br/>
                      A104233,Anna,Nowak,2,-1,1
                    </div>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>uid</strong>: Numer karty RFID</li>
                      <li><strong>name1</strong>: Imię</li>
                      <li><strong>name2</strong>: Nazwisko</li>
                      <li><strong>idx, parent, flag</strong>: Pola techniczne (są ignorowane przy imporcie, ale wymagane w strukturze)</li>
                    </ul>
                  </div>
                </div>
            </div>
          )}

          {/* EMPLOYEE EDIT VIEW */}
          {selectedEmpId && editingEmployee && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
              
              {/* Profile Editor Section */}
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <User size={20} className="text-blue-600" />
                  Dane Pracownika
                </h2>
                <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Imię</label>
                    <input 
                      type="text" 
                      value={editingEmployee.firstName}
                      onChange={(e) => setEditingEmployee({...editingEmployee, firstName: e.target.value})}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko</label>
                    <input 
                      type="text" 
                      value={editingEmployee.lastName}
                      onChange={(e) => setEditingEmployee({...editingEmployee, lastName: e.target.value})}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Briefcase size={14}/> Stanowisko</label>
                    <input 
                      type="text" 
                      value={editingEmployee.position}
                      onChange={(e) => setEditingEmployee({...editingEmployee, position: e.target.value})}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Building size={14}/> Dział</label>
                    <input 
                      type="text" 
                      value={editingEmployee.department}
                      onChange={(e) => setEditingEmployee({...editingEmployee, department: e.target.value})}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Color Picker / Display */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Palette size={14}/> Kolor Ikony</label>
                    <div className="flex gap-2 flex-wrap">
                      {AVATAR_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditingEmployee({...editingEmployee, color: c})}
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${editingEmployee.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><CreditCard size={14}/> Numer Karty RFID</label>
                    <input 
                      type="text" 
                      value={editingEmployee.rfidTag}
                      onChange={(e) => setEditingEmployee({...editingEmployee, rfidTag: e.target.value})}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-gray-50 font-mono text-gray-900"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button 
                      type="submit" 
                      disabled={savingProfile}
                      className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium disabled:opacity-70"
                    >
                      {savingProfile ? 'Zapisywanie...' : <><Save size={18} /> Zapisz Zmiany</>}
                    </button>
                  </div>
                </form>
              </section>

              {/* Notification Manager Section */}
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Bell size={20} className="text-orange-500" />
                    Zarządzanie Powiadomieniami
                  </h2>
                </div>
                
                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Add New Form */}
                  <div className="lg:col-span-1 border-r-0 lg:border-r pr-0 lg:pr-8 border-dashed border-gray-300">
                    <h3 className="font-semibold mb-4 text-gray-700 flex items-center gap-2">
                      <Plus size={16} /> Dodaj Nowe
                    </h3>
                    <form onSubmit={handleAddNotification} className="space-y-4">
                      <div>
                        <select 
                          value={noteType} 
                          onChange={(e) => setNoteType(e.target.value as NotificationType)}
                          className="w-full p-2 border rounded text-sm"
                        >
                          <option value={NotificationType.INFO}>Informacja</option>
                          <option value={NotificationType.MEDICAL}>Badania Lekarskie</option>
                          <option value={NotificationType.TRAINING}>Szkolenie</option>
                          <option value={NotificationType.URGENT}>Pilne</option>
                        </select>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Tytuł..." 
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        className="w-full p-2 border rounded text-sm"
                        required
                      />
                      <input 
                        type="date" 
                        value={noteDate}
                        onChange={(e) => setNoteDate(e.target.value)}
                        className="w-full p-2 border rounded text-sm"
                      />
                      <textarea 
                        placeholder="Treść wiadomości..." 
                        rows={3}
                        value={noteMsg}
                        onChange={(e) => setNoteMsg(e.target.value)}
                        className="w-full p-2 border rounded text-sm"
                        required
                      />
                      <button 
                        type="submit" 
                        disabled={sendingNote}
                        className="w-full bg-slate-800 text-white py-2 rounded hover:bg-slate-900 text-sm font-medium"
                      >
                        {sendingNote ? 'Dodawanie...' : 'Dodaj Powiadomienie'}
                      </button>
                    </form>
                  </div>

                  {/* Active List */}
                  <div className="lg:col-span-2">
                    <h3 className="font-semibold mb-4 text-gray-700">
                      Aktywne Powiadomienia ({employeeNotifications.length})
                    </h3>
                    <div className="space-y-3">
                      {employeeNotifications.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Brak aktywnych powiadomień dla tego pracownika.</p>
                      ) : (
                        employeeNotifications.map(note => (
                          <div key={note.id} className="relative group">
                            <NotificationCard notification={note} />
                            <button 
                              onClick={() => handleDeleteNotification(note.id)}
                              className="absolute top-2 right-2 p-2 bg-white text-red-500 rounded-full shadow hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Usuń powiadomienie"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};