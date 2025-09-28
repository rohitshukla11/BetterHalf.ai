# BetterHalf.ai - Privacy-First AI Companion

A decentralized AI companion that learns from your interactions while maintaining complete privacy through blockchain-based memory storage and 0G Labs infrastructure.

## 🌟 What it does

BetterHalf.ai is a privacy-first AI companion that provides personalized assistance while ensuring your data remains secure and decentralized. The application combines:

- **Personalized AI Chat**: Context-aware conversations that learn from your interactions
- **Decentralized Memory Storage**: Memories stored on 0G Labs blockchain for verifiability and privacy
- **Calendar Integration**: Google Calendar sync for event management
- **Memory Management**: Search, organize, and manage your AI's learned memories
- **Profile Management**: Personalized user profiles for enhanced AI responses
- **Privacy-First Design**: All data encrypted and stored locally or on-chain

### Key Features

- 🤖 **AI-Powered Conversations**: OpenAI GPT integration for intelligent responses
- 🧠 **Memory System**: Persistent memory that learns from interactions
- 🔗 **Blockchain Integration**: 0G Labs testnet for decentralized storage
- 📅 **Calendar Sync**: Google Calendar integration for event management
- 🔐 **End-to-End Encryption**: All sensitive data encrypted locally
- 🎯 **Personalized Insights**: AI-generated insights based on your profile
- 📱 **Responsive Design**: Modern UI with Tailwind CSS

## 🚀 How to set it up

### Prerequisites

- Node.js 18+ and npm
- Git
- MetaMask or compatible Web3 wallet
- Google Cloud Console account (for Calendar integration)
- OpenAI API key

### 1. Clone the Repository

```bash
git clone <repository-url>
cd EthGlobalDelhi
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure your variables:

```bash
cp env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Encryption Configuration
NEXT_PUBLIC_DEFAULT_ENCRYPTION_PASSWORD=your_secure_encryption_password_here

# AI Service Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Google Calendar Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 0G Configuration
NEXT_PUBLIC_0G_RPC_URL=https://evmrpc-testnet.0g.ai/
NEXT_PUBLIC_0G_CHAIN_ID=galileo
NEXT_PUBLIC_0G_PRIVATE_KEY=your_0g_private_key_here
NEXT_PUBLIC_0G_STORAGE_ENDPOINT=https://indexer-storage-testnet-turbo.0g.ai
NEXT_PUBLIC_0G_COMPUTE_ENDPOINT=https://compute.galileo.0g.ai
NEXT_PUBLIC_0G_EXPLORER_URL=https://chainscan-galileo.0g.ai

# Walrus Configuration (Fallback Storage)
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_EPOCHS=5

# Development
NODE_ENV=development
```

### 4. Smart Contract Deployment

Deploy the MemoryRegistry contract to 0G testnet:

```bash
# Compile contracts
npx hardhat compile

# Deploy to 0G testnet
npx hardhat run scripts/deploy.ts --network 0g-testnet
```

Update the contract address in your environment variables after deployment.

### 5. Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - `https://your-domain.com/auth/google/callback` (production)

## 🏃‍♂️ How to run it

### Development Mode

   ```bash
# Start the development server
npm run dev

# Open your browser to http://localhost:3000
```

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npx hardhat compile` - Compile smart contracts
- `npx hardhat test` - Run contract tests

## 📖 Examples

### Basic Usage

1. **Start a Conversation**: Open the app and begin chatting with your AI companion
2. **Enable Memory Storage**: Toggle the memory switch to let the AI learn from conversations
3. **View Memories**: Check the memory panel to see what the AI has learned
4. **Calendar Integration**: Connect your Google Calendar for event management

### API Examples

#### Create a Memory

```bash
curl -X POST http://localhost:3000/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "content": "User prefers morning workouts",
    "type": "preference",
    "category": "lifestyle",
    "tags": ["fitness", "schedule"],
    "encrypted": true
  }'
