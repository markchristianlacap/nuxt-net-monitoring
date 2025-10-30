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
* **Ping Monitoring**: Continuous ping monitoring with 1-second intervals, live latency tracking, and status detection. Data is averaged and saved to database every 60 seconds
* **Bandwidth Monitoring**: Real-time SNMP monitoring of network interface traffic (inbound/outbound Mbps) from PfSense or other SNMP-enabled devices. Data is collected every second, averaged, and saved every 60 seconds
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
   # Example installation on Linux (from official Ookla repository)
   # Note: Review the script before running or use your system's package manager if available
   curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | sudo bash
   sudo apt-get install speedtest
   ```
5. **SNMP Access** to your network device (PfSense, router, etc.)
   - SNMP v2c community string
   - Access to interface OIDs (default: `.1.3.6.1.2.1.2.2.1.10.5` for in, `.1.3.6.1.2.1.2.2.1.16.5` for out)
6. **ping** command available on your system (usually pre-installed on Linux/macOS/Windows)

---

## 🚀 Installation

Choose one of the following installation methods:

### Option A: Docker Compose (Recommended) 🐳

The easiest way to get started! Docker Compose will set up everything automatically, including PostgreSQL and all dependencies.

#### Prerequisites
- Docker Engine 20.10+
- Docker Compose v2.0+

#### Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/markchristianlacap/nuxt-net-monitoring.git
   cd nuxt-net-monitoring
   ```

2. **Configure Environment Variables**
   
   Edit the environment variables in `docker-compose.yml` to match your network setup:
   ```yaml
   # Update these in docker-compose.yml under app -> environment
   NUXT_SNMP_COMMUNITY: your-snmp-community-string
   NUXT_SNMP_HOST: 192.168.1.1  # Your PfSense/router IP
   NUXT_USER: admin              # Change default username
   NUXT_PASS: your-secure-password  # Change default password
   ```

3. **Start the Application**
   ```bash
   docker compose up -d
   ```
   
   This will:
   - Pull/build all required images
   - Start PostgreSQL database
   - Run database migrations automatically
   - Start the monitoring application
   
   The application will be available at `http://localhost:3000`

4. **View Logs**
   ```bash
   # View all logs
   docker compose logs -f
   
   # View app logs only
   docker compose logs -f app
   ```

5. **Stop the Application**
   ```bash
   docker compose down
   
   # To remove volumes (database data) as well
   docker compose down -v
   ```

#### Docker Tips

- **Full Documentation**: See [DOCKER.md](./DOCKER.md) for comprehensive Docker deployment guide
- **Accessing Local Network Devices**: If your SNMP device (e.g., PfSense) is on your local network, you may need to use host network mode. See DOCKER.md for details.
- **Persistent Data**: Database data is stored in a Docker volume named `postgres_data` and persists across container restarts.
- **Rebuild After Code Changes**:
  ```bash
  docker compose up -d --build
  ```

---

### Option B: Manual Installation

If you prefer to install manually without Docker:

#### 1. Clone the Repository

```bash
git clone https://github.com/markchristianlacap/nuxt-net-monitoring.git
cd nuxt-net-monitoring
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Configure Environment Variables

Create a `.env` file in the root directory (you can copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# SNMP Configuration
NUXT_SNMP_COMMUNITY=your-snmp-community-string
NUXT_SNMP_HOST=192.168.1.1  # Your PfSense/router IP
NUXT_SNMP_IN_OID=1.3.6.1.2.1.2.2.1.10.5  # SNMP OID for inbound traffic (ifInOctets)
NUXT_SNMP_OUT_OID=1.3.6.1.2.1.2.2.1.16.5  # SNMP OID for outbound traffic (ifOutOctets)

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

#### 4. Setup Database

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

#### 5. Run the Development Server

```bash
pnpm run dev
```

The application will be available at `http://localhost:3000`

#### 6. Build for Production

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
   - Database stores 60-second averages for historical tracking

2. **Bandwidth Tab**
   - Live SNMP bandwidth monitoring every second
   - Upload and download speeds in Mbps
   - Real-time visualization
   - Database stores 60-second averages for historical tracking

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
   - Collects latency readings and calculates average every 60 seconds
   - Stores averaged results in PostgreSQL `pings` table

2. **Bandwidth Monitor** (`server/plugins/bandwidth.server.ts`)
   - Queries SNMP device every 1 second using precise timing helper (`runEverySecond`)
   - Reads interface byte counters via SNMP OIDs
   - Calculates bandwidth delta (Mbps) for each reading
   - Collects bandwidth readings and calculates average every 60 seconds
   - Stores averaged results in `bandwidths` table

3. **Speed Test Scheduler** (`server/plugins/speedtest.server.ts`)
   - Runs Ookla Speedtest CLI every hour using precise timing helper (`runEveryHour`)
   - Stores results in `speedtest_results` table
   - Captures download/upload speeds, latency, ISP, and result URL

### Real-Time Streaming

- **Server-Sent Events (SSE)**: Used for live data streaming to the frontend
- **API Endpoints**:
  - `/api/pings/stream.get` - Live ping data stream (updates every second)
  - `/api/bandwidths/stream.get` - Live bandwidth stream (updates every second)
  - `/api/speedtest` (POST) - Live speed test execution stream

### Data Collection & Storage Strategy

The application uses a two-tier approach for optimal performance:

**Real-Time Collection** (Every 1 second):
- Ping latency measurements
- SNMP bandwidth readings
- Streamed to frontend via SSE for live visualization

**Database Storage** (Every 60 seconds):
- Averaged ping latency over the past minute
- Averaged bandwidth readings over the past minute
- Reduces database writes while maintaining data accuracy
- Historical data remains accessible for analysis and export

This approach provides real-time monitoring responsiveness while efficiently managing database resources.

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

The SNMP OIDs for monitoring network interfaces can be configured via environment variables in your `.env` file:

```env
NUXT_SNMP_IN_OID=1.3.6.1.2.1.2.2.1.10.5  # ifInOctets for interface 5
NUXT_SNMP_OUT_OID=1.3.6.1.2.1.2.2.1.16.5  # ifOutOctets for interface 5
```

If not specified, the application defaults to interface 5 (`.10.5` for inbound and `.16.5` for outbound).

To find your interface ID, use an SNMP browser or:
```bash
snmpwalk -v2c -c your-community-string your-host-ip 1.3.6.1.2.1.2.2.1.2
```

### Custom Ping Interval

To change ping frequency, edit `server/plugins/ping.server.ts`:
```typescript
const ping = spawn('ping', ['-i', '1', host]) // -i 1 = 1 second interval
```

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
# Install Speedtest CLI (from official Ookla repository)
# Note: Review the script before running or use your system's package manager if available
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
