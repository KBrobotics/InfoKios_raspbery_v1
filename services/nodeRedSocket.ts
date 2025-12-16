// Ten serwis obsługuje połączenie WebSocket z NodeRED.
// W NodeRED należy użyć węzła "WebSocket Out" skonfigurowanego jako "Listen on"
// na ścieżce np. "/ws/rfid".

type ScanCallback = (data: { type: 'rfid' | 'button', value: string }) => void;
type StatusCallback = (isConnected: boolean, error?: string) => void;

class NodeRedSocket {
  private ws: WebSocket | null = null;
  private listeners: ScanCallback[] = [];
  private statusListeners: StatusCallback[] = [];
  
  // Domyślny adres
  private url: string = localStorage.getItem('nodeRed_url') || "ws://localhost:1880/ws/rfid"; 
  
  private reconnectInterval: number = 5000;
  private shouldReconnect: boolean = true;
  private isConnected: boolean = false;
  private lastError: string | undefined = undefined;

  constructor() {
    console.log("NodeRedSocket initialized with URL:", this.url);
  }

  public getUrl(): string {
    return this.url;
  }

  public setUrl(newUrl: string) {
    let formattedUrl = newUrl.trim();
    if (formattedUrl.length === 0) return;

    if (formattedUrl.startsWith('http://')) {
        formattedUrl = formattedUrl.replace('http://', 'ws://');
    } else if (formattedUrl.startsWith('https://')) {
        formattedUrl = formattedUrl.replace('https://', 'wss://');
    }

    if (!formattedUrl.startsWith('ws://') && !formattedUrl.startsWith('wss://')) {
        formattedUrl = `ws://${formattedUrl}`;
    }

    console.log(`Updating NodeRED URL: ${newUrl} -> ${formattedUrl}`);
    
    this.url = formattedUrl;
    localStorage.setItem('nodeRed_url', formattedUrl);
    
    this.disconnect();
    this.lastError = undefined; 
    this.connect();
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.shouldReconnect = true;

    try {
      console.log(`Attempting connection to ${this.url}...`);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('✅ Połączono z NodeRED WebSocket');
        this.lastError = undefined;
        this.setConnected(true);
      };

      this.ws.onmessage = (event) => {
        try {
          let payload: any = {};
          try {
            const data = JSON.parse(event.data);
            payload = data;
          } catch {
            // Jeśli to zwykły string
            const str = event.data.toString().trim();
            if (str === 'BTN_GREEN' || str === 'BTN_RED') {
                payload = { type: 'button', value: str };
            } else {
                payload = { rfid: str };
            }
          }

          // Normalizacja danych
          if (payload.type === 'button' || payload.button) {
             const btnVal = payload.value || payload.button;
             this.notifyListeners({ type: 'button', value: btnVal });
          } else if (payload.rfid || payload.payload || payload.id) {
             const rfidVal = payload.rfid || payload.payload || payload.id;
             this.notifyListeners({ type: 'rfid', value: rfidVal });
          }
        } catch (e) {
          console.error("Błąd parsowania wiadomości z NodeRED", e);
        }
      };

      this.ws.onclose = (event) => {
        if (this.isConnected) {
            console.warn('⚠️ Rozłączono z NodeRED.');
        }
        this.setConnected(false);
        
        if (event.code === 1006) {
           if (window.location.protocol === 'https:' && this.url.startsWith('ws:')) {
             this.lastError = "Błąd Mixed Content: Nie można łączyć się z ws:// ze strony https://.";
           } else {
             this.lastError = "Błąd połączenia (Host nieosiągalny lub odrzucił połączenie).";
           }
           this.notifyStatusListeners(); 
        }

        if (this.shouldReconnect) {
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };

      this.ws.onerror = (err) => {
        console.error("NodeRED WS Error:", err);
        this.ws?.close();
      };

    } catch (err) {
      console.error("Nie udało się utworzyć połączenia WebSocket", err);
      this.lastError = "Błąd składni URL lub błąd krytyczny przeglądarki.";
      this.setConnected(false);
    }
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setConnected(false);
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
            const message = JSON.stringify(data);
            this.ws.send(message);
            console.log("Sent to NodeRED:", data);
        } catch (e) {
            console.error("Error sending data to NodeRED:", e);
        }
    } else {
        console.warn("Cannot send message to NodeRED: WebSocket is not connected.");
    }
  }

  public subscribe(callback: ScanCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  public onStatusChange(callback: StatusCallback) {
    this.statusListeners.push(callback);
    callback(this.isConnected, this.lastError);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(data: { type: 'rfid' | 'button', value: string }) {
    this.listeners.forEach(cb => cb(data));
  }

  private setConnected(status: boolean) {
    if (this.isConnected !== status) {
      this.isConnected = status;
      this.notifyStatusListeners();
    }
  }

  private notifyStatusListeners() {
    this.statusListeners.forEach(cb => cb(this.isConnected, this.lastError));
  }
}

export const nodeRedSocket = new NodeRedSocket();