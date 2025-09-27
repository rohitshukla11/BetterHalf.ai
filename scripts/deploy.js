const { ethers } = require("hardhat");
const { writeFileSync, mkdirSync } = require("fs");
const { join } = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Deploying 0G Memory Registry Contract...");
  console.log("📍 Deployer account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("❌ Deployer account has no funds! Please fund the account first.");
    console.log("🚰 Get testnet funds from: https://faucet.galileo.0g.ai/");
    process.exit(1);
  }

  // Deploy MemoryRegistry contract with enhanced 0G integration
  console.log("\n📦 Deploying MemoryRegistry contract...");
  const MemoryRegistry = await ethers.getContractFactory("MemoryRegistry");
  
  // Estimate gas for deployment
  const deploymentData = MemoryRegistry.interface.encodeDeploy([]);
  const gasEstimate = await deployer.estimateGas({ data: deploymentData });
  console.log("⛽ Estimated gas for deployment:", gasEstimate.toString());

  const memoryRegistry = await MemoryRegistry.deploy({
    gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
  });

  console.log("⏳ Waiting for deployment transaction...");
  await memoryRegistry.waitForDeployment();

  const contractAddress = await memoryRegistry.getAddress();
  const deploymentTx = memoryRegistry.deploymentTransaction();
  
  console.log("\n✅ Deployment successful!");
  console.log("📍 MemoryRegistry deployed to:", contractAddress);
  console.log("🔗 Transaction hash:", deploymentTx?.hash);
  console.log("⛽ Gas used:", deploymentTx?.gasLimit?.toString());

  // Get network info
  const network = await deployer.provider.getNetwork();
  console.log("🌐 Network:", network.name, `(Chain ID: ${network.chainId})`);

  // Test basic contract functionality
  console.log("\n🧪 Testing contract functionality...");
  
  try {
    const totalMemories = await memoryRegistry.getTotalMemoryHashes();
    console.log("📊 Initial memory count:", totalMemories.toString());

    const stats = await memoryRegistry.getMemoryStats();
    console.log("📈 Contract stats:");
    console.log("  - Total memories:", stats[0].toString());
    console.log("  - Active memories:", stats[1].toString());
    console.log("  - Verified memories:", stats[2].toString());
    console.log("  - Total tags:", stats[3].toString());
    console.log("  - Total size:", stats[4].toString());

    console.log("✅ Contract is functioning correctly!");
  } catch (error) {
    console.warn("⚠️ Contract test failed:", error);
  }

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    transactionHash: deploymentTx?.hash,
    deployer: deployer.address,
    network: {
      name: network.name,
      chainId: Number(network.chainId)
    },
    deployedAt: new Date().toISOString(),
    gasUsed: deploymentTx?.gasLimit?.toString(),
    contractVersion: "3.0.0-0g-enhanced"
  };

  // Write deployment info to files
  const deploymentsDir = join(process.cwd(), "deployments");
  try {
    // Ensure deployments directory exists
    mkdirSync(deploymentsDir, { recursive: true });
    
    writeFileSync(
      join(deploymentsDir, `MemoryRegistry-${network.chainId}.json`),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`💾 Deployment info saved to deployments/MemoryRegistry-${network.chainId}.json`);
  } catch (error) {
    console.warn("⚠️ Could not save deployment info:", error);
  }

  // Generate environment variables for the frontend
  console.log("\n🔧 Environment Variables for .env.local:");
  console.log(`NEXT_PUBLIC_MEMORY_REGISTRY_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_0G_CHAIN_ID=${network.chainId}`);
  console.log(`NEXT_PUBLIC_0G_RPC_URL=${deployer.provider._getConnection().url || 'https://rpc.galileo.0g.ai'}`);

  // Explorer links
  const getExplorerUrl = (chainId) => {
    if (chainId === 16600n) {
      return "https://explorer.galileo.0g.ai";
    }
    return null;
  };

  const explorerUrl = getExplorerUrl(network.chainId);
  if (explorerUrl) {
    console.log(`\n🔍 View on Explorer: ${explorerUrl}/address/${contractAddress}`);
    if (deploymentTx?.hash) {
      console.log(`🔗 Transaction: ${explorerUrl}/tx/${deploymentTx.hash}`);
    }
  }

  console.log("\n🎉 0G Memory Registry deployment completed successfully!");
  console.log("📚 Next steps:");
  console.log("  1. Update your .env.local with the contract address");
  console.log("  2. Fund the deployer account for future transactions");
  console.log("  3. Test the integration with the frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
