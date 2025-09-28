# Fluence VM Terraform Configuration for BetterHalf.ai
# This script deploys BetterHalf.ai on a Fluence Virtual Server

terraform {
  required_providers {
    fluence = {
      source = "fluencelabs/fluence"
      version = "~> 0.1"
    }
  }
}

# Configure the Fluence Provider
provider "fluence" {
  # Fluence provider configuration
  # Add your Fluence credentials here
}

# Fluence VM Resource
resource "fluence_vm" "betterhalf_ai" {
  name = "betterhalf-ai-vm"
  
  # VM Configuration
  cpu_cores = 2
  memory_gb = 4
  storage_gb = 20
  
  # Network Configuration
  ports = [
    {
      port = 3000
      protocol = "tcp"
      description = "BetterHalf.ai Web Application"
    },
    {
      port = 80
      protocol = "tcp"
      description = "HTTP Access"
    },
    {
      port = 443
      protocol = "tcp"
      description = "HTTPS Access"
    }
  ]
  
  # Environment Variables
  environment_variables = {
    NODE_ENV = "production"
    NEXT_PUBLIC_APP_URL = "https://${fluence_vm.betterhalf_ai.public_ip}:3000"
    PORT = "3000"
  }
  
  # Startup Script
  startup_script = <<-EOF
    #!/bin/bash
    
    # Update system
    apt-get update -y
    apt-get upgrade -y
    
    # Install Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
    
    # Install PM2 for process management
    npm install -g pm2
    
    # Install Git
    apt-get install -y git
    
    # Clone the repository
    git clone https://github.com/your-username/betterhalf-ai.git /opt/betterhalf-ai
    cd /opt/betterhalf-ai
    
    # Install dependencies
    npm install
    
    # Build the application
    npm run build
    
    # Create environment file
    cat > .env.local << 'ENVEOF'
    NODE_ENV=production
    NEXT_PUBLIC_APP_URL=https://${fluence_vm.betterhalf_ai.public_ip}:3000
    PORT=3000
    # Add your environment variables here
    ENVEOF
    
    # Start the application with PM2
    pm2 start npm --name "betterhalf-ai" -- start
    pm2 save
    pm2 startup
    
    # Configure Nginx (optional)
    apt-get install -y nginx
    cat > /etc/nginx/sites-available/betterhalf-ai << 'NGINXEOF'
    server {
        listen 80;
        server_name ${fluence_vm.betterhalf_ai.public_ip};
        
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
    
    ln -s /etc/nginx/sites-available/betterhalf-ai /etc/nginx/sites-enabled/
    nginx -t
    systemctl restart nginx
    
    echo "BetterHalf.ai deployment completed!"
    echo "Access your application at: https://${fluence_vm.betterhalf_ai.public_ip}:3000"
  EOF
  
  # Tags for organization
  tags = {
    Project = "BetterHalf.ai"
    Environment = "Production"
    ManagedBy = "Terraform"
  }
}

# Output the VM details
output "vm_details" {
  value = {
    vm_id = fluence_vm.betterhalf_ai.id
    public_ip = fluence_vm.betterhalf_ai.public_ip
    private_ip = fluence_vm.betterhalf_ai.private_ip
    access_url = "https://${fluence_vm.betterhalf_ai.public_ip}:3000"
    status = fluence_vm.betterhalf_ai.status
  }
  description = "Fluence VM deployment details"
}

# Output connection information
output "connection_info" {
  value = {
    ssh_command = "ssh root@${fluence_vm.betterhalf_ai.public_ip}"
    web_url = "https://${fluence_vm.betterhalf_ai.public_ip}:3000"
    nginx_url = "http://${fluence_vm.betterhalf_ai.public_ip}"
  }
  description = "Connection information for the deployed VM"
}
