# Stage 1: Build
FROM ubuntu:24.04 AS builder

# Cài đặt dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    git \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Node.js (phiên bản LTS mới nhất)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy source code
COPY . .

# Build ứng dụng
RUN npm run build

# Stage 2: Runtime
FROM ubuntu:24.04

# Cài đặt dependencies runtime
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    nginx \
    supervisor \
    bc \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Node.js runtime
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy node_modules và dist từ builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copy Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose ports
EXPOSE 3000 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start with entrypoint script (log system info + start supervisor)
ENTRYPOINT ["/app/docker-entrypoint.sh"]
