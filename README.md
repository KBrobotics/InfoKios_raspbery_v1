# InfoPoint RFID Kiosk

Nowoczesny system informacji pracowniczej (Employee Self-Service Kiosk) sterowany kartami RFID, wyposażony w asystenta AI (Gemini) generującego codzienne odprawy.

## Funkcjonalności

*   **Logowanie RFID**: Szybka identyfikacja pracownika za pomocą karty zbliżeniowej.
*   **Asystent AI (Gemini)**: Generuje spersonalizowane, motywujące powitania i podsumowania zadań ("Daily Briefing").
*   **Rejestracja Czasu Pracy (RCP)**: Fizyczne przyciski (symulowane lub przez NodeRED) do logowania Start/Stop pracy.
*   **Powiadomienia**: Wyświetlanie ważnych komunikatów (badania lekarskie, szkolenia BHP, informacje od HR).
*   **Panel Administratora**: Zarządzanie pracownikami, powiadomieniami oraz import danych z CSV.
*   **Integracja IoT**: Połączenie WebSocket z NodeRED dla obsługi fizycznych czytników i przycisków.

## Uruchomienie lokalne (Development)

1.  Zainstaluj zależności:
    ```bash
    npm install
    ```
2.  Uruchom serwer deweloperski:
    ```bash
    npm run dev
    ```
3.  Otwórz `http://localhost:5173`.

## Uruchomienie z Dockerem

Projekt jest gotowy do konteneryzacji (Nginx serwujący aplikację React).

1.  Zbuduj i uruchom kontener:
    ```bash
    docker-compose up --build -d
    ```
2.  Aplikacja będzie dostępna pod adresem: `http://localhost:8081`.

## Konfiguracja API

Klucz API Google Gemini jest skonfigurowany w `vite.config.ts`. W środowisku produkcyjnym zaleca się przekazywanie go jako zmiennej środowiskowej `API_KEY`.

## Symulator Hardware

W trybie deweloperskim, w prawym dolnym rogu ekranu dostępny jest panel symulatora, który pozwala na:
*   Symulowanie przyłożenia karty RFID konkretnego pracownika.
*   Symulowanie naciśnięcia fizycznych przycisków (Zielony/Czerwony).

## Technologie

*   React 18
*   TypeScript
*   Vite
*   Tailwind CSS
*   Google GenAI SDK (Gemini 2.5 Flash)
*   WebSocket (NodeRED Integration)
