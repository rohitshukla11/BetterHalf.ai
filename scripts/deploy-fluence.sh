#!/bin/bash

# BetterHalf.ai Fluence VM Deployment Script
# This script automates the deployment process on Fluence Virtual Servers

set -e

echo "🚀 Starting BetterHalf.ai deployment on Fluence VM..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VM_NAME="betterhalf-ai-vm"
REPO_URL="https://github.com/your-username/betterhalf-ai.git"
APP_DIR="/opt/betterhalf-ai"
SERVICE_NAME="betterhalf-ai"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Update system
print_status "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install Node.js 18
print_status "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
print_success "Node.js installed: $NODE_VERSION"

# Install PM2 for process management
print_status "Installing PM2..."
npm install -g pm2

# Install Git
print_status "Installing Git..."
apt-get install -y git

# Install Nginx
print_status "Installing Nginx..."
apt-get install -y nginx

# Clone the repository
print_status "Cloning repository..."
if [ -d "$APP_DIR" ]; then
    print_warning "Directory $APP_DIR already exists. Updating..."
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

# Build the application
print_status "Building application..."
npm run build

# Create environment file
print_status "Creating environment configuration..."
cat > .env.local << 'ENVEOF'
NODE_ENV=production
PORT=3000
# Add your environment variables here
# NEXT_PUBLIC_APP_URL=https://your-fluence-vm-ip:3000
# OPENAI_API_KEY=your_openai_api_key
# NEXT_PUBLIC_0G_PRIVATE_KEY=your_0g_private_key
# ... other environment variables
ENVEOF

# Configure Nginx
print_status "Configuring Nginx..."
cat > /etc/nginx/sites-available/betterhalf-ai << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

# Enable the site
ln -sf /etc/nginx/sites-available/betterhalf-ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Start Nginx
systemctl restart nginx
systemctl enable nginx

# Start the application with PM2
print_status "Starting application with PM2..."
pm2 start npm --name "$SERVICE_NAME" -- start
pm2 save
pm2 startup

# Get VM IP address
VM_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "unknown")

print_success "Deployment completed successfully!"
echo ""
echo "🌐 Access your application:"
echo "   HTTP:  http://$VM_IP"
echo "   HTTPS: https://$VM_IP:3000"
echo ""
echo "🔧 Management commands:"
echo "   View logs: pm2 logs $SERVICE_NAME"
echo "   Restart:  pm2 restart $SERVICE_NAME"
echo "   Stop:     pm2 stop $SERVICE_NAME"
echo "   Status:   pm2 status"
echo ""
echo "📝 Next steps:"
echo "   1. Update .env.local with your environment variables"
echo "   2. Restart the application: pm2 restart $SERVICE_NAME"
echo "   3. Configure your domain (optional)"
echo ""

print_success "BetterHalf.ai is now running on Fluence VM!"
