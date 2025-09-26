// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MemoryRegistry
 * @dev Contract for anchoring memory hashes on 0G Chain for verifiability
 * @notice This contract allows agents to commit memory hashes and verify them across agents
 */
contract MemoryRegistry is Ownable, ReentrancyGuard {
    struct MemoryHash {
        bytes32 hash;
        string metadata;
        address agent;
        uint256 timestamp;
        bool isActive;
    }

    // State variables
    mapping(bytes32 => MemoryHash) public memoryHashes;
    mapping(address => bytes32[]) public agentMemories;
    mapping(bytes32 => bool) public verifiedHashes;

    bytes32[] public allMemoryHashes;

    // Events
    event MemoryHashCommitted(
        bytes32 indexed hash,
        address indexed agent,
        string metadata,
        uint256 timestamp
    );

    event MemoryHashVerified(
        bytes32 indexed hash,
        address indexed verifier,
        uint256 timestamp
    );

    event MemoryHashRevoked(
        bytes32 indexed hash,
        address indexed agent,
        uint256 timestamp
    );

    // Modifiers
    modifier onlyActiveHash(bytes32 hash) {
        require(memoryHashes[hash].isActive, "Memory hash is not active");
        _;
    }

    modifier onlyHashOwner(bytes32 hash) {
        require(
            memoryHashes[hash].agent == msg.sender,
            "Not the owner of this memory hash"
        );
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Commit a memory hash to the registry
     * @param hash The hash of the memory content
     * @param metadata Additional metadata about the memory
     */
    function commitMemoryHash(
        bytes32 hash,
        string calldata metadata
    ) external nonReentrant returns (bytes32) {
        require(hash != bytes32(0), "Invalid hash");
        require(memoryHashes[hash].hash == bytes32(0), "Hash already exists");

        MemoryHash memory newMemory = MemoryHash({
            hash: hash,
            metadata: metadata,
            agent: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });

        memoryHashes[hash] = newMemory;
        agentMemories[msg.sender].push(hash);
        allMemoryHashes.push(hash);

        emit MemoryHashCommitted(hash, msg.sender, metadata, block.timestamp);

        return hash;
    }

    /**
     * @dev Verify a memory hash (cross-agent verification)
     * @param hash The hash to verify
     */
    function verifyMemoryHash(
        bytes32 hash
    ) external onlyActiveHash(hash) nonReentrant {
        require(memoryHashes[hash].hash != bytes32(0), "Hash does not exist");

        verifiedHashes[hash] = true;

        emit MemoryHashVerified(hash, msg.sender, block.timestamp);
    }

    /**
     * @dev Revoke a memory hash (only by the owner)
     * @param hash The hash to revoke
     */
    function revokeMemoryHash(
        bytes32 hash
    ) external onlyActiveHash(hash) onlyHashOwner(hash) nonReentrant {
        memoryHashes[hash].isActive = false;

        emit MemoryHashRevoked(hash, msg.sender, block.timestamp);
    }

    /**
     * @dev Get memory hash details
     * @param hash The hash to query
     */
    function getMemoryHash(
        bytes32 hash
    ) external view returns (MemoryHash memory) {
        return memoryHashes[hash];
    }

    /**
     * @dev Get all memory hashes for an agent
     * @param agent The agent address
     */
    function getAgentMemories(
        address agent
    ) external view returns (bytes32[] memory) {
        return agentMemories[agent];
    }

    /**
     * @dev Check if a hash is verified
     * @param hash The hash to check
     */
    function isMemoryHashVerified(bytes32 hash) external view returns (bool) {
        return verifiedHashes[hash];
    }

    /**
     * @dev Get total number of memory hashes
     */
    function getTotalMemoryHashes() external view returns (uint256) {
        return allMemoryHashes.length;
    }

    /**
     * @dev Get memory hash by index (for enumeration)
     * @param index The index in the array
     */
    function getMemoryHashByIndex(
        uint256 index
    ) external view returns (bytes32) {
        require(index < allMemoryHashes.length, "Index out of bounds");
        return allMemoryHashes[index];
    }

    /**
     * @dev Batch commit multiple memory hashes
     * @param hashes Array of hashes to commit
     * @param metadatas Array of metadata corresponding to hashes
     */
    function batchCommitMemoryHashes(
        bytes32[] calldata hashes,
        string[] calldata metadatas
    ) external {
        require(hashes.length == metadatas.length, "Arrays length mismatch");
        require(hashes.length > 0, "No hashes to commit");
        require(hashes.length <= 50, "Batch too large"); // Limit batch size

        for (uint256 i = 0; i < hashes.length; i++) {
            if (memoryHashes[hashes[i]].hash == bytes32(0)) {
                MemoryHash memory newMemory = MemoryHash({
                    hash: hashes[i],
                    metadata: metadatas[i],
                    agent: msg.sender,
                    timestamp: block.timestamp,
                    isActive: true
                });

                memoryHashes[hashes[i]] = newMemory;
                agentMemories[msg.sender].push(hashes[i]);
                allMemoryHashes.push(hashes[i]);

                emit MemoryHashCommitted(hashes[i], msg.sender, metadatas[i], block.timestamp);
            }
        }
    }

    /**
     * @dev Get memory statistics
     */
    function getMemoryStats()
        external
        view
        returns (
            uint256 totalMemories,
            uint256 activeMemories,
            uint256 verifiedMemories
        )
    {
        totalMemories = allMemoryHashes.length;

        uint256 activeCount = 0;
        uint256 verifiedCount = 0;

        for (uint256 i = 0; i < allMemoryHashes.length; i++) {
            bytes32 hash = allMemoryHashes[i];
            if (memoryHashes[hash].isActive) {
                activeCount++;
            }
            if (verifiedHashes[hash]) {
                verifiedCount++;
            }
        }

        return (totalMemories, activeCount, verifiedCount);
    }
}
