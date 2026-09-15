# Emotion-Adaptive UI System (EAUIS)

An adaptive desktop widget system that dynamically adjusts its interface, theme, and character expressions based on real-time user interaction signals (typing speed, error frequency, and keyboard patterns).

---

## Overview

Emotion-Adaptive UI System (EAUIS) is an intelligent desktop companion designed for adaptive user experiences and human-computer interaction (HCI) evaluation.

The system:
- **Captures interaction metrics**: Non-intrusively monitors typing cadence (Actions Per Minute / APM), backspace burst frequency, and sentiment signals.
- **Infers emotional states**: Uses algorithmic heuristic modeling (including circadian and fatigue adjustments) to categorize mood into **Happy**, **Neutral**, or **Stressed**.
- **Adapts in real-time**: Dynamically updates the floating desktop widget's visual expression, color palette, and layout.
- **Stores evaluation data**: Persists mood history, signal logs, and usability survey responses locally in SQLite for academic analysis and reporting.

---

## Core Architecture

The system is designed around a **3-Layer Concept** backed by a **Controller-Service-Repository** pattern:

```
[Sensors] (uiohook-napi & DOM input tracking)
   │
   ▼
[Brain]   (IPC Bridge -> Controller -> Service -> SQLite Repository)
   │
   ▼
[Face]    (Floating Widget, Character Sprites, Dynamic CSS Theming)
```

1. **Sensors (Input Layer)**: Captures keyboard and mouse events globally (`uiohook-napi`) and locally within the widget window.
2. **Brain (Logic & Storage Layer)**:
   - Evaluates APM, instability, error rate, and emotional patterns.
   - Applies circadian weighting (late-night adjustments) and session duration tracking.
   - Saves mood snapshots and signal telemetry to SQLite.
3. **Face (Presentation Layer)**:
   - A draggable, resizable floating desktop widget featuring animated characters (Kirby, BMO, Pikachu).
   - A full settings and history dashboard with dark/light mode and auto-theme toggles.

---

## Tech Stack

- **Runtime & Desktop Shell**: [Electron](https://www.electronjs.org/) (v41+), [Node.js](https://nodejs.org/)
- **UI & Frontend**: Vanilla HTML5, Modern CSS3, JavaScript (ES6+), Boxicons
- **Database & Persistence**: [SQLite3](https://www.sqlite.org/) (local database with foreign key support)
- **Input Hooking**: `uiohook-napi` (cross-platform global keyboard & mouse activity tracking)
- **Packaging**: `electron-builder` (NSIS installer & portable Windows executable)

---

## Getting Started (Setup Guide)

### Prerequisites
- **Node.js**: Install the latest **LTS** version of [Node.js](https://nodejs.org/) (includes `npm`).
- **Operating System**: Windows 10 or 11 (recommended for global input hooking and native shortcuts).
- **Code Editor**: VS Code (or any preferred editor).

Verify your environment:
```powershell
node -v
npm -v
```

### Installation & Development

1. **Clone the repository**:
   ```powershell
   git clone https://github.com/schrazen/Emotion-Adaptive.git
   cd Emotion-Adaptive
   ```

2. **Install dependencies**:
   ```powershell
   npm install
   ```
   *(Note: This builds native dependencies like `sqlite3` and `uiohook-napi` for your local Node/Electron environment).*

3. **Launch the application in development mode**:
   ```powershell
   npm start
   ```

### Collaborator Notes
- Always commit changes to `package.json` and `package-lock.json` together.
- Never commit `node_modules/`, local database files (`*.db`, `*.sqlite`), or runtime logs (`*.log`).
- Keep the main window and floating widget communication secure through the Electron preload context bridge (`src/preload/contextBridge.js`).

---

## Testing & Quality Checklist

For collaborators and user-testers evaluating builds:

### First-Run Test Steps
1. **Launch**: Verify the application opens to the main view without errors.
2. **Settings**:
   - Toggle **Auto-Theme** ON / OFF.
   - Toggle **Dark Mode** ON / OFF and verify color contrast.
   - Switch active companion characters (Kirby / BMO / Pikachu).
3. **Widget Mode**:
   - Switch to **Character-only Widget Mode**.
   - Drag the floating widget across the screen.
   - Resize using the bottom-right grip.
   - Double-click the widget to return to the full application window.
4. **Mood Tracking**:
   - Type in other applications (coding, typing test, browsing) to verify APM and mood updates.

### Tester Feedback Template
```markdown
- App launched successfully: [Yes / No]
- Build type: [Dev / Installer / Portable]
- Theme switching: [Pass / Issue]
- Dark mode: [Pass / Issue]
- Widget drag & resize: [Pass / Issue]
- Return to full app: [Pass / Issue]
- Observed issues or errors: [None / Describe here]
```

---

## Packaging & Production Builds

To package the application for end-users who do not have Node.js installed:

```powershell
# Build Windows NSIS Installer:
npm run dist:win

# Build Windows Standalone Portable Executable:
npm run dist:portable
```

Packaged outputs will be created in the `release/` directory (which is automatically ignored by git).

### One-Click Portable Download Script
End-users can run this PowerShell script to download the latest portable release directly from GitHub:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

---

## Project Structure

```
Emotion-Adaptive/
├── .github/workflows/         # CI/CD workflows for automated Windows releases
├── release/                   # Build output directory (git-ignored)
├── scripts/
│   └── install.ps1            # Release downloader script
├── src/
│   ├── backend/
│   │   ├── controllers/       # Request routing & validation
│   │   ├── database/          # SQLite database schema & migrations
│   │   ├── repositories/      # SQL database operations
│   │   ├── router/            # IPC routing handlers
│   │   └── services/          # Business logic & emotion algorithms
│   ├── frontend/
│   │   ├── assets/            # Sprites, icons, and Boxicons assets
│   │   ├── js/                # Sprite engine, mood tracking, theme manager
│   │   ├── pages/             # App views (home, widget, settings, history)
│   │   └── styles/            # CSS styling
│   ├── main.js                # Electron main process entry point
│   └── preload/
│       └── contextBridge.js   # Secure Electron IPC bridge
├── .gitignore
├── package.json
└── README.md
```