#!/bin/bash

# Tạo thư mục log cần thiết
mkdir -p /var/log/supervisor /var/log/nginx /var/log/nodejs

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Banner ASCII Art
clear
echo -e "${CYAN}"
cat << "EOF"
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   ██████╗ ██╗      █████╗ ████████╗███████╗ ██████╗      ║
    ║   ██╔══██╗██║     ██╔══██╗╚══██╔══╝██╔════╝██╔═══██╗    ║
    ║   ██████╔╝██║     ███████║   ██║   █████╗  ██║   ██║    ║
    ║   ██╔═══╝ ██║     ██╔══██║   ██║   ██╔══╝  ██║   ██║    ║
    ║   ██║     ███████╗██║  ██║   ██║   ██║     ╚██████╔╝    ║
    ║   ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝      ╚═════╝     ║
    ║                                                           ║
    ║        █████╗ ██████╗ ███████╗                           ║
    ║       ██╔══██╗██╔══██╗██╔════╝                           ║
    ║       ███████║██║  ██║███████╗                           ║
    ║       ██╔══██║██║  ██║╚════██║                           ║
    ║       ██║  ██║██████╔╝███████║                           ║
    ║       ╚═╝  ╚═╝╚═════╝ ╚══════╝                           ║
    ║                                                           ║
    ║              Platform Advertising Services                ║
    ╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Get system info
HOSTNAME=$(hostname)
OS_NAME=$(cat /etc/os-release | grep "PRETTY_NAME" | cut -d'"' -f2)
KERNEL=$(uname -r)
UPTIME=$(uptime -p | sed 's/up //')
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)

# Get CPU info from cgroups
if [ -f /sys/fs/cgroup/cpu/cpu.cfs_quota_us ]; then
  CPU_QUOTA=$(cat /sys/fs/cgroup/cpu/cpu.cfs_quota_us)
  CPU_PERIOD=$(cat /sys/fs/cgroup/cpu/cpu.cfs_period_us)
  if [ "$CPU_QUOTA" != "-1" ]; then
    CPU_ALLOCATED=$(echo "scale=2; $CPU_QUOTA / $CPU_PERIOD" | bc)
  else
    CPU_ALLOCATED=$(nproc)
  fi
elif [ -f /sys/fs/cgroup/cpu.max ]; then
  CPU_INFO=$(cat /sys/fs/cgroup/cpu.max)
  if [ "$CPU_INFO" != "max 100000" ]; then
    CPU_QUOTA=$(echo $CPU_INFO | awk '{print $1}')
    CPU_PERIOD=$(echo $CPU_INFO | awk '{print $2}')
    CPU_ALLOCATED=$(echo "scale=2; $CPU_QUOTA / $CPU_PERIOD" | bc)
  else
    CPU_ALLOCATED=$(nproc)
  fi
else
  CPU_ALLOCATED=$(nproc)
fi

# Get Memory info from cgroups
if [ -f /sys/fs/cgroup/memory/memory.limit_in_bytes ]; then
  MEM_LIMIT=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes)
  MEM_USAGE=$(cat /sys/fs/cgroup/memory/memory.usage_in_bytes)
  if [ "$MEM_LIMIT" != "9223372036854771712" ]; then
    MEM_LIMIT_MB=$(echo "scale=0; $MEM_LIMIT / 1024 / 1024" | bc)
    MEM_USAGE_MB=$(echo "scale=0; $MEM_USAGE / 1024 / 1024" | bc)
    MEM_INFO="${MEM_USAGE_MB}MiB / ${MEM_LIMIT_MB}MiB"
  else
    MEM_INFO=$(free -h | awk '/^Mem:/ {printf "%s / %s", $3, $2}')
  fi
elif [ -f /sys/fs/cgroup/memory.max ]; then
  MEM_LIMIT=$(cat /sys/fs/cgroup/memory.max)
  MEM_USAGE=$(cat /sys/fs/cgroup/memory.current)
  if [ "$MEM_LIMIT" != "max" ]; then
    MEM_LIMIT_MB=$(echo "scale=0; $MEM_LIMIT / 1024 / 1024" | bc)
    MEM_USAGE_MB=$(echo "scale=0; $MEM_USAGE / 1024 / 1024" | bc)
    MEM_INFO="${MEM_USAGE_MB}MiB / ${MEM_LIMIT_MB}MiB"
  else
    MEM_INFO=$(free -h | awk '/^Mem:/ {printf "%s / %s", $3, $2}')
  fi
else
  MEM_INFO=$(free -h | awk '/^Mem:/ {printf "%s / %s", $3, $2}')
fi

# Get Disk info
DISK_INFO=$(df -h / | awk 'NR==2 {printf "%s / %s (%s)", $3, $2, $5}')

# Get App version
if [ -f /app/package.json ]; then
  APP_VERSION=$(grep '"version"' /app/package.json | head -1 | awk -F'"' '{print $4}')
else
  APP_VERSION="unknown"
fi

# Display info in neofetch style
echo -e "${BOLD}${YELLOW}platform-ads@${HOSTNAME}${NC}"
echo -e "${BOLD}${YELLOW}$(printf '%.0s-' {1..50})${NC}"
echo -e "${BOLD}${BLUE}OS:${NC}           ${OS_NAME}"
echo -e "${BOLD}${BLUE}Kernel:${NC}       ${KERNEL}"
echo -e "${BOLD}${BLUE}Uptime:${NC}       ${UPTIME}"
echo -e "${BOLD}${BLUE}Shell:${NC}        bash $(bash --version | head -1 | awk '{print $4}')"
echo -e "${BOLD}${MAGENTA}Node.js:${NC}      ${NODE_VERSION}"
echo -e "${BOLD}${MAGENTA}NPM:${NC}          ${NPM_VERSION}"
echo -e "${BOLD}${GREEN}CPU:${NC}          ${CPU_ALLOCATED} vCPU"
echo -e "${BOLD}${GREEN}Memory:${NC}       ${MEM_INFO}"
echo -e "${BOLD}${GREEN}Disk (/):${NC}     ${DISK_INFO}"
echo -e "${BOLD}${CYAN}App Version:${NC}  ${APP_VERSION}"
echo -e "${BOLD}${CYAN}Environment:${NC}  ${NODE_ENV:-production}"
echo ""
echo -e "${BOLD}${GREEN}✅ Starting services...${NC}"
echo ""

# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
