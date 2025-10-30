# Use Node.js LTS as base image
FROM node:20-slim

# Install system dependencies including Speedtest CLI and ping
RUN apt-get update && \
    apt-get install -y \
    curl \
    gnupg \
    iputils-ping \
    ca-certificates \
    postgresql-client && \
    # Install Ookla Speedtest CLI from official repository
    curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash && \
    apt-get install -y speedtest && \
    # Clean up to reduce image size
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@10.18.3

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application files
COPY . .

# Build the application
RUN pnpm run build

# Expose the port
EXPOSE 3000

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# Start the application
CMD ["node", ".output/server/index.mjs"]
