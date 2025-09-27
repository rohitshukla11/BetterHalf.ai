import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy MemoryRegistry contract
  const MemoryRegistry = await ethers.getContractFactory("MemoryRegistry");
  const memoryRegistry = await MemoryRegistry.deploy();

  await memoryRegistry.waitForDeployment();

  const contractAddress = await memoryRegistry.getAddress();
  console.log("MemoryRegistry deployed to:", contractAddress);

  // Verify the contract on Etherscan (if on mainnet)
  if (process.env.NODE_ENV === "production") {
    console.log("Verifying contract...");
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
