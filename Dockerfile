# Use Node.js LTS as base image
FROM node:20-slim

# Install system dependencies including ping and postgresql client
RUN apt-get update && \
    apt-get install -y \
    curl \
    gnupg \
    wget \
    iputils-ping \
    ca-certificates \
    postgresql-client && \
    # Clean up to reduce image size
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Ookla Speedtest CLI (optional, can be skipped if build fails)
# NOTE: This downloads and runs a script from the internet. In production environments,
# consider verifying the script or using a specific package version for better security.
# The installation is wrapped in a conditional to allow build to continue if it fails.
RUN curl -fsSL https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash && \
    apt-get update && \
    apt-get install -y speedtest && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* || \
    echo "Warning: Speedtest CLI installation failed. Speed test feature will not be available."

# Install pnpm
RUN npm install -g pnpm@10.18.3

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

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
