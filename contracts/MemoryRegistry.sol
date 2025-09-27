// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
        string zgStorageId;  // 0G Storage identifier
        string contentType;  // Type of content (text, image, etc.)
        uint256 size;        // Size of the content
        string[] tags;       // Tags for categorization
    }

    // State variables
    mapping(bytes32 => MemoryHash) public memoryHashes;
    mapping(address => bytes32[]) public agentMemories;
    mapping(bytes32 => bool) public verifiedHashes;
    mapping(string => bytes32) public zgStorageToHash;  // Map 0G Storage ID to hash
    mapping(string => bytes32[]) public tagToHashes;    // Tag-based indexing
    mapping(string => uint256) public contentTypeCount; // Count by content type

    bytes32[] public allMemoryHashes;
    string[] public allTags;

    // Events
    event MemoryHashCommitted(
        bytes32 indexed hash,
        address indexed agent,
        string metadata,
        string zgStorageId,
        string contentType,
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

    event MemoryTagged(
        bytes32 indexed hash,
        string[] tags,
        uint256 timestamp
    );

    event MemoryIndexUpdated(
        bytes32 indexed hash,
        string zgStorageId,
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
     * @dev Commit a memory hash to the registry with 0G Storage integration
     * @param hash The hash of the memory content
     * @param metadata Additional metadata about the memory
     * @param zgStorageId The 0G Storage identifier
     * @param contentType Type of content (text, image, etc.)
     * @param size Size of the content in bytes
     * @param tags Tags for categorization
     */
    function commitMemoryHash(
        bytes32 hash,
        string calldata metadata,
        string calldata zgStorageId,
        string calldata contentType,
        uint256 size,
        string[] calldata tags
    ) external nonReentrant returns (bytes32) {
        require(hash != bytes32(0), "Invalid hash");
        require(memoryHashes[hash].hash == bytes32(0), "Hash already exists");
        require(bytes(zgStorageId).length > 0, "0G Storage ID required");

        MemoryHash memory newMemory = MemoryHash({
            hash: hash,
            metadata: metadata,
            agent: msg.sender,
            timestamp: block.timestamp,
            isActive: true,
            zgStorageId: zgStorageId,
            contentType: contentType,
            size: size,
            tags: tags
        });

        memoryHashes[hash] = newMemory;
        agentMemories[msg.sender].push(hash);
        allMemoryHashes.push(hash);

        // Index by 0G Storage ID
        zgStorageToHash[zgStorageId] = hash;

        // Index by tags
        for (uint256 i = 0; i < tags.length; i++) {
            tagToHashes[tags[i]].push(hash);
            _addTagIfNew(tags[i]);
        }

        // Count by content type
        contentTypeCount[contentType]++;

        emit MemoryHashCommitted(hash, msg.sender, metadata, zgStorageId, contentType, block.timestamp);
        emit MemoryTagged(hash, tags, block.timestamp);

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
     * @dev Get memory hash by 0G Storage ID
     * @param zgStorageId The 0G Storage identifier
     */
    function getMemoryHashByZGStorageId(string calldata zgStorageId) external view returns (bytes32) {
        return zgStorageToHash[zgStorageId];
    }

    /**
     * @dev Get memory hashes by tag
     * @param tag The tag to search for
     */
    function getMemoryHashesByTag(string calldata tag) external view returns (bytes32[] memory) {
        return tagToHashes[tag];
    }

    /**
     * @dev Get memory hashes by content type
     * @param contentType The content type to search for
     */
    function getMemoryHashesByContentType(string calldata contentType) external view returns (bytes32[] memory) {
        bytes32[] memory result = new bytes32[](contentTypeCount[contentType]);
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < allMemoryHashes.length; i++) {
            bytes32 hash = allMemoryHashes[i];
            if (keccak256(bytes(memoryHashes[hash].contentType)) == keccak256(bytes(contentType))) {
                result[resultIndex] = hash;
                resultIndex++;
            }
        }
        
        return result;
    }

    /**
     * @dev Get all available tags
     */
    function getAllTags() external view returns (string[] memory) {
        return allTags;
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
     * @dev Batch commit multiple memory hashes with 0G Storage integration
     * @param hashes Array of hashes to commit
     * @param metadatas Array of metadata corresponding to hashes
     * @param zgStorageIds Array of 0G Storage identifiers
     * @param contentTypes Array of content types
     * @param sizes Array of content sizes
     * @param allTags Array of tag arrays for each memory
     */
    function batchCommitMemoryHashes(
        bytes32[] calldata hashes,
        string[] calldata metadatas,
        string[] calldata zgStorageIds,
        string[] calldata contentTypes,
        uint256[] calldata sizes,
        string[][] calldata allTags
    ) external {
        require(hashes.length == metadatas.length, "Arrays length mismatch");
        require(hashes.length == zgStorageIds.length, "ZG Storage IDs length mismatch");
        require(hashes.length == contentTypes.length, "Content types length mismatch");
        require(hashes.length == sizes.length, "Sizes length mismatch");
        require(hashes.length == allTags.length, "Tags length mismatch");
        require(hashes.length > 0, "No hashes to commit");
        require(hashes.length <= 50, "Batch too large"); // Limit batch size

        for (uint256 i = 0; i < hashes.length; i++) {
            if (memoryHashes[hashes[i]].hash == bytes32(0)) {
                MemoryHash memory newMemory = MemoryHash({
                    hash: hashes[i],
                    metadata: metadatas[i],
                    agent: msg.sender,
                    timestamp: block.timestamp,
                    isActive: true,
                    zgStorageId: zgStorageIds[i],
                    contentType: contentTypes[i],
                    size: sizes[i],
                    tags: allTags[i]
                });

                memoryHashes[hashes[i]] = newMemory;
                agentMemories[msg.sender].push(hashes[i]);
                allMemoryHashes.push(hashes[i]);

                // Index by 0G Storage ID
                zgStorageToHash[zgStorageIds[i]] = hashes[i];

                // Index by tags
                for (uint256 j = 0; j < allTags[i].length; j++) {
                    tagToHashes[allTags[i][j]].push(hashes[i]);
                    _addTagIfNew(allTags[i][j]);
                }

                // Count by content type
                contentTypeCount[contentTypes[i]]++;

                emit MemoryHashCommitted(hashes[i], msg.sender, metadatas[i], zgStorageIds[i], contentTypes[i], block.timestamp);
                emit MemoryTagged(hashes[i], allTags[i], block.timestamp);
            }
        }
    }

    /**
     * @dev Get comprehensive memory statistics
     */
    function getMemoryStats()
        external
        view
        returns (
            uint256 totalMemories,
            uint256 activeMemories,
            uint256 verifiedMemories,
            uint256 totalTags,
            uint256 totalSize
        )
    {
        totalMemories = allMemoryHashes.length;
        totalTags = allTags.length;

        uint256 activeCount = 0;
        uint256 verifiedCount = 0;
        uint256 sizeSum = 0;

        for (uint256 i = 0; i < allMemoryHashes.length; i++) {
            bytes32 hash = allMemoryHashes[i];
            if (memoryHashes[hash].isActive) {
                activeCount++;
                sizeSum += memoryHashes[hash].size;
            }
            if (verifiedHashes[hash]) {
                verifiedCount++;
            }
        }

        return (totalMemories, activeCount, verifiedCount, totalTags, sizeSum);
    }

    /**
     * @dev Private function to add tag if new
     */
    function _addTagIfNew(string memory tag) private {
        // Check if tag already exists
        for (uint256 i = 0; i < allTags.length; i++) {
            if (keccak256(bytes(allTags[i])) == keccak256(bytes(tag))) {
                return; // Tag already exists
            }
        }
        allTags.push(tag);
    }

    /**
     * @dev Update 0G Storage ID for existing memory (for migration purposes)
     * @param hash The memory hash
     * @param newZgStorageId The new 0G Storage ID
     */
    function updateZGStorageId(
        bytes32 hash,
        string calldata newZgStorageId
    ) external onlyActiveHash(hash) onlyHashOwner(hash) nonReentrant {
        require(bytes(newZgStorageId).length > 0, "Invalid 0G Storage ID");
        
        // Remove old mapping if exists
        string memory oldZgStorageId = memoryHashes[hash].zgStorageId;
        if (bytes(oldZgStorageId).length > 0) {
            delete zgStorageToHash[oldZgStorageId];
        }
        
        // Update the storage ID
        memoryHashes[hash].zgStorageId = newZgStorageId;
        zgStorageToHash[newZgStorageId] = hash;
        
        emit MemoryIndexUpdated(hash, newZgStorageId, block.timestamp);
    }
}
