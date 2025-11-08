#!/bin/bash

# Tạo thư mục log cần thiết
mkdir -p /var/log/supervisor /var/log/nginx /var/log/nodejs

# Log thông tin phần cứng và hệ thống
echo "=========================================="
echo "🖥️  PLATFORM ADS SERVICES - SYSTEM INFO"
echo "=========================================="
echo ""

# OS Info
echo "📦 Operating System:"
cat /etc/os-release | grep -E "PRETTY_NAME|VERSION_ID"
echo ""

# CPU Info (lấy từ cgroups - phần cứng được cấp cho container)
echo "⚙️  CPU Information:"
if [ -f /sys/fs/cgroup/cpu/cpu.cfs_quota_us ]; then
  CPU_QUOTA=$(cat /sys/fs/cgroup/cpu/cpu.cfs_quota_us)
  CPU_PERIOD=$(cat /sys/fs/cgroup/cpu/cpu.cfs_period_us)
  if [ "$CPU_QUOTA" != "-1" ]; then
    CPU_ALLOCATED=$(echo "scale=2; $CPU_QUOTA / $CPU_PERIOD" | bc)
    echo "  Allocated vCPUs: $CPU_ALLOCATED"
  else
    echo "  Allocated vCPUs: $(nproc)"
  fi
elif [ -f /sys/fs/cgroup/cpu.max ]; then
  # cgroups v2
  CPU_INFO=$(cat /sys/fs/cgroup/cpu.max)
  if [ "$CPU_INFO" != "max 100000" ]; then
    CPU_QUOTA=$(echo $CPU_INFO | awk '{print $1}')
    CPU_PERIOD=$(echo $CPU_INFO | awk '{print $2}')
    CPU_ALLOCATED=$(echo "scale=2; $CPU_QUOTA / $CPU_PERIOD" | bc)
    echo "  Allocated vCPUs: $CPU_ALLOCATED"
  else
    echo "  Allocated vCPUs: $(nproc)"
  fi
else
  echo "  Allocated vCPUs: $(nproc)"
fi
echo ""

# Memory Info (lấy từ cgroups - RAM được cấp cho container)
echo "🧠 Memory Information:"
if [ -f /sys/fs/cgroup/memory/memory.limit_in_bytes ]; then
  # cgroups v1
  MEM_LIMIT=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes)
  MEM_USAGE=$(cat /sys/fs/cgroup/memory/memory.usage_in_bytes)
  if [ "$MEM_LIMIT" != "9223372036854771712" ]; then
    MEM_LIMIT_MB=$(echo "scale=0; $MEM_LIMIT / 1024 / 1024" | bc)
    MEM_USAGE_MB=$(echo "scale=0; $MEM_USAGE / 1024 / 1024" | bc)
    MEM_AVAILABLE_MB=$(echo "$MEM_LIMIT_MB - $MEM_USAGE_MB" | bc)
    echo "  Allocated: ${MEM_LIMIT_MB}Mi"
    echo "  Used: ${MEM_USAGE_MB}Mi"
    echo "  Available: ${MEM_AVAILABLE_MB}Mi"
  else
    TOTAL_MEM=$(free -h | awk '/^Mem:/ {print $2}')
    AVAILABLE_MEM=$(free -h | awk '/^Mem:/ {print $7}')
    echo "  Total: $TOTAL_MEM"
    echo "  Available: $AVAILABLE_MEM"
  fi
elif [ -f /sys/fs/cgroup/memory.max ]; then
  # cgroups v2
  MEM_LIMIT=$(cat /sys/fs/cgroup/memory.max)
  MEM_USAGE=$(cat /sys/fs/cgroup/memory.current)
  if [ "$MEM_LIMIT" != "max" ]; then
    MEM_LIMIT_MB=$(echo "scale=0; $MEM_LIMIT / 1024 / 1024" | bc)
    MEM_USAGE_MB=$(echo "scale=0; $MEM_USAGE / 1024 / 1024" | bc)
    MEM_AVAILABLE_MB=$(echo "$MEM_LIMIT_MB - $MEM_USAGE_MB" | bc)
    echo "  Allocated: ${MEM_LIMIT_MB}Mi"
    echo "  Used: ${MEM_USAGE_MB}Mi"
    echo "  Available: ${MEM_AVAILABLE_MB}Mi"
  else
    TOTAL_MEM=$(free -h | awk '/^Mem:/ {print $2}')
    AVAILABLE_MEM=$(free -h | awk '/^Mem:/ {print $7}')
    echo "  Total: $TOTAL_MEM"
    echo "  Available: $AVAILABLE_MEM"
  fi
else
  TOTAL_MEM=$(free -h | awk '/^Mem:/ {print $2}')
  AVAILABLE_MEM=$(free -h | awk '/^Mem:/ {print $7}')
  echo "  Total: $TOTAL_MEM"
  echo "  Available: $AVAILABLE_MEM"
fi
echo ""

# Disk Info
echo "💾 Disk Information:"
df -h / | awk 'NR==2 {printf "  Total: %s\n  Used: %s\n  Available: %s\n  Usage: %s\n", $2, $3, $4, $5}'
echo ""

# Node.js & NPM versions
echo "📝 Environment:"
echo "  Node.js: $(node --version)"
echo "  NPM: $(npm --version)"
echo "  Environment: ${NODE_ENV:-production}"
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
