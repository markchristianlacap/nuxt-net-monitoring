# Docker Deployment Guide

This guide provides detailed instructions for deploying the Nuxt Network Monitoring System using Docker and Docker Compose.

## 📋 Prerequisites

- Docker Engine 20.10+ installed ([Installation Guide](https://docs.docker.com/engine/install/))
- Docker Compose v2.0+ installed (usually included with Docker Desktop)
- Basic understanding of Docker concepts
- Network access to your SNMP-enabled device (router, PfSense, etc.)

## 🚀 Quick Start

### 1. Clone and Navigate

```bash
git clone https://github.com/markchristianlacap/nuxt-net-monitoring.git
cd nuxt-net-monitoring
```

### 2. Configure Environment

Edit the environment variables in `docker-compose.yml` under the `app` service, or create a `docker-compose.override.yml` file:

```bash
# Option 1: Edit docker-compose.yml directly
nano docker-compose.yml

# Option 2 (Recommended): Create override file
cp docker-compose.override.yml.example docker-compose.override.yml
nano docker-compose.override.yml
```

**Important variables to configure:**

```yaml
NUXT_SNMP_COMMUNITY: your-snmp-community-string  # Your SNMP community string
NUXT_SNMP_HOST: 192.168.1.1                      # Your router/PfSense IP
NUXT_USER: admin                                  # Change from default!
NUXT_PASS: your-secure-password                   # Change from default!
```

### 3. Start Services

```bash
# Build and start all services in detached mode
docker compose up -d

# View logs (follow mode)
docker compose logs -f

# View only app logs
docker compose logs -f app
```

### 4. Access the Application

Once started, the application will be available at:
- **URL**: http://localhost:3000
- **Username**: Value of `NUXT_USER` (default: admin)
- **Password**: Value of `NUXT_PASS` (default: secret123)

**⚠️ Security Note**: Change the default credentials before deployment!

## 🔧 Configuration Details

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NUXT_SNMP_COMMUNITY` | SNMP community string for device access | hello@world | Yes |
| `NUXT_SNMP_HOST` | IP address of SNMP device (router/PfSense) | 192.168.1.1 | Yes |
| `NUXT_SNMP_IN_OID` | SNMP OID for inbound traffic counter | 1.3.6.1.2.1.2.2.1.10.5 | No |
| `NUXT_SNMP_OUT_OID` | SNMP OID for outbound traffic counter | 1.3.6.1.2.1.2.2.1.16.5 | No |
| `NUXT_PING_HOST` | Target host for ping monitoring | 8.8.8.8 | Yes |
| `NUXT_DB_HOST` | PostgreSQL host (service name in Docker) | postgres | Yes |
| `NUXT_DB_PORT` | PostgreSQL port | 5432 | Yes |
| `NUXT_DB_USER` | PostgreSQL username | postgres | Yes |
| `NUXT_DB_PASSWORD` | PostgreSQL password | postgres | Yes |
| `NUXT_DB_NAME` | PostgreSQL database name | net-monitor | Yes |
| `NUXT_USER` | Basic auth username | admin | Yes |
| `NUXT_PASS` | Basic auth password | secret123 | Yes |

### Network Modes

#### Bridge Network (Default)

The default configuration uses Docker's bridge network. This works well when:
- Your SNMP device is accessible from the Docker host
- You're monitoring external hosts (like 8.8.8.8)

```yaml
services:
  app:
    networks:
      - net-monitoring
```

#### Host Network

If your SNMP device is on the **same local network** as your Docker host and you're experiencing connectivity issues, use host network mode:

```yaml
services:
  app:
    network_mode: host
    # Comment out or remove the 'ports' section when using host mode
```

**Note**: When using host network mode:
- The app is directly accessible on port 3000 (no port mapping needed)
- The container shares the host's network namespace
- Some Docker networking features like custom networks won't work

### Volume Management

The PostgreSQL database uses a named volume for data persistence:

```yaml
volumes:
  postgres_data:
    driver: local
```

**Data persists** across container restarts and recreations, but you can remove it:

```bash
# Stop and remove containers + volumes
docker compose down -v

# Or remove only the volume
docker volume rm nuxt-net-monitoring_postgres_data
```

## 🛠️ Common Operations

### Start/Stop Services

```bash
# Start services
docker compose up -d

# Stop services (keeps containers and volumes)
docker compose stop

# Stop and remove containers (keeps volumes)
docker compose down

# Stop, remove containers and volumes (clean slate)
docker compose down -v
```

### View Logs

```bash
# All logs
docker compose logs -f

# Only app logs
docker compose logs -f app

# Only database logs
docker compose logs -f postgres

# Last 100 lines
docker compose logs --tail=100 app
```

### Rebuild Application

After making code changes or updating the repository:

```bash
# Rebuild and restart
docker compose up -d --build

# Force rebuild without cache
docker compose build --no-cache
docker compose up -d
```

### Access Container Shell

```bash
# Access app container
docker compose exec app sh

# Access postgres container
docker compose exec postgres psql -U postgres -d net-monitor
```

### Database Operations

```bash
# Run migrations manually
docker compose exec app pnpm exec kysely migrate latest

# Backup database
docker compose exec postgres pg_dump -U postgres net-monitor > backup.sql

# Restore database
docker compose exec -T postgres psql -U postgres -d net-monitor < backup.sql

# Access psql shell
docker compose exec postgres psql -U postgres -d net-monitor
```

### Monitoring Container Health

```bash
# Check status
docker compose ps

# Check resource usage
docker stats

# Inspect a service
docker compose logs app

# Check PostgreSQL health
docker compose exec postgres pg_isready -U postgres
```

## 🔍 Troubleshooting

### Application Won't Start

1. **Check logs**:
   ```bash
   docker compose logs app
   ```

2. **Verify database is ready**:
   ```bash
   docker compose exec postgres pg_isready -U postgres
   ```

3. **Check environment variables**:
   ```bash
   docker compose config
   ```

### SNMP Connection Issues

1. **Verify SNMP device is reachable**:
   ```bash
   docker compose exec app ping -c 3 192.168.1.1
   ```

2. **Test SNMP access** (requires net-snmp tools):
   ```bash
   docker compose exec app sh
   # Inside container:
   apt-get update && apt-get install -y snmp
   snmpwalk -v2c -c your-community 192.168.1.1 system
   ```

3. **Try host network mode** if bridge network doesn't work

### Port Already in Use

If port 3000 or 5432 is already in use:

```yaml
# Change ports in docker-compose.yml
services:
  postgres:
    ports:
      - "5433:5432"  # External:Internal
  app:
    ports:
      - "3001:3000"  # External:Internal
```

### Database Connection Failed

1. **Wait for database to be ready** (automatic via healthcheck)
2. **Check database credentials** in environment variables
3. **Verify database exists**:
   ```bash
   docker compose exec postgres psql -U postgres -l
   ```

### Speedtest Feature Not Working

The Speedtest CLI may not be installed in the Docker image due to network restrictions during build. To fix:

1. **Access container and install manually**:
   ```bash
   docker compose exec app sh
   curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash
   apt-get update && apt-get install speedtest
   ```

2. **Or rebuild with network access**:
   ```bash
   docker compose build --no-cache
   ```

### Migrations Not Running

If migrations don't run automatically:

```bash
# Run migrations manually
docker compose exec app pnpm exec kysely migrate latest

# Check migration status
docker compose exec postgres psql -U postgres -d net-monitor -c "SELECT * FROM kysely_migration;"
```

## 📊 Production Deployment

### Security Hardening

1. **Change default credentials**:
   ```yaml
   NUXT_USER: your_admin_username
   NUXT_PASS: strong_password_here
   ```

2. **Use secrets** (Docker Swarm/Kubernetes):
   ```yaml
   services:
     app:
       secrets:
         - db_password
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

3. **Enable restart policies**:
   ```yaml
   services:
     app:
       restart: unless-stopped
     postgres:
       restart: unless-stopped
   ```

4. **Use specific image tags** instead of `latest`

### Reverse Proxy Setup (Nginx)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name monitor.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Backup Strategy

1. **Database backups**:
   ```bash
   # Create backup script
   docker compose exec postgres pg_dump -U postgres net-monitor | gzip > backup-$(date +%Y%m%d).sql.gz
   ```

2. **Volume backups**:
   ```bash
   docker run --rm -v nuxt-net-monitoring_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-data-backup.tar.gz -C /data .
   ```

### Monitoring

Consider adding monitoring tools:
- **Prometheus + Grafana** for metrics
- **Loki** for log aggregation
- **Docker health checks** for automated restarts

## 🔄 Updates

To update the application:

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Or use pull for pre-built images (if available)
docker compose pull
docker compose up -d
```

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `docker compose logs -f`
2. Verify configuration: `docker compose config`
3. Check container status: `docker compose ps`
4. Review this documentation
5. Open an issue on GitHub with logs and configuration (redact sensitive info)

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