```

#### Search Memories

```bash
curl -X GET "http://localhost:3000/api/memories?query=workout&type=preference&limit=10"
```

#### Get Personalized Response

```bash
curl -X POST http://localhost:3000/api/personalized-agent \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "What should I do this morning?",
    "previousMessages": []
  }'
```

### Smart Contract Interactions

#### Commit Memory Hash

```solidity
// Using the deployed MemoryRegistry contract
memoryRegistry.commitMemoryHash(
  keccak256(abi.encodePacked(memoryContent)),
  "User preference: morning workouts",
  "zg_storage_id_123",
  "text",
  1024,
  ["fitness", "schedule"]
);
```

#### Verify Memory Hash

```solidity
memoryRegistry.verifyMemoryHash(memoryHash);
```

### Screenshots

The application features:

- **Chat Interface**: Clean, modern chat UI with typing indicators
- **Memory Panel**: Organized view of AI memories with search and filtering
- **Calendar View**: Integrated Google Calendar for event management
- **Profile Management**: User profile setup for personalized experiences
- **Insights Panel**: AI-generated insights based on user data

## 🏗️ Architecture

### Frontend
- **Next.js 14** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Hook Form** for form management
- **Wagmi** for Web3 integration

### Backend
- **Next.js API Routes** for serverless functions
- **OpenAI API** for AI responses
- **Google Calendar API** for calendar integration
- **0G Labs SDK** for blockchain storage

### Smart Contracts
- **MemoryRegistry.sol**: Solidity contract for memory hash storage
- **OpenZeppelin** contracts for security and access control
- **0G Labs** integration for decentralized storage

### Storage
- **Local Storage**: Encrypted data persistence
- **0G Labs**: Decentralized memory hash storage
- **Walrus**: Fallback storage solution

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for AI responses | Yes |
| `NEXT_PUBLIC_0G_PRIVATE_KEY` | Private key for 0G transactions | Yes |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `NEXT_PUBLIC_GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `NEXT_PUBLIC_DEFAULT_ENCRYPTION_PASSWORD` | Encryption password for local data | Yes |

### Network Configuration

