# Nuxt Network Monitoring System 🚀

[![Nuxt.js](https://img.shields.io/badge/Nuxt.js-013220?style=flat\&logo=nuxt.js\&logoColor=white)](https://nuxt.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat\&logo=node.js\&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Speedtest CLI](https://img.shields.io/badge/Speedtest-CLI-orange?style=flat\&logo=ookla)](https://www.speedtest.net/apps/cli)

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

---

## 🚀 Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/nuxt-net-monitor.git
cd nuxt-net-monitor
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables (`.env`):

```env
PF_HOST=192.168.1.1
PF_SNMP_COMMUNITY=public
```

4. Run the development server:

```bash
npm run dev
```

---

## 📝 Usage

* **Dashboard**: Live status of IPs and interface bandwidth.
* **Speed Test**:

  * Click **Run Speed Test** for an on-demand test
  * Hourly automated tests update live charts automatically
* **History**: Explore past ping, bandwidth, and speed test data.

---

## 🔧 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature-name`)
3. Commit your changes (`git commit -m "Add feature"`)
4. Push to the branch (`git push origin feature-name`)
5. Open a pull request

---

## 📄 License

This project is licensed under the MIT License.

---

If you want, I can also **add a small diagram showing the system architecture** with Ping, SNMP, and Speedtest integration so anyone can understand it at a glance.

Do you want me to add that diagram?

