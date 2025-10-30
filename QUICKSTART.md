# Quick Start with Docker

Get the Nuxt Network Monitoring System running in under 5 minutes!

## Prerequisites

- Docker Engine 20.10+ ([Install Docker](https://docs.docker.com/engine/install/))
- Docker Compose v2.0+ (included with Docker Desktop)

## 🚀 3-Step Quick Start

### 1. Clone and Enter Directory

```bash
git clone https://github.com/markchristianlacap/nuxt-net-monitoring.git
cd nuxt-net-monitoring
```

### 2. Configure Your Settings

Edit `docker-compose.yml` and update these values:

```yaml
NUXT_SNMP_COMMUNITY: your-snmp-community  # Your SNMP community string
NUXT_SNMP_HOST: 192.168.1.1              # Your router/PfSense IP
NUXT_USER: admin                          # Your admin username
NUXT_PASS: your-password                  # Your secure password
```

**💡 Tip:** Use `docker-compose.override.yml` instead for easier updates:
```bash
cp docker-compose.override.yml.example docker-compose.override.yml
nano docker-compose.override.yml  # Edit your settings
```

### 3. Start the Application

```bash
docker compose up -d
```

That's it! The application is now running at: **http://localhost:3000**

## 📊 What Just Happened?

Docker Compose automatically:
1. ✅ Downloaded PostgreSQL database image
2. ✅ Built the application container with all dependencies
3. ✅ Created a persistent volume for your data
4. ✅ Ran database migrations
5. ✅ Started both services with health checks

## 🔍 Useful Commands

```bash
# View logs (real-time)
docker compose logs -f

# View only app logs
docker compose logs -f app

# Stop the application (data is preserved)
docker compose down

# Stop and remove all data
docker compose down -v

# Restart after config changes
docker compose up -d --force-recreate

# Rebuild after code updates
docker compose up -d --build
```

## ❓ Troubleshooting

**Can't connect to SNMP device?**
- Try host networking: uncomment `network_mode: host` in docker-compose.yml

**Need to change ports?**
```yaml
ports:
  - "3001:3000"  # Use port 3001 instead of 3000
```

**Want more details?**
- See [DOCKER.md](./DOCKER.md) for comprehensive guide
- See [README.md](./README.md) for application features

## 🔐 Security Reminder

⚠️ **Change the default credentials!** The default username/password are:
- Username: `admin`
- Password: `secret123`

Update these in `docker-compose.yml` or `docker-compose.override.yml` before deploying!

## 📚 Next Steps

1. Access http://localhost:3000 with your credentials
2. Monitor ping latency in real-time
3. View bandwidth monitoring from your SNMP device
4. Run speed tests and view historical data

Need help? Check the [full documentation](./DOCKER.md) or open an issue on GitHub.
