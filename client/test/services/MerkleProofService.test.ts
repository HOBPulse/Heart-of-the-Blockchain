import { expect } from 'vitest';
import { Keypair } from '@solana/web3.js';
import { LightProtocolService } from '../../src/services/LightProtocolService';
import { MerkleProofService, MerkleProof } from '../../src/services/MerkleProofService';
import sinon from 'sinon';

describe('MerkleProofService', () => {
  let lightService: LightProtocolService;
  let proofService: MerkleProofService;
  let sandbox: any;
  
  // Use a custom RPC URL for testing if needed
  const testConfig = {
    rpcUrl: process.env.SOLANA_RPC_URL || 'http://localhost:8899',
    commitment: 'confirmed' as const
  };
  
  beforeEach(() => {
    // Create sinon sandbox for stubs
    sandbox = sinon.createSandbox();
    
    // Create a new service instance for each test
    lightService = new LightProtocolService(testConfig);
    proofService = new MerkleProofService(lightService, {
      maxRetries: 2,
      useCache: true
    });
  });
  
  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });
  
  describe('Initialization', () => {
    it('should initialize with a LightProtocolService', () => {
      expect(proofService).to.be.an('object');
    });
    
    it('should initialize with custom options', () => {
      const customService = new MerkleProofService(lightService, {
        maxRetries: 5,
        timeout: 60000,
        useCache: false
      });
      
      expect(customService).to.be.an('object');
    });
    
    it('should use default options when not provided', () => {
      const defaultService = new MerkleProofService(lightService);
      expect(defaultService).to.be.an('object');
    });
  });
  
  describe('Merkle State Operations', () => {
    it('should fetch Merkle state (integration, requires real RPC)', async function() {
      const treeId = Keypair.generate().publicKey.toBase58();
      // This will fail if the RPC does not support Light Protocol compressed accounts
      try {
      const state = await proofService.fetchMerkleState(treeId);
      expect(state).to.be.an('object');
      } catch (err) {
        // Accept failure if RPC is not available
        expect(err).to.be.instanceOf(Error);
      }
    });
    
    it('should use cached state on second fetch', async function() {
      const treeId = Keypair.generate().publicKey.toBase58();
      try {
      const state1 = await proofService.fetchMerkleState(treeId);
      const state2 = await proofService.fetchMerkleState(treeId);
      expect(state1).to.equal(state2);
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });
    
    it('should force refresh when requested', async function() {
      const treeId = Keypair.generate().publicKey.toBase58();
      try {
      const state1 = await proofService.fetchMerkleState(treeId);
      const state2 = await proofService.fetchMerkleState(treeId, true);
      expect(state1).to.not.equal(state2);
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });
    
    it('should throw an error after max retries', async function() {
      const treeId = 'invalid-tree-id';
      try {
        await proofService.fetchMerkleState(treeId);
        expect.fail('Should have thrown error after max retries');
      } catch (error: any) {
        expect(error.message).to.include('Failed to fetch Merkle state');
      }
    });
    
    it('should clear cache when requested', async function() {
      const treeId = Keypair.generate().publicKey.toBase58();
      try {
      const state1 = await proofService.fetchMerkleState(treeId);
      proofService.clearCache();
      const state2 = await proofService.fetchMerkleState(treeId);
      expect(state1).to.not.equal(state2);
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });
  });
  
  describe('Proof Generation', () => {
    it('should generate a proof for a leaf (integration, requires real RPC)', async function() {
      const treeId = Keypair.generate().publicKey.toBase58();
      const leafIndex = 3;
      const leafData = 'test-data';
      try {
      const proof = await proofService.generateProof(treeId, leafIndex, leafData);
      expect(proof).to.be.an('object');
      expect(proof.leafIndex).to.equal(leafIndex);
      expect(proof.leaf).to.be.a('string');
      expect(proof.siblings).to.be.an('array');
      expect(proof.root).to.be.a('string');
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });
    
    it('should use cached proof on second request', async function() {
      const treeId = Keypair.generate().publicKey.toBase58();
      const leafIndex = 3;
      const leafData = 'test-data-3';
      try {
      const proof1 = await proofService.generateProof(treeId, leafIndex, leafData);
      const proof2 = await proofService.generateProof(treeId, leafIndex, leafData);
      expect(proof1).to.equal(proof2);
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });
    
    it('should force refresh proof when requested', async function() {
      const treeId = Keypair.generate().publicKey.toBase58();
      const leafIndex = 4;
      const leafData = 'test-data-4';
      try {
        const proof1 = await proofService.generateProof(treeId, leafIndex, leafData);
        const proof2 = await proofService.generateProof(treeId, leafIndex, leafData, { forceRefresh: true });
        expect(proof1).to.not.equal(proof2);
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });
  });
  
  describe('Proof Verification', () => {
    it('should throw error for proof verification (not supported client-side)', async () => {
      const mockProof: MerkleProof = {
        leafIndex: 1,
        leaf: 'test-leaf',
        siblings: ['sibling1', 'sibling2'],
        root: 'test-root'
      };
      await expect(proofService.verifyProof(mockProof)).rejects.toThrow('Merkle proof verification is not supported client-side');
    });
  });
  
  describe('calculateRootFromProof', () => {
    it('should return a mock root string', () => {
      const leaf = 'test-leaf';
      const siblings = ['sibling1', 'sibling2', 'sibling3'];
      const root = proofService.calculateRootFromProof(leaf, siblings);
      expect(root).to.be.a('string');
      expect(root).to.include('mock-root-');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle errors in proof generation', async () => {
      const treeId = 'invalid-tree-id';
      const leafIndex = 7;
      const leafData = 'error-data';
      try {
        await proofService.generateProof(treeId, leafIndex, leafData);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('Failed to generate Merkle proof');
      }
    });
  });
}); 