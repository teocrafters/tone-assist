# RTA Real-Time Audio Analyzer

Aplikacja PWA do analizy audio w czasie rzeczywistym z regulowanymi filtrami HPF/LPF i obsługą stereo.

## Funkcjonalności

### ✨ **Podstawowe**
- **Real-Time Analyzer (RTA)**: 120 pasm logarytmicznych (20Hz-20kHz)
- **Filtry**: Regulowane HPF i LPF o nachyleniu 48dB/oct (kaskada 4×BiquadFilter)
- **Stereo**: Automatyczna detekcja i obsługa kanałów mono/stereo
- **PWA**: Instalowalna jako aplikacja mobilna (Android/iOS)

### 🎛️ **Przetwarzanie Audio**
- Źródło: mikrofon urządzenia (getUserMedia)
- Automatyczna detekcja liczby kanałów wejściowych (1 lub 2)
- Detekcja ciszy (500ms poniżej -60dB) z automatycznym przełączaniem kanałów
- Routing: mono→stereo duplikacja, stereo→stereo przepuszczanie
- Latencja: zoptymalizowana dla interactive AudioContext

### 📱 **Tryby wyświetlania**
- **Mono**: Pojedynczy RTA na pełną wysokość
- **Stereo**: Dwa RTA jeden pod drugim (L/R) z wspólnymi filtrami
- Automatyczne przełączanie na podstawie aktywności sygnału

### 🎚️ **Kontrolki**
- Przeciągnij uchwyty filtrów na wykresie
- HPF i LPF nie mogą się przecinać (min. 200Hz odstęp)
- Filtry działają identycznie na obu kanałach w trybie stereo

## Wymagania techniczne

- **Przeglądarka**: Chrome 90+, Safari 15.4+ (iOS), Firefox 88+
- **HTTPS**: Wymagane do dostępu do mikrofonu
- **Słuchawki**: Zalecane aby uniknąć sprzężeń zwrotnych

## Uruchomienie

```bash
# Instalacja zależności
pnpm install

# Serwer deweloperski
pnpm dev

# Build produkcyjny
pnpm build

# Podgląd buildu
pnpm preview

# Testy jednostkowe
pnpm test
```

Aplikacja działa na `http://localhost:5173/`
