/*
 Standalone interaction script for deployed MemoryRegistry (no hardhat dependency)
 Usage:
   node scripts/standalone-interact.js
*/

const { ethers } = require("ethers");
const { readFileSync, existsSync } = require("fs");
const { join } = require("path");
require('dotenv').config({ path: '.env.local' });

async function main() {
  // Setup provider and signer
  const rpcUrl = process.env.NEXT_PUBLIC_0G_RPC_URL || "https://evmrpc-testnet.0g.ai";
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = process.env.NEXT_PUBLIC_MEMORY_REGISTRY_ADDRESS;
  
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment");
  }
  if (!contractAddress) {
    throw new Error("NEXT_PUBLIC_MEMORY_REGISTRY_ADDRESS not found in environment");
  }

  console.log("🔗 Standalone Contract Interaction");
  console.log("🌐 RPC URL:", rpcUrl);
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  
  console.log("📍 Signer:", await signer.getAddress());
  const network = await provider.getNetwork();
  console.log("🌐 Network Chain ID:", Number(network.chainId));
  console.log("📍 Contract:", contractAddress);

  // Load contract ABI
  const abiPath = join(process.cwd(), "artifacts", "contracts", "MemoryRegistry.sol", "MemoryRegistry.json");
  if (!existsSync(abiPath)) {
    throw new Error(`ABI file not found: ${abiPath}`);
  }
  
  const contractAbi = JSON.parse(readFileSync(abiPath, "utf8"));
  const contract = new ethers.Contract(contractAddress, contractAbi, signer);

  console.log("\n⏳ Testing contract connection...");
  try {
    // Test basic connection
    const owner = await contract.owner();
    console.log("✅ Contract connected successfully");
    console.log("👤 Owner:", owner);
  } catch (error) {
    console.error("❌ Failed to connect to contract:", error.message);
    throw error;
  }

  // 1) Stats
  console.log("\n📊 Getting Stats:");
  try {
    const stats = await contract.getMemoryStats();
    console.log("   totalMemories:", stats.totalMemories?.toString?.() || stats[0].toString());
    console.log("   activeMemories:", stats.activeMemories?.toString?.() || stats[1].toString());
    console.log("   verifiedMemories:", stats.verifiedMemories?.toString?.() || stats[2].toString());
    console.log("   totalTags:", stats.totalTags?.toString?.() || stats[3].toString());
    console.log("   totalSize:", stats.totalSize?.toString?.() || stats[4].toString());
  } catch (error) {
    console.error("❌ Failed to get stats:", error.message);
  }

  // 2) Commit one memory hash
  console.log("\n🧪 Committing test memory:");
  try {
    const testContent = `Standalone test @ ${Date.now()}`;
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes(testContent));
    const metadata = JSON.stringify({ 
      title: "Standalone Test", 
      createdAt: new Date().toISOString(),
      source: "standalone-script"
    });
    const zgStorageId = `standalone-${Date.now()}`;
    
    console.log("   Content hash:", contentHash);
    console.log("   ZG Storage ID:", zgStorageId);
    
    const tx = await contract.commitMemoryHash(
      contentHash, 
      metadata, 
      zgStorageId, 
      "text", 
      testContent.length, 
      ["standalone", "test", "demo"]
    );
    
    console.log("   Transaction hash:", tx.hash);
    console.log("   Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("   ✅ Memory committed successfully!");
    console.log("   Gas used:", receipt.gasUsed.toString());
  } catch (error) {
    console.error("❌ Failed to commit memory:", error.message);
  }

  // 3) Read back the committed memory
  console.log("\n📥 Reading back committed memory:");
  try {
    const testContent = `Standalone test @ ${Date.now()}`;
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes(testContent));
    
    // Wait a moment for the transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const memory = await contract.getMemoryHash(contentHash);
    console.log("   agent:", memory.agent);
    console.log("   zgStorageId:", memory.zgStorageId);
    console.log("   contentType:", memory.contentType);
    console.log("   size:", memory.size.toString());
    console.log("   isActive:", memory.isActive);
    console.log("   isVerified:", memory.isVerified);
  } catch (error) {
    console.error("❌ Failed to read memory:", error.message);
  }

  // 4) Query by tag
  console.log("\n🔍 Querying memories by tag 'test':");
  try {
    const memoriesWithTag = await contract.getMemoryHashesByTag("test");
    console.log("   Found", memoriesWithTag.length, "memories with tag 'test'");
    
    if (memoriesWithTag.length > 0) {
      console.log("   First memory hash:", memoriesWithTag[0]);
    }
  } catch (error) {
    console.error("❌ Failed to query by tag:", error.message);
  }

  // 5) Get all tags
  console.log("\n🏷️ Getting all available tags:");
  try {
    const allTags = await contract.getAllTags();
    console.log("   Available tags:", allTags);
  } catch (error) {
    console.error("❌ Failed to get tags:", error.message);
  }

  // 6) Verify a memory
  console.log("\n✅ Verifying a memory:");
  try {
    const testContent = `Standalone test @ ${Date.now()}`;
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes(testContent));
    
    // Check if already verified
    const alreadyVerified = await contract.isMemoryHashVerified(contentHash);
    console.log("   Already verified:", alreadyVerified);
    
    if (!alreadyVerified) {
      console.log("   Verifying memory...");
      const verifyTx = await contract.verifyMemoryHash(contentHash);
      await verifyTx.wait();
      console.log("   ✅ Memory verified!");
    }
    
    const isVerified = await contract.isMemoryHashVerified(contentHash);
    console.log("   Final verification status:", isVerified);
  } catch (error) {
    console.error("❌ Failed to verify memory:", error.message);
  }

  // 7) Final stats
  console.log("\n📊 Final Stats:");
  try {
    const finalStats = await contract.getMemoryStats();
    console.log("   totalMemories:", finalStats.totalMemories?.toString?.() || finalStats[0].toString());
    console.log("   activeMemories:", finalStats.activeMemories?.toString?.() || finalStats[1].toString());
    console.log("   verifiedMemories:", finalStats.verifiedMemories?.toString?.() || finalStats[2].toString());
    console.log("   totalTags:", finalStats.totalTags?.toString?.() || finalStats[3].toString());
    console.log("   totalSize:", finalStats.totalSize?.toString?.() || finalStats[4].toString());
  } catch (error) {
    console.error("❌ Failed to get final stats:", error.message);
  }

  console.log("\n🎉 Contract interaction test completed!");
}

main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});
