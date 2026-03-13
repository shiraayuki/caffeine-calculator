# ☕ Caffeine Calculator

A modern, scientifically-oriented caffeine tracker that helps you understand your consumption and visualize its impact on your sleep (melatonin rhythm).

## ✨ Features

- **Dynamic Calculation**: Choose from preset drinks (Espresso, Coffee, Tea, etc.) and specify the volume in milliliters. Caffeine content is calculated based on concentration (mg/100ml).
- **Individual Metabolism**: Adjust the **half-life** (3h - 6h) to match your personal metabolism.
- **Sleep Visualization**: Set your sleep and wake times to see a simulated **melatonin curve**. Instantly see if your caffeine level is too high at bedtime.
- **Precise Charting**: 15-minute interval visualization for a smooth curve and detailed hover information.
- **Midnight Carry-over**: Optional function to include residual caffeine from the previous day (steady-state simulation).
- **Persistence**: All data and settings are automatically saved in your browser's `localStorage`.
- **Mobile Friendly**: Optimized design for both desktop and smartphone.

## 🚀 Installation & Setup

This project is built with **React 19**, **Vite**, and **TypeScript**.

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd caffeine-calculator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

## 🧪 The Science

### Caffeine Decay
The app uses the classic exponential decay formula:
`C(t) = C0 * (1/2)^(t / half-life)`
The default half-life is **5 hours**, but this can vary based on genetics, age, or factors like smoking and medication.

### Melatonin Rhythm
The purple curve simulates the circadian rhythm. It typically begins to rise about 2-3 hours before the scheduled sleep time and reaches its peak in the middle of the sleep phase. Caffeine blocks adenosine receptors and can overshadow the effects of melatonin, potentially reducing sleep quality.

## 🛠 Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Visualization**: Recharts
- **Styling**: Vanilla CSS (Custom Properties)
