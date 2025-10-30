# Build Stage 1

FROM node:lts-bullseye AS build
WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
  curl \
  iputils-ping \
  postgresql-client && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists


RUN curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash && \
  apt-get update && apt-get install -y speedtest && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists

RUN corepack enable

# Copy package.json and your lockfile, here we add pnpm-lock.yaml for illustration
COPY package.json pnpm-lock.yaml .npmrc ./

# Install dependencies
RUN pnpm i

# Copy the entire project
COPY . ./

# Build the project
RUN pnpm run build

EXPOSE 3000

# copy entrypoint script
COPY docker-entry.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entry.sh

ENTRYPOINT ["docker-entry.sh"]

CMD ["node", ".output/server/index.mjs"]
