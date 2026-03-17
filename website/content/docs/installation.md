---
title: "Installation"
description: "Download and install Argus"
---

## Desktop App (Recommended)

Download the latest installer from [GitHub Releases](https://github.com/79841/argus/releases):

| Platform | File | Instructions |
|----------|------|-------------|
| **macOS** (Apple Silicon) | `Argus-x.x.x-arm64.dmg` | Open DMG → drag to Applications → launch |
| **Windows** | `Argus Setup x.x.x.exe` | Run the NSIS installer → launch from Start Menu |

After launching, Argus runs as a **tray-resident app** and automatically:
- Starts a Next.js server on `http://localhost:3000`
- Opens the dashboard in an Electron window
- Creates a SQLite database for storing telemetry

No manual configuration needed — just install and launch.

## From Source (Contributors)

### Prerequisites

- **Node.js** 20+
- **pnpm** (`npm install -g pnpm`)

### Steps

```bash
git clone https://github.com/79841/argus.git
cd argus/dashboard
pnpm install
```

**Web mode** (browser at http://localhost:3000):

```bash
pnpm dev
```

**Desktop mode** (Electron app with tray icon):

```bash
pnpm electron:dev
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ARGUS_DB_PATH` | `../argus.db` | Path to the SQLite database file |

### Build Installers

```bash
pnpm electron:dist:mac   # macOS DMG (arm64)
pnpm electron:dist:win   # Windows NSIS (x64)
```

## Next Steps

After installation, [configure your AI agents](/docs/setup-guide) to send telemetry to Argus.
