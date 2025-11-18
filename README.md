# Daily Cashier - Web Version

A standalone React + Tailwind CSS web application for daily cash management.

## Tech Stack

- **React 18** with TypeScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **localStorage** - Data persistence (replaces SQLite)

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3002`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Features

- ✅ Open/close cash sessions
- ✅ Record income and expense transactions
- ✅ View transaction history
- ✅ Generate reports with filters
- ✅ Category management
- ✅ Dark mode support
- ✅ Responsive design
- ✅ All data stored in browser localStorage

## Differences from Mobile Version

- No SQLite database (uses localStorage)
- No Capacitor/native features
- Web-only deployment
- Simpler setup and dependencies
