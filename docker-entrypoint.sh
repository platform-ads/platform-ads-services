#!/bin/bash

# Log thông tin phần cứng và hệ thống
echo "=========================================="
echo "🖥️  PLATFORM ADS SERVICES - SYSTEM INFO"
echo "=========================================="
echo ""

# OS Info
echo "📦 Operating System:"
cat /etc/os-release | grep -E "PRETTY_NAME|VERSION_ID"
echo ""

# CPU Info
echo "⚙️  CPU Information:"
echo "  Cores: $(nproc)"
echo "  Model: $(cat /proc/cpuinfo | grep "model name" | head -1 | awk -F': ' '{print $2}')"
echo ""

# Memory Info
echo "🧠 Memory Information:"
TOTAL_MEM=$(free -h | awk '/^Mem:/ {print $2}')
AVAILABLE_MEM=$(free -h | awk '/^Mem:/ {print $7}')
echo "  Total: $TOTAL_MEM"
echo "  Available: $AVAILABLE_MEM"
echo ""

# Disk Info
echo "💾 Disk Information:"
df -h / | awk 'NR==2 {printf "  Total: %s\n  Used: %s\n  Available: %s\n  Usage: %s\n", $2, $3, $4, $5}'
echo ""

# Node.js & NPM versions
echo "📝 Environment:"
echo "  Node.js: $(node --version)"
echo "  NPM: $(npm --version)"
echo "  Environment: $NODE_ENV"
echo ""

# App Info
echo "🚀 Application Info:"
echo "  Service: platform-ads-services"
echo "  Container: $(hostname)"
if [ -f /app/package.json ]; then
  APP_VERSION=$(grep '"version"' /app/package.json | head -1 | awk -F'"' '{print $4}')
  echo "  Version: $APP_VERSION"
fi
echo ""

echo "=========================================="
echo "✅ Starting services..."
echo "=========================================="
echo ""

# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
