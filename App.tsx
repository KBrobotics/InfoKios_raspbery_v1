import React, { useState, useEffect } from 'react';
import { KioskView } from './components/KioskView';
import { AdminView } from './components/AdminView';
import { RFIDSimulator } from './components/RFIDSimulator';
import { nodeRedSocket } from './services/nodeRedSocket';
import { Settings, Wifi, WifiOff } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<'KIOSK' | 'ADMIN'>('KIOSK');
  const [scannedRfid, setScannedRfid] = useState<string | null>(null);
  const [lastButtonAction, setLastButtonAction] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [showSimulator, setShowSimulator] = useState(true);

  const loadSettings = () => {
    const savedSim = localStorage.getItem('kiosk_show_simulator');
    // Default to true if not set
    setShowSimulator(savedSim === null ? true : savedSim === 'true');
  };

  // Initialize
  useEffect(() => {
    // 1. Load settings
    loadSettings();

    // 2. Connect to WebSocket
    nodeRedSocket.connect();

    // 3. Subscribe to scans and buttons
    const unsubscribeScan = nodeRedSocket.subscribe((data) => {
      console.log("App received data:", data);
      
      if (data.type === 'rfid') {
        handleScan(data.value);
      } else if (data.type === 'button') {
        handleButton(data.value);
      }
    });

    // 4. Subscribe to Status
    const unsubscribeStatus = nodeRedSocket.onStatusChange((isConnected) => {
      setWsConnected(isConnected);
    });

    return () => {
      unsubscribeScan();
      unsubscribeStatus();
    };
  }, []); // Run once on mount

  const handleScan = (rfid: string) => {
    console.log(`RFID Detected: ${rfid}`);
    setScannedRfid(rfid);
    // Clear previous button actions on new login
    setLastButtonAction(null);
    
    if (currentView === 'ADMIN') {
       alert(`Zeskanowano kartę: ${rfid}`);
    }
  };

  const handleButton = (action: string) => {
    console.log(`Button Pressed: ${action}`);
    // Update state to trigger effect in KioskView
    // We use a timestamp to ensure even repeated clicks trigger changes
    setLastButtonAction(`${action}|${Date.now()}`);
  };

  const handleLogout = () => {
    setScannedRfid(null);
    setLastButtonAction(null);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100 relative">
      
      {/* View Switcher */}
      {currentView === 'KIOSK' ? (
        <KioskView 
          currentRfid={scannedRfid} 
          lastButtonAction={lastButtonAction}
          onLogout={handleLogout} 
        />
      ) : (
        <AdminView onBack={() => {
            // Reload settings when returning from Admin panel to apply changes immediately
            loadSettings();
            setCurrentView('KIOSK');
        }} />
      )}

      {/* Hardware Simulator Component - Conditionally Rendered */}
      {showSimulator && (
        <RFIDSimulator onScan={(data) => {
          if (data.type === 'rfid') handleScan(data.value);
          if (data.type === 'button') handleButton(data.value);
        }} />
      )}

      {/* Status Indicators & Admin Button */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
        {/* NodeRED Connection Status Indicator */}
        <div className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'}`} title="NodeRED WebSocket Status">
          {wsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span className="hidden sm:inline">{wsConnected ? 'NodeRED Online' : 'NodeRED Offline'}</span>
        </div>

        {currentView === 'KIOSK' && !scannedRfid && (
          <button 
            onClick={() => setCurrentView('ADMIN')}
            className="p-2 bg-white/80 hover:bg-white rounded-full text-gray-500 hover:text-gray-900 transition shadow-sm backdrop-blur-sm"
            title="Przejdź do Panelu Admina"
          >
            <Settings size={20} />
          </button>
        )}
      </div>

    </div>
  );
}

export default App;