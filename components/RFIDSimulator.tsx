import React from 'react';
import { MOCK_EMPLOYEES } from '../constants';
import { Scan, PlayCircle, StopCircle } from 'lucide-react';

interface RFIDSimulatorProps {
  onScan: (data: { type: 'rfid' | 'button', value: string }) => void;
}

export const RFIDSimulator: React.FC<RFIDSimulatorProps> = ({ onScan }) => {
  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-xl border border-gray-200 w-72 z-50">
      <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold border-b pb-2">
        <Scan size={20} className="text-blue-600" />
        <span>Hardware Simulator</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Symulacja sygnałów z NodeRED. Kliknij kartę, aby zalogować, a potem przycisk, aby zarejestrować akcję.
      </p>
      
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => onScan({ type: 'button', value: 'BTN_GREEN' })}
          className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 py-2 rounded flex flex-col items-center gap-1 border border-green-300"
        >
          <PlayCircle size={20} />
          <span className="text-xs font-bold">BTN_GREEN</span>
        </button>
        <button 
          onClick={() => onScan({ type: 'button', value: 'BTN_RED' })}
          className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded flex flex-col items-center gap-1 border border-red-300"
        >
          <StopCircle size={20} />
          <span className="text-xs font-bold">BTN_RED</span>
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        <div className="text-xs font-bold text-gray-500 uppercase">Karty RFID</div>
        {MOCK_EMPLOYEES.map(emp => (
          <button
            key={emp.id}
            onClick={() => onScan({ type: 'rfid', value: emp.rfidTag })}
            className="w-full text-left px-3 py-2 text-sm bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors flex items-center justify-between group"
          >
            <span>{emp.firstName} {emp.lastName}</span>
            <span className="text-xs font-mono text-gray-400 group-hover:text-blue-400">{emp.rfidTag}</span>
          </button>
        ))}
      </div>
    </div>
  );
};