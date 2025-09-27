/*
 Simple interaction script for deployed MemoryRegistry
 Usage:
   npx hardhat run scripts/simple-interact.js --network 0g-testnet
*/

const { ethers } = require("hardhat");
const { readFileSync, existsSync } = require("fs");
const { join } = require("path");

async function main() {
  const [signer] = await ethers.getSigners();
  const network = await signer.provider.getNetwork();

  console.log("🔗 Simple Interaction");
  console.log("📍 Signer:", await signer.getAddress());
  console.log("🌐 Network:", network.name, `(Chain ID: ${Number(network.chainId)})`);

  const deploymentFile = join(process.cwd(), "deployments", `MemoryRegistry-${Number(network.chainId)}.json`);
  if (!existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }

  const info = JSON.parse(readFileSync(deploymentFile, "utf8"));
  const address = info.contractAddress;
  console.log("📍 Contract:", address);

  const factory = await ethers.getContractFactory("MemoryRegistry");
  const contract = factory.attach(address);

  // 1) Stats
  console.log("\n📊 Stats:");
  const stats = await contract.getMemoryStats();
  console.log("   totalMemories:", stats.totalMemories?.toString?.() || stats[0].toString());
  console.log("   activeMemories:", stats.activeMemories?.toString?.() || stats[1].toString());
  console.log("   verifiedMemories:", stats.verifiedMemories?.toString?.() || stats[2].toString());
  console.log("   totalTags:", stats.totalTags?.toString?.() || stats[3].toString());
  console.log("   totalSize:", stats.totalSize?.toString?.() || stats[4].toString());

  // 2) Commit one memory hash
  console.log("\n🧪 Commit:");
  const testContent = `Hello @ ${Date.now()}`;
  const contentHash = ethers.keccak256(ethers.toUtf8Bytes(testContent));
  const metadata = JSON.stringify({ title: "Simple Test", createdAt: new Date().toISOString() });
  const zgStorageId = `demo-${Date.now()}`;
  const tx = await contract.commitMemoryHash(contentHash, metadata, zgStorageId, "text", testContent.length, ["simple", "demo"]);
  const rc = await tx.wait();
  console.log("   tx:", rc?.hash || tx.hash);

  // 3) Read back
  console.log("\n📥 Read back:");
  const mem = await contract.getMemoryHash(contentHash);
  console.log("   agent:", mem.agent);
  console.log("   zgStorageId:", mem.zgStorageId);
  console.log("   contentType:", mem.contentType);
  console.log("   isActive:", mem.isActive);

  // 4) Tag query
  const withDemo = await contract.getMemoryHashesByTag("demo");
  console.log("\n🔍 Tag 'demo' count:", withDemo.length);

  // 5) Verify
  console.log("\n✅ Verify:");
  const vtx = await contract.verifyMemoryHash(contentHash);
  await vtx.wait();
  const verified = await contract.isMemoryHashVerified(contentHash);
  console.log("   isVerified:", verified);

  // 6) Owner
  const owner = await contract.owner();
  console.log("\n👤 Owner:", owner);

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


