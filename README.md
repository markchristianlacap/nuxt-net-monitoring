# Nuxt Network Monitoring System 🚀

[![Nuxt.js](https://img.shields.io/badge/Nuxt.js-013220?style=flat\&logo=nuxt.js\&logoColor=white)](https://nuxt.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat\&logo=node.js\&logoColor=white)](https://nodejs.org/)
[![Speedtest CLI](https://img.shields.io/badge/Speedtest-CLI-orange?style=flat\&logo=ookla)](https://www.speedtest.net/apps/cli)
[![PfSense SNMP](https://img.shields.io/badge/PfSense-SNMP-blue?style=flat\&logo=pfSense)](https://www.pfsense.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat\&logo=postgresql\&logoColor=white)](https://www.postgresql.org/)

A **real-time network monitoring system** built with Nuxt.js. Monitor IP availability, interface bandwidth, and internet speed with live charts and historical data.

---

## 🎯 Features

* **Ping Monitoring**: Track IP availability in real-time.
* **Bandwidth Monitoring**: Monitor **upload/download** from PfSense interfaces using SNMP.
* **Live Charts**: Real-time visualization of ping, bandwidth, and speed tests.
* **Historical Data**: View past network and speed test trends.
* **Speed Test Integration**:

  * Automated speed tests every hour
  * Manual on-demand tests
  * Live visualization of test results
  * Direct integration with **Ookla Speedtest CLI**

---

## 🖥️ Screenshots

**Dashboard Example**
![Dashboard Screenshot](./screenshots/dashboard.png)

**Live Bandwidth Chart**
![Bandwidth Chart](./screenshots/bandwidth.png)

**Speed Test Results**
![Speed Test Chart](./screenshots/speedtest.png)

> Replace the above images with actual screenshots from your app.

---

## ⚙️ Tech Stack

* **Frontend**: Nuxt.js, Vue 3
* **Backend**: Node.js (Nuxt server)
* **Protocols**:

  * Ping (ICMP)
  * SNMP for PfSense bandwidth
* **Charts**: ECharts (live & historical visualization)
* **Speed Test**: Speedtest CLI by Ookla
* **Database**: PostgreSQL

---

## 🚀 Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/nuxt-net-monitor.git
cd nuxt-net-monitor
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure environment variables (`.env`):

```env
NUXT_SNMP_COMMUNITY=hello@world
NUXT_SNMP_HOST=127.0.0.1
NUXT_PING_HOST=8.8.8.8
NUXT_DB_HOST=127.0.0.1
NUXT_DB_PORT=5432
NUXT_DB_USER=postgres
NUXT_DB_PASSWORD=postgres
NUXT_DB_NAME=net-monitor
BASIC_AUTH_USER=admin
BASIC_AUTH_PASS=secret123
```

4. Run the development server:

```bash
pnpm run dev
```

---

## 📝 Usage

* **Dashboard**: Live status of IPs and interface bandwidth.
* **Speed Test**:

  * Click **Run Speed Test** for an on-demand test
  * Hourly automated tests update live charts automatically
* **History**: Explore past ping, bandwidth, and speed test data.

