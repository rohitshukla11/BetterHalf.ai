# BetterHalf.ai

Your AI companion for life - a personalized AI assistant that understands your schedule, preferences, and lifestyle to provide tailored recommendations and support. Built with privacy-first design using **0G Storage** for decentralized embeddings, **0G Compute** for decentralized inference, and **0G Chain** for memory verification.

## 🏗️ Architecture

### Core Components

1. **Multi-Agent Memory System**: Decentralized memory sharing between AI agents using 0G Storage
2. **Decentralized Inference**: LLM inference through 0G Compute Network
3. **Blockchain Verification**: Memory hash anchoring on 0G Chain for cross-agent verification
4. **Personalized Chat Interface**: AI conversation tailored to your lifestyle and preferences
5. **Calendar Integration**: Google Calendar analysis for schedule optimization and insights
6. **Memory Storage**: 0G Storage for conversation embeddings with local caching
7. **Encryption**: Advanced encryption for data protection before storage
8. **UI**: React/Next.js web application
9. **Lifestyle Recommendations**: Personalized suggestions for meals, workouts, and daily optimization

### Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Blockchain**: 0G Chain (EVM-compatible) for memory verification
- **Storage**: 0G Storage for decentralized embeddings with local caching
- **Compute**: 0G Compute Network for decentralized LLM inference
- **AI**: OpenAI API integration with 0G Compute fallback
- **Smart Contracts**: Solidity for memory registry on 0G Chain

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key
- 0G testnet account (get testnet funds from [0G Faucet](https://faucet.galileo.0g.ai/))
- Private key for 0G Chain interactions

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd betterhalf-ai
npm install
```

2. **Set up environment variables**:
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
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://better-half-ai.vercel.app/auth/google/callback

# Application URL (for production)
NEXT_PUBLIC_APP_URL=https://better-half-ai.vercel.app

# 0G Configuration
NEXT_PUBLIC_0G_RPC_URL=https://rpc.galileo.0g.ai
NEXT_PUBLIC_0G_CHAIN_ID=galileo
NEXT_PUBLIC_0G_PRIVATE_KEY=your_0g_private_key_here
NEXT_PUBLIC_0G_STORAGE_ENDPOINT=https://storage.galileo.0g.ai
NEXT_PUBLIC_0G_COMPUTE_ENDPOINT=https://compute.galileo.0g.ai

# Development
NODE_ENV=development
```

3. **Start the development server**:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

### 0G Integration Setup

1. **Get testnet funds**:
   - Visit the [0G Faucet](https://faucet.galileo.0g.ai/)
   - Connect your wallet and request testnet tokens

2. **Configure your private key**:
   - Add your 0G private key to `.env.local`
   - The app will automatically sync data to 0G Storage and Compute

3. **Deploy Memory Registry Contract**:
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.ts --network galileo
   ```
   - Copy the deployed contract address to your `.env.local`

4. **Verify storage**:
   - Check the [0G Explorer](https://explorer.galileo.0g.ai/) to see your stored embeddings
   - All memories are encrypted before storage and anchored on 0G Chain

## 🔧 0G Architecture

### Memory Flow
```
User Query → Embedding Generation → 0G Storage → Semantic Search → LLM Inference → Response
```

### Components
- **Memory Manager**: Handles embedding generation, storage, and retrieval
- **0G Storage Service**: Manages decentralized storage of embeddings
- **0G Compute Client**: Routes inference requests through 0G Network
- **Memory Registry Contract**: Anchors memory hashes on 0G Chain for verification

## 📖 Usage Guide

### For Users

1. **Multi-Agent Conversations**: Chat with AI agents that share decentralized memory
2. **Semantic Memory Search**: Ask questions and get contextually relevant responses from shared knowledge
3. **Cross-Agent Verification**: Verify memory integrity across different agents using blockchain anchoring
4. **Decentralized Inference**: Experience AI responses powered by 0G Compute Network
5. **Memory Persistence**: All conversations are stored as embeddings in 0G Storage with encryption
6. **Calendar Integration**: Connect your Google Calendar for personalized insights

### For Developers

#### Creating a Memory with 0G Storage

```typescript
import { getMemoryManager } from '@/lib/memory-manager'

// Create memory manager for 0G Storage
const memoryManager = getMemoryManager()

// Store conversation as embedding in 0G Storage
const result = await memoryManager.storeEmbedding(
  'conversation_123',
  'User prefers dark mode in applications',
  {
    agentId: 'agent_1',
    tags: ['preferences', 'ui', 'dark-mode']
  }
)

console.log('Embedding stored:', result.storageId)
```

#### Semantic Memory Search

```typescript
// Query memories using semantic search
const queryResults = await memoryManager.queryMemory({
  query: "What does the user prefer for UI?",
  agentId: 'agent_1',
  limit: 5,
  threshold: 0.7
})

console.log('Found memories:', queryResults.length)
queryResults.forEach(result => {
  console.log('- Content:', result.metadata.content)
  console.log('- Agent:', result.metadata.agentId)
  console.log('- Similarity:', result.metadata.timestamp)
})
```

#### Decentralized Inference

```typescript
import { getInferenceClient } from '@/lib/inference-client'

// Create inference client for 0G Compute
const inferenceClient = getInferenceClient()

// Generate response using 0G Compute
const response = await inferenceClient.generateResponse({
  model: 'llama-2-7b',
  prompt: 'Explain the user preference for dark mode',
  context: 'Previous conversation context...',
  agentId: 'agent_1',
  conversationId: 'conv_123'
})

console.log('Response:', response.response)
console.log('Tokens used:', response.usage.totalTokens)
```

#### Memory Verification

```typescript
import { getMemoryManager } from '@/lib/memory-manager'

// Verify memory integrity
const memoryManager = getMemoryManager()
const isValid = await memoryManager.verifyMemoryIntegrity(memoryResult)

if (isValid) {
  console.log('✅ Memory integrity verified')
} else {
  console.log('❌ Memory integrity check failed')
}
```

## 🔐 Security Features

### Encryption

- **AES-256-GCM** encryption for memory content before 0G Storage
- **Key derivation** using PBKDF2
- **End-to-end encryption** ensuring data privacy in decentralized storage

### Access Control

- **Per-memory permissions** for fine-grained control
- **Agent-based access control** for multi-agent scenarios
- **Owner-only operations** for critical actions
- **Cross-agent verification** using blockchain anchoring

### Privacy

- **Zero-knowledge embeddings** - content encrypted before storage
- **Decentralized storage** with no central authority
- **User-controlled encryption keys**
- **Optional metadata obfuscation**

## 🌐 0G API Endpoints

### Agent Communication
- `POST /api/agent/message` - Send message to agent with 0G-backed memory
- `GET /api/agent/models` - Get available 0G Compute models

### Memory Operations
- `POST /api/agent/memory/query` - Semantic search in 0G Storage
- `POST /api/agent/memory/verify` - Verify memory integrity against blockchain
- `GET /api/agent/memory/stats` - Get memory and inference statistics

### Demo Scenarios
- `POST /api/agent/demo` - Run multi-agent memory sharing demonstrations

## 🔧 Configuration

### 0G Storage Configuration

- **Network**: Galileo Testnet (`https://rpc.galileo.0g.ai`)
- **Storage Endpoint**: `https://storage.galileo.0g.ai`
- **Compute Endpoint**: `https://compute.galileo.0g.ai`
- **Chain ID**: `galileo` (16600)

### Memory Registry Contract

- **Contract**: `MemoryRegistry.sol` on 0G Chain
- **Functions**:
  - `commitMemoryHash(bytes32 hash, string metadata)` - Anchor memory hash
  - `verifyMemoryHash(bytes32 hash)` - Cross-agent verification
  - `getMemoryStats()` - Get network statistics

### Encryption Configuration

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 (100,000 iterations)
- **Salt Length**: 32 bytes
- **IV Length**: 16 bytes
- **Embedding Model**: text-embedding-3-small

## 📊 API Examples

### Agent Message with 0G Memory

```bash
curl -X POST http://localhost:3000/api/agent/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What does the user prefer for UI settings?",
    "agentId": "assistant-1",
    "conversationId": "conv_123",
    "model": "llama-2-7b"
  }'
```

Response includes:
- AI response from 0G Compute
- Retrieved memory context count
- Memory storage confirmation

### Semantic Memory Search

```bash
curl -X POST http://localhost:3000/api/agent/memory/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the user preferences?",
    "agentId": "assistant-1",
    "tags": ["preferences", "ui"],
    "limit": 5,
    "threshold": 0.7
  }'
```

### Memory Verification

```bash
curl -X POST http://localhost:3000/api/agent/memory/verify \
  -H "Content-Type: application/json" \
  -d '{
    "memoryId": "0g_1234567890_abc123",
    "content": "User prefers dark mode in applications"
  }'
```

### Multi-Agent Demo

```bash
curl -X POST http://localhost:3000/api/agent/demo \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "memory_sharing",
    "agent1Id": "teacher-agent",
    "agent2Id": "student-agent",
    "messages": [
      "I prefer dark mode for all applications",
      "I learned about user preferences today"
    ]
  }'
```

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

### Integration Tests

```bash
npm run test:integration
```

### 0G Integration Tests

```bash
# Test 0G Storage connectivity
curl -X GET http://localhost:3000/api/agent/memory/stats

# Test 0G Compute inference
curl -X POST http://localhost:3000/api/agent/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "agentId": "test-agent", "model": "llama-2-7b"}'

# Test memory operations
curl -X POST http://localhost:3000/api/agent/demo \
  -H "Content-Type: application/json" \
  -d '{"scenario": "memory_sharing", "agent1Id": "agent-1", "agent2Id": "agent-2", "messages": ["Test message"]}'
```

### Smart Contract Tests

```bash
cd contracts
npx hardhat test
```

### Contract Deployment

```bash
# Deploy to 0G Galileo testnet
cd contracts
npx hardhat run scripts/deploy.ts --network galileo

# Deploy to mainnet
npx hardhat run scripts/deploy.ts --network mainnet
```

## 🚀 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard (including 0G configuration)
3. Deploy automatically on push to main branch
4. The app will automatically connect to 0G Storage and Compute networks

### Smart Contracts (0G Chain)

```bash
# Deploy to 0G Galileo testnet
cd contracts
npx hardhat run scripts/deploy.ts --network galileo

# Deploy to 0G mainnet
npx hardhat run scripts/deploy.ts --network mainnet
```

### Environment Variables for Production

Set these in your Vercel dashboard:
- `OPENAI_API_KEY` - OpenAI API key for embeddings
- `NEXT_PUBLIC_0G_RPC_URL` - 0G RPC endpoint
- `NEXT_PUBLIC_0G_CHAIN_ID` - 0G chain ID
- `NEXT_PUBLIC_0G_PRIVATE_KEY` - Private key for 0G interactions
- `NEXT_PUBLIC_0G_STORAGE_ENDPOINT` - 0G Storage API endpoint
- `NEXT_PUBLIC_0G_COMPUTE_ENDPOINT` - 0G Compute API endpoint

### Monitoring

- Check [0G Explorer](https://explorer.galileo.0g.ai/) for stored embeddings
- Monitor compute usage through 0G Compute dashboard
- View memory verification status on 0G Chain

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/your-repo/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@your-domain.com

## 🎯 0G Integration Summary

This implementation provides a complete **decentralized AI agent system** using 0G's infrastructure:

### ✅ **Implemented Features**

1. **0G Storage Integration**
   - Embedding generation using OpenAI text-embedding-3-small
   - Encrypted storage of conversation embeddings
   - Semantic search with similarity thresholds
   - Local caching with 0G backup

2. **0G Compute Integration**
   - Decentralized LLM inference routing
   - Fallback to OpenAI when 0G Compute unavailable
   - Token usage tracking and optimization
   - Multiple model support (Llama-2, Mistral, etc.)

3. **0G Chain Integration**
   - Memory hash anchoring for verification
   - Cross-agent memory verification
   - Immutable memory registry contract
   - Event logging for transparency

4. **Multi-Agent Memory Sharing**
   - Agents can store and retrieve shared memories
   - Semantic search across agent boundaries
   - Memory integrity verification
   - Collaborative problem-solving scenarios

### 🛠 **Technical Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Agents     │    │  Memory Manager  │    │  0G Storage     │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Conversation  │◄──►│ • Embedding Gen  │◄──►│ • Vector Store  │
│ • Memory Query  │    │ • Semantic Search│    │ • Encryption    │
│ • Verification  │    │ • Integrity Check│    │ • Persistence   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Inference      │    │   0G Compute     │    │  0G Chain       │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Request Route │◄──►│ • LLM Inference  │    │ • Hash Anchor   │
│ • Response Gen  │    │ • Model Loading  │    │ • Verification  │
│ • Fallback      │    │ • Optimization   │    │ • Registry      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 🎮 **Demo Scenarios Available**

1. **Memory Sharing**: Two agents share and recall memories
2. **Knowledge Transfer**: Teacher-student knowledge exchange
3. **Collaborative Problem Solving**: Multi-agent collaboration

### 🚀 **Quick Start Demo**

```bash
# 1. Start the application
npm run dev

# 2. Test memory sharing
curl -X POST http://localhost:3000/api/agent/demo \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "memory_sharing",
    "agent1Id": "teacher",
    "agent2Id": "student",
    "messages": [
      "I prefer dark mode for all applications",
      "I learned about user preferences today"
    ]
  }'

# 3. Verify embeddings are stored
curl -X GET http://localhost:3000/api/agent/memory/stats
```

## 🙏 Acknowledgments

- **0G Labs** for providing decentralized AI infrastructure
- **OpenAI** for AI capabilities and embeddings
- **Google Calendar API** for integration
- **CryptoJS** for encryption utilities
- **TypeScript & Next.js** for the robust development platform

---

**BetterHalf.ai** - Your decentralized AI companion with shared memory across agents, powered by 0G