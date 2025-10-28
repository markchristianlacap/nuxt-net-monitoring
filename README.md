# Nuxt Network Monitoring System 🚀

[![Nuxt.js](https://img.shields.io/badge/Nuxt.js-013220?style=flat\&logo=nuxt.js\&logoColor=white)](https://nuxt.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat\&logo=node.js\&logoColor=white)](https://nodejs.org/)
[![Speedtest CLI](https://img.shields.io/badge/Speedtest-CLI-orange?style=flat\&logo=ookla)](https://www.speedtest.net/apps/cli)
[![PfSense SNMP](https://img.shields.io/badge/PfSense-SNMP-blue?style=flat\&logo=pfSense)](https://www.pfsense.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat\&logo=postgresql\&logoColor=white)](https://www.postgresql.org/)

A **real-time network monitoring system** built with Nuxt.js that continuously monitors network performance. Track ping latency, SNMP bandwidth from network devices (e.g., PfSense), and run internet speed tests with live visualizations and historical data storage.

---

## 🎯 Features

### Real-Time Monitoring
* **Ping Monitoring**: Continuous ping monitoring (every 1 second) with latency tracking and status detection
* **Bandwidth Monitoring**: Real-time SNMP monitoring of network interface traffic (inbound/outbound Mbps) from PfSense or other SNMP-enabled devices
* **Live Streaming Data**: Server-sent events (SSE) for real-time data updates without page refresh

### Speed Test Integration
* **Automated Testing**: Scheduled speed tests run automatically every hour
* **Manual Testing**: On-demand speed tests with live progress visualization
* **Real-Time Results**: Live streaming of download/upload speeds during test execution
* **Direct Integration**: Uses official Ookla Speedtest CLI for accurate measurements

### Data Visualization & History
* **Live Charts**: Real-time ECharts visualizations with smooth animations
* **Historical Data**: Browse and export historical ping, bandwidth, and speed test data
* **Data Export**: Download historical data in CSV format for analysis

### Security & Access
* **Basic Authentication**: HTTP Basic Auth with session cookie (48-hour expiry)
* **Protected Routes**: All endpoints secured via middleware

---

## 🖥️ Screenshots

**Dashboard Example**
![Dashboard Screenshot](./screenshots/dashboard.png)

**Live Bandwidth Chart**
![Bandwidth Chart](./screenshots/bandwidth.png)

**Speed Test Results**
![Speed Test Chart](./screenshots/speedtest.png)

> Screenshots show the actual application UI with live charts and monitoring data.

---

## ⚙️ Tech Stack

### Frontend
* **Framework**: Nuxt 4.x (Vue 3 with auto-imports)
* **UI Library**: Nuxt UI (TailwindCSS-based component library)
* **Charts**: nuxt-echarts with Apache ECharts (LineChart with real-time streaming)
* **State Management**: Vue 3 Composition API with reactive refs

### Backend
* **Runtime**: Nuxt Nitro server (Node.js)
* **Database**: PostgreSQL with Kysely SQL query builder (type-safe)
* **ORM/Query Builder**: Kysely with PostgresDialect
* **Protocols**: 
  - ICMP Ping (via `ping` command)
  - SNMP v2c (net-snmp library)
  - HTTP Basic Authentication

### External Dependencies
* **Speedtest CLI**: Ookla Speedtest CLI (`speedtest` command) for bandwidth testing
* **SNMP**: Access to SNMP-enabled network device (e.g., PfSense router)

### Development Tools
* **Package Manager**: pnpm (v10.18.3)
* **TypeScript**: Full TypeScript support with type checking
* **Linting**: ESLint with Antfu's config
* **Database Migrations**: kysely-ctl for schema management

---

## 📋 Prerequisites

Before installing, ensure you have:

1. **Node.js** (v18 or higher)
2. **pnpm** (v10.18.3 or compatible version)
3. **PostgreSQL** (v12 or higher) - running and accessible
4. **Speedtest CLI** by Ookla - [Installation Guide](https://www.speedtest.net/apps/cli)
   ```bash
   # Example installation on Linux
   curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | sudo bash
   sudo apt-get install speedtest
   ```
5. **SNMP Access** to your network device (PfSense, router, etc.)
   - SNMP v2c community string
   - Access to interface OIDs (default: `.1.3.6.1.2.1.2.2.1.10.5` for in, `.1.3.6.1.2.1.2.2.1.16.5` for out)
6. **ping** command available on your system (usually pre-installed on Linux/macOS/Windows)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/markchristianlacap/nuxt-net-monitoring.git
cd nuxt-net-monitoring
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory (you can copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# SNMP Configuration
NUXT_SNMP_COMMUNITY=your-snmp-community-string
NUXT_SNMP_HOST=192.168.1.1  # Your PfSense/router IP

# Ping Target
NUXT_PING_HOST=8.8.8.8  # Target IP to monitor (e.g., Google DNS)

# PostgreSQL Database
NUXT_DB_HOST=localhost
NUXT_DB_PORT=5432
NUXT_DB_USER=postgres
NUXT_DB_PASSWORD=your-db-password
NUXT_DB_NAME=net-monitor

# Basic Authentication
NUXT_USER=admin
NUXT_PASS=your-secure-password
```

### 4. Setup Database

Create the PostgreSQL database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE "net-monitor";
\q
```

Run database migrations:

```bash
pnpm exec kysely migrate latest
```

This will create the required tables:
- `pings` - Stores ping latency and status
- `bandwidths` - Stores SNMP bandwidth data
- `speedtest_results` - Stores speed test results

### 5. Run the Development Server

```bash
pnpm run dev
```

The application will be available at `http://localhost:3000`

### 6. Build for Production

```bash
# Build the application
pnpm run build

# Preview production build
pnpm run preview

# Or start production server
node .output/server/index.mjs
```

---

## 📝 Usage

### Authentication

When you first access the application, you'll be prompted for HTTP Basic Authentication:
- **Username**: Value from `NUXT_USER` env variable
- **Password**: Value from `NUXT_PASS` env variable

Authentication is cached via cookie for 48 hours.

### Main Dashboard (`/`)

The homepage displays real-time monitoring with two tabs:

1. **Ping Latency Tab**
   - Live streaming ping data every second
   - Real-time latency graph
   - Status indicator (online/offline)

2. **Bandwidth Tab**
   - Live SNMP bandwidth monitoring
   - Upload and download speeds in Mbps
   - Continuous data collection every second

### Speed Test (`/speedtest`)

Click **"Run Speed Test"** button in the header or navigate to `/speedtest`:
- Live progress with real-time metrics
- Download and upload speed visualization
- Ping latency measurement
- ISP and public IP detection
- Results saved automatically to database
- Sharable result URL from Speedtest.net

### Historical Data

View historical records with pagination and export options:

1. **Ping Results** (`/pings`)
   - Historical ping data with timestamps
   - Status and latency records
   - CSV export functionality

2. **Bandwidth Results** (`/bandwidths`)
   - Historical bandwidth measurements
   - Upload/download trends over time
   - CSV export available

3. **Speed Test Results** (`/speedtest-results`)
   - Past speed test history
   - Complete test details (download, upload, latency, ISP, result URL)
   - CSV export for analysis

---

## 🏗️ How It Works

### Background Processes

The application runs three background monitoring processes:

1. **Ping Monitor** (`server/plugins/ping.server.ts`)
   - Spawns continuous `ping` process on server startup
   - Monitors configured `NUXT_PING_HOST` every 1 second
   - Parses latency from ping output
   - Stores results in PostgreSQL `pings` table

2. **Bandwidth Monitor** (`server/plugins/bandwidth.server.ts`)
   - Queries SNMP device every 1 second
   - Reads interface byte counters via SNMP OIDs
   - Calculates bandwidth delta (Mbps)
   - Stores results in `bandwidths` table

3. **Speed Test Scheduler** (`server/plugins/speedtest.server.ts`)
   - Runs Ookla Speedtest CLI every hour
   - Stores results in `speedtest_results` table
   - Captures download/upload speeds, latency, ISP, and result URL

### Real-Time Streaming

- **Server-Sent Events (SSE)**: Used for live data streaming
- **API Endpoints**:
  - `/api/pings/stream.get` - Live ping data stream
  - `/api/bandwidths/stream.get` - Live bandwidth stream
  - `/api/speedtest` (POST) - Live speed test execution stream

### Database Schema

All data is stored in PostgreSQL using Kysely ORM:

- **pings**: `id`, `host`, `status`, `latency`, `timestamp`
- **bandwidths**: `id`, `host`, `inMbps`, `outMbps`, `timestamp`
- **speedtest_results**: `id`, `download`, `upload`, `latency`, `isp`, `ip`, `url`, `timestamp`

---

## 🛠️ Development

### Available Scripts

```bash
# Start development server with hot reload
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Type checking
pnpm run typecheck

# Lint code
pnpm run lint

# Run database migrations
pnpm exec kysely migrate latest

# Rollback last migration
pnpm exec kysely migrate down
```

### Project Structure

```
nuxt-net-monitoring/
├── app/
│   ├── pages/              # Vue pages (routes)
│   ├── components/         # Vue components
│   ├── assets/            # CSS and static assets
│   └── app.vue            # Root component with navigation
├── server/
│   ├── api/               # API endpoints
│   ├── db/                # Database config and migrations
│   ├── middleware/        # Server middleware (auth)
│   ├── plugins/           # Background processes
│   └── utils/             # Utility functions
├── shared/                # Shared types and utilities
├── nuxt.config.ts         # Nuxt configuration
├── kysely.config.ts       # Database migration config
└── .env                   # Environment variables
```

---

## 🔧 Configuration

### SNMP OID Configuration

If your network device uses different interface IDs, modify the OIDs in `server/utils/bandwidth.ts`:

```typescript
const inOid = '1.3.6.1.2.1.2.2.1.10.5'   // ifInOctets for interface 5
const outOid = '1.3.6.1.2.1.2.2.1.16.5'  // ifOutOctets for interface 5
```

To find your interface ID, use an SNMP browser or:
```bash
snmpwalk -v2c -c your-community-string your-host-ip 1.3.6.1.2.1.2.2.1.2
```

### Custom Ping Interval

To change ping frequency, edit `server/plugins/ping.server.ts`:
```typescript
const ping = spawn('ping', ['-i', '1', host])  // -i 1 = 1 second interval
```

---

## 📸 Screenshots

**Dashboard Example**
![Dashboard Screenshot](./screenshots/dashboard.png)

**Live Bandwidth Chart**
![Bandwidth Chart](./screenshots/bandwidth.png)

**Speed Test Results**
![Speed Test Chart](./screenshots/speedtest.png)

> Screenshots show the actual application UI with live charts and monitoring data.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is open source and available under the MIT License.

---

## ⚠️ Troubleshooting

### Speedtest CLI Not Found
```bash
# Install Speedtest CLI
curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | sudo bash
sudo apt-get install speedtest
```

### SNMP Connection Issues
- Verify SNMP is enabled on your device
- Check community string is correct
- Ensure firewall allows SNMP (UDP port 161)
- Test with: `snmpwalk -v2c -c your-community device-ip system`

### Database Connection Failed
- Verify PostgreSQL is running
- Check credentials in `.env` file
- Ensure database exists: `psql -U postgres -l`
- Run migrations: `pnpm exec kysely migrate latest`

### Ping Not Working
- Check target host is reachable
- Verify `ping` command is available
- Some systems require elevated privileges for ICMP

---

## 📧 Contact

For questions or support, please open an issue on GitHub.