The application is configured for 0G Labs testnet:
- **RPC URL**: `https://evmrpc-testnet.0g.ai/`
- **Chain ID**: `16602` (Galileo testnet)
- **Explorer**: `https://chainscan-galileo.0g.ai`
- **MemoryRegistry Contract**: [`0xe96fb286f36372effcf846f8a0d25773d63a3618`](https://chainscan-galileo.0g.ai/address/0xe96fb286f36372effcf846f8a0d25773d63a3618?tab=transaction)

### Deployed Smart Contract

**MemoryRegistry Contract Details:**
- **Contract Address**: `0xe96fb286f36372effcf846f8a0d25773d63a3618`
- **Network**: 0G Labs Galileo Testnet
- **Explorer**: [View on 0G Explorer](https://chainscan-galileo.0g.ai/address/0xe96fb286f36372effcf846f8a0d25773d63a3618?tab=transaction)
- **Status**: Deployed and Active
- **Functions**: Memory hash storage, verification, and retrieval
- **Events**: MemoryHashCommitted, MemoryHashVerified, MemoryHashRevoked

## 🚀 Deployment

### Fluence VM Deployment

BetterHalf.ai is deployed on Fluence Virtual Servers for decentralized hosting.

#### Public Endpoint
- **Application URL**: `https://81.15.150.143:3000`
- **HTTP Access**: `http://81.15.150.143`
- **VM ID**: `01998cdd-f445-7f21-bc84-8eedc97f7074`
- **Status**: Live and accessible

#### Quick Deployment (Automated)

1. **Using the deployment script**:
```bash
# SSH into your Fluence VM
ssh root@your-fluence-vm-ip

# Download and run the deployment script
curl -O https://raw.githubusercontent.com/your-username/betterhalf-ai/main/scripts/deploy-fluence.sh
chmod +x deploy-fluence.sh
sudo ./deploy-fluence.sh
```

2. **Using Terraform**:
```bash
# Navigate to terraform directory
cd terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Deploy to Fluence VM
terraform apply
```

#### Manual Deployment Steps

1. **Provision Fluence VM**:
   - CPU: 2 cores minimum
   - RAM: 4GB minimum
   - Storage: 20GB minimum
   - Open ports: 80, 443, 3000

2. **Install dependencies**:
```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 and Git
npm install -g pm2
apt-get install -y git nginx
```

3. **Deploy application**:
```bash
# Clone repository
git clone https://github.com/your-username/betterhalf-ai.git /opt/betterhalf-ai
cd /opt/betterhalf-ai

# Install dependencies and build
npm install
npm run build

# Configure environment
cp env.example .env.local
# Edit .env.local with your configuration

# Start with PM2
pm2 start npm --name "betterhalf-ai" -- start
pm2 save
pm2 startup
```

4. **Configure Nginx** (optional):
```bash
# Use the provided Nginx configuration
cp nginx.conf /etc/nginx/sites-available/betterhalf-ai
ln -s /etc/nginx/sites-available/betterhalf-ai /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

#### Deployment Files

- **Terraform Configuration**: `terraform/fluence-vm.tf`
- **Deployment Script**: `scripts/deploy-fluence.sh`
- **Nginx Configuration**: `nginx.conf`

### Other Deployment Options

#### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

#### Manual Deployment

```bash
# Build the application
npm run build

# Deploy to your preferred platform
# (Vercel, Netlify, AWS, etc.)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌐 Fluence VM Deployment

### Deployment Requirements

**Fluence Virtual Server Specifications:**
- **Minimum CPU**: 2 cores
- **Minimum RAM**: 4GB
- **Minimum Storage**: 20GB
- **Required Ports**: 80 (HTTP), 443 (HTTPS), 3000 (Application)
- **Operating System**: Ubuntu 20.04+ or Debian 11+

### Access Information

**Live Deployment Details:**
- **Primary URL**: `https://81.15.150.143:3000`
- **HTTP Fallback**: `http://81.15.150.143`
- **VM ID**: `01998cdd-f445-7f21-bc84-8eedc97f7074`
- **VM IP**: `81.15.150.143`
- **VM Management**: Access via Fluence dashboard

### Deployment Verification

To verify your deployment:

1. **Check application status**:
```bash
pm2 status
curl -I https://81.15.150.143:3000
```

2. **View application logs**:
```bash
pm2 logs betterhalf-ai
```

3. **Test API endpoints**:
```bash
curl https://81.15.150.143:3000/api/health
```

4. **Test contract interaction**:
```bash
# Check contract on 0G Explorer
curl "https://chainscan-galileo.0g.ai/api?module=account&action=balance&address=0xe96fb286f36372effcf846f8a0d25773d63a3618"
```

5. **Test live application**:
```bash
# Test the live BetterHalf.ai application
curl -X POST https://81.15.150.143:3000/api/personalized-agent \
  -H "Content-Type: application/json" \
  -d '{"userInput": "Hello, can you help me test the application?", "previousMessages": []}'
```

### Environment Configuration

After deployment, update your environment variables:

```bash
# Edit the environment file
nano /opt/betterhalf-ai/.env.local

# Restart the application
pm2 restart betterhalf-ai
```

### Troubleshooting

Common issues and solutions:

1. **Port not accessible**: Ensure ports 80, 443, and 3000 are open in Fluence VM firewall
2. **Application not starting**: Check logs with `pm2 logs betterhalf-ai`
3. **Environment variables**: Verify all required environment variables are set
4. **SSL issues**: Configure SSL certificates for HTTPS access

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation in `/app/api`

## 🔮 Roadmap

- [ ] Multi-agent support
- [ ] Advanced memory search with vector embeddings
- [ ] Mobile app development
- [ ] Integration with more calendar providers
- [ ] Advanced privacy controls
- [ ] Memory sharing between users
- [ ] Voice interaction support

---

Built with ❤️ for the EthGlobal Delhi hackathon using 0G Labs infrastructure.