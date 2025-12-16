import React, { useEffect, useState, useRef } from 'react';
import { Employee, Notification } from '../types';
import { dbService } from '../services/dbService';
import { geminiService } from '../services/geminiService';
import { nodeRedSocket } from '../services/nodeRedSocket';
import { NotificationCard } from './NotificationCard';
import { Scan, LogOut, Loader2, Sparkles, AlertOctagon, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface KioskViewProps {
  currentRfid: string | null;
  lastButtonAction: string | null;
  onLogout: () => void;
}

export const KioskView: React.FC<KioskViewProps> = ({ currentRfid, lastButtonAction, onLogout }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{type: 'success' | 'error' | 'logout', msg: string} | null>(null);
  
  // Auto-logout config
  const getLogoutTime = () => parseInt(localStorage.getItem('kiosk_logout_time') || '15', 10);
  const [logoutDuration] = useState(getLogoutTime());

  // Auto-logout timer
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    if (logoutTimerRef.current !== null) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(() => {
      onLogout();
    }, logoutDuration * 1000); 
  };

  // Obsługa logowania kartą
  useEffect(() => {
    const fetchData = async () => {
      if (!currentRfid) {
        setEmployee(null);
        return;
      }

      setLoading(true);
      setError(null);
      setAiMessage(null);
      setActionFeedback(null);
      
      try {
        const emp = await dbService.getEmployeeByRFID(currentRfid);
        if (!emp) {
          setError("Nie znaleziono pracownika dla tej karty.");
          setLoading(false);
          setTimeout(onLogout, 3000);
          return;
        }

        setEmployee(emp);
        const notes = await dbService.getNotificationsForEmployee(emp.id);
        setNotifications(notes);

        geminiService.generateDailyBriefing(emp, notes).then(msg => {
          setAiMessage(msg);
        });

        setLoading(false);
        resetTimer();
      } catch (err) {
        setError("Błąd połączenia z bazą danych.");
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRfid]);


  // Obsługa przycisków fizycznych (NodeRED)
  useEffect(() => {
    if (!lastButtonAction || !employee) return;

    const [actionType] = lastButtonAction.split('|'); // action|timestamp

    const handleWorkAction = async () => {
        if (actionType === 'BTN_GREEN') {
            await dbService.registerWorkLog(employee.id, 'active');
            
            // Send data to NodeRED for InfluxDB
            nodeRedSocket.send({
                topic: 'attendance',
                payload: {
                    employeeId: employee.id,
                    employeeName: `${employee.firstName} ${employee.lastName}`,
                    department: employee.department,
                    action: 'start_work',
                    timestamp: new Date().toISOString()
                }
            });

            setActionFeedback({ type: 'success', msg: 'ZALOGOWANO DO PRACY. MIŁEGO DNIA!' });
            setEmployee(prev => prev ? {...prev, workStatus: 'active'} : null);
        } else if (actionType === 'BTN_RED') {
            await dbService.registerWorkLog(employee.id, 'inactive');

            // Send data to NodeRED for InfluxDB
            nodeRedSocket.send({
                topic: 'attendance',
                payload: {
                    employeeId: employee.id,
                    employeeName: `${employee.firstName} ${employee.lastName}`,
                    department: employee.department,
                    action: 'stop_work',
                    timestamp: new Date().toISOString()
                }
            });

            setActionFeedback({ type: 'logout', msg: 'WYLOGOWANO Z PRACY. DO ZOBACZENIA!' });
            setEmployee(prev => prev ? {...prev, workStatus: 'inactive'} : null);
        }

        // Po akcji wyloguj szybciej (3s) aby pokazać komunikat
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        setTimeout(() => {
            onLogout();
        }, 3000);
    };

    handleWorkAction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastButtonAction]);


  // IDLE STATE
  if (!currentRfid) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <Scan size={120} className="text-blue-400 relative z-10" />
        </div>
        <h1 className="text-4xl font-bold mt-8 tracking-tight">InfoPoint Kiosk</h1>
        <p className="text-slate-400 mt-4 text-xl">Zbliż kartę pracowniczą, aby się zalogować</p>
      </div>
    );
  }

  // LOADING STATE
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-slate-600 font-medium text-lg">Weryfikacja karty...</p>
      </div>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-red-50 text-red-800">
        <AlertOctagon size={64} className="mb-4" />
        <h2 className="text-3xl font-bold">Błąd Autoryzacji</h2>
        <p className="mt-2 text-xl">{error}</p>
      </div>
    );
  }

  // ACTION FEEDBACK STATE (Success Work Log)
  if (actionFeedback) {
     const isLogout = actionFeedback.type === 'logout';
     const isError = actionFeedback.type === 'error';
     const bgColor = (isLogout || isError) ? 'bg-red-600' : 'bg-green-600';
     const Icon = isError ? XCircle : CheckCircle2;

     return (
        <div className={`h-full flex flex-col items-center justify-center text-white ${bgColor}`}>
            <Icon size={120} />
            <h1 className="text-4xl font-bold mt-8 text-center px-4">{actionFeedback.msg}</h1>
            <p className="mt-4 text-white/80">Wylogowywanie...</p>
        </div>
     );
  }

  // DASHBOARD STATE (Logged In)
  return (
    <div className="min-h-full bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md p-6 flex justify-between items-center z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold border-2 border-white shadow-sm"
            style={{ backgroundColor: employee?.color || '#3b82f6' }}
          >
            {employee?.firstName.charAt(0)}{employee?.lastName.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Witaj, {employee?.firstName} {employee?.lastName}</h1>
            <p className="text-gray-500">{employee?.position} | {employee?.department}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
            <div className={`text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1 mb-2 ${employee?.workStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                <Clock size={14} />
                {employee?.workStatus === 'active' ? 'W PRACY' : 'POZA PRACĄ'}
            </div>
            <button 
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
            >
                <LogOut size={16} />
                Anuluj ({logoutDuration}s)
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: RCP Actions */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock className="text-blue-600" />
                    Rejestracja Czasu
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    Naciśnij fizyczny przycisk na terminalu, aby zarejestrować akcję. Masz {logoutDuration} sekund.
                </p>

                <div className="space-y-4">
                    <div className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${employee?.workStatus === 'inactive' ? 'border-green-500 bg-green-50 opacity-100' : 'border-gray-100 bg-gray-50 opacity-50 grayscale'}`}>
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold shadow-lg">
                            START
                        </div>
                        <div>
                            <div className="font-bold text-gray-800">Naciśnij ZIELONY</div>
                            <div className="text-xs text-gray-500">Aby rozpocząć pracę</div>
                        </div>
                    </div>

                    <div className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${employee?.workStatus === 'active' ? 'border-red-500 bg-red-50 opacity-100' : 'border-gray-100 bg-gray-50 opacity-50 grayscale'}`}>
                        <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white font-bold shadow-lg">
                            STOP
                        </div>
                        <div>
                            <div className="font-bold text-gray-800">Naciśnij CZERWONY</div>
                            <div className="text-xs text-gray-500">Aby zakończyć pracę</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: Info & Notes */}
        <div className="lg:col-span-2 space-y-8">
            {/* AI Briefing */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles size={120} />
                </div>
                <h2 className="text-lg font-medium text-blue-100 flex items-center gap-2 mb-2">
                    <Sparkles size={18} />
                    InfoPoint AI Assistant
                </h2>
                <p className="text-xl font-light leading-relaxed">
                    {aiMessage ? `"${aiMessage}"` : <span className="animate-pulse">Generowanie podsumowania dnia...</span>}
                </p>
            </div>

            {/* Notifications Grid */}
            <div>
            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                Powiadomienia
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{notifications.length}</span>
            </h2>
            
            {notifications.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-400 text-lg">Brak nowych powiadomień.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notifications.map(note => (
                    <NotificationCard key={note.id} notification={note} />
                ))}
                </div>
            )}
            </div>
        </div>
      </main>
    </div>
  );
};