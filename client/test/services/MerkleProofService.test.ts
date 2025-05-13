import { expect } from 'chai';
import { Keypair } from '@solana/web3.js';
import { LightProtocolService } from '../../src/services/LightProtocolService';
import { MerkleProofService, MerkleProof } from '../../src/services/MerkleProofService';
import sinon from 'sinon';

describe('MerkleProofService', () => {
  let lightService: LightProtocolService;
  let proofService: MerkleProofService;
  let sandbox: sinon.SinonSandbox;
  
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
    it('should fetch Merkle state', async function() {
      this.timeout(5000); // Increase timeout
      
      const treeId = 'test-tree-1';
      
      // Create a spy on the mock method
      const mockFetchSpy = sandbox.spy(proofService as any, 'mockFetchMerkleTreeState');
      
      const state = await proofService.fetchMerkleState(treeId);
      
      expect(state).to.be.an('object');
      expect(state.treeId).to.equal(treeId);
      expect(state.root).to.be.a('string');
      expect(state.leaves).to.be.an('array');
      expect(mockFetchSpy.calledOnce).to.be.true;
      expect(mockFetchSpy.calledWith(treeId)).to.be.true;
    });
    
    it('should use cached state on second fetch', async function() {
      this.timeout(5000); // Increase timeout
      
      const treeId = 'test-tree-2';
      const mockFetchSpy = sandbox.spy(proofService as any, 'mockFetchMerkleTreeState');
      
      // First fetch should store in cache
      const state1 = await proofService.fetchMerkleState(treeId);
      
      // Second fetch should use cache
      const state2 = await proofService.fetchMerkleState(treeId);
      
      // Both should reference same object
      expect(state1).to.equal(state2);
      
      // Mock method should only be called once
      expect(mockFetchSpy.calledOnce).to.be.true;
    });
    
    it('should force refresh when requested', async function() {
      this.timeout(5000); // Increase timeout
      
      const treeId = 'test-tree-3';
      const mockFetchSpy = sandbox.spy(proofService as any, 'mockFetchMerkleTreeState');
      
      // First fetch should store in cache
      const state1 = await proofService.fetchMerkleState(treeId);
      
      // Second fetch with force refresh should get new state
      const state2 = await proofService.fetchMerkleState(treeId, true);
      
      // Both should be different objects
      expect(state1).to.not.equal(state2);
      
      // Mock method should be called twice
      expect(mockFetchSpy.calledTwice).to.be.true;
    });
    
    it('should implement retry logic for fetch failures', async function() {
      this.timeout(5000); // Increase timeout
      
      const treeId = 'test-retry-tree';
      
      // Stub the mock method to fail on first call, then succeed
      const fetchStub = sandbox.stub(proofService as any, 'mockFetchMerkleTreeState');
      fetchStub.onFirstCall().rejects(new Error('Network error'));
      fetchStub.onSecondCall().resolves({
        treeId,
        height: 20,
        root: `mock-root-${treeId}-${Date.now()}`,
        leaves: [],
        nodeCount: 0
      });
      
      const state = await proofService.fetchMerkleState(treeId);
      
      expect(state).to.be.an('object');
      expect(state.treeId).to.equal(treeId);
      expect(fetchStub.calledTwice).to.be.true;
    });
    
    it('should throw an error after max retries', async function() {
      this.timeout(5000); // Increase timeout
      
      const treeId = 'test-max-retries-tree';
      
      // Create a service with 2 max retries
      const retryService = new MerkleProofService(lightService, {
        maxRetries: 2,
        useCache: true
      });
      
      // Stub the mock method to always fail
      const fetchStub = sandbox.stub(retryService as any, 'mockFetchMerkleTreeState')
        .rejects(new Error('Persistent network error'));
      
      try {
        await retryService.fetchMerkleState(treeId);
        // Should not reach here
        expect.fail('Should have thrown error after max retries');
      } catch (error: any) {
        expect(error.message).to.include('Failed to fetch Merkle state after 2 attempts');
        expect(fetchStub.callCount).to.equal(2); // Initial attempt + 1 retry (total of 2 attempts)
      }
    });
    
    it('should clear cache when requested', async function() {
      this.timeout(5000); // Increase timeout
      
      const treeId = 'test-tree-4';
      const mockFetchSpy = sandbox.spy(proofService as any, 'mockFetchMerkleTreeState');
      
      // First fetch should store in cache
      const state1 = await proofService.fetchMerkleState(treeId);
      
      // Clear cache
      proofService.clearCache();
      
      // Second fetch should get new state
      const state2 = await proofService.fetchMerkleState(treeId);
      
      // Both should be different objects
      expect(state1).to.not.equal(state2);
      expect(mockFetchSpy.calledTwice).to.be.true;
    });
  });
  
  describe('Proof Generation', () => {
    it('should generate a proof for a leaf', async function() {
      this.timeout(5000); // Increase timeout
      
      const treeId = 'test-tree-5';
      const leafIndex = 3;
      const leafData = 'test-data';
      
      // Spy on mockGenerateProof
      const generateProofSpy = sandbox.spy(proofService as any, 'mockGenerateProof');
      
      const proof = await proofService.generateProof(treeId, leafIndex, leafData);
      
      expect(proof).to.be.an('object');
      expect(proof.leafIndex).to.equal(leafIndex);
      expect(proof.leaf).to.be.a('string');
      expect(proof.siblings).to.be.an('array');
      expect(proof.root).to.be.a('string');
      expect(generateProofSpy.calledOnce).to.be.true;
    });
    
    it('should use cached proof on second request', async function() {
      this.timeout(5000); // Increase timeout
      
      const treeId = 'test-tree-6';
      const leafIndex = 2;
      const leafData = 'test-data-2';
      
      // Spy on mockGenerateProof
      const generateProofSpy = sandbox.spy(proofService as any, 'mockGenerateProof');
      
      // First generation should store in cache
      const proof1 = await proofService.generateProof(treeId, leafIndex, leafData);
      
      // Second generation should use cache
      const proof2 = await proofService.generateProof(treeId, leafIndex, leafData);
      
      // Both should reference same object
      expect(proof1).to.equal(proof2);
      expect(generateProofSpy.calledOnce).to.be.true;
    });
    
    it('should force refresh proof when requested', async function() {
      this.timeout(5000); // Increase timeout
      
      const treeId = 'test-tree-7';
      const leafIndex = 1;
      const leafData = 'test-data-3';
      
      // Spy on mockGenerateProof
      const generateProofSpy = sandbox.spy(proofService as any, 'mockGenerateProof');
      
      // First generation should store in cache
      const proof1 = await proofService.generateProof(treeId, leafIndex, leafData);
      
      // Second generation with force refresh should get new proof
      const proof2 = await proofService.generateProof(treeId, leafIndex, leafData, { forceRefresh: true });
      
      // Both should be different objects
      expect(proof1).to.not.equal(proof2);
      expect(generateProofSpy.calledTwice).to.be.true;
    });
    
    it('should fetch state before generating proof', async function() {
      this.timeout(5000); // Increase timeout
      
      const treeId = 'test-tree-fetch-then-generate';
      const leafIndex = 4;
      const leafData = 'test-data-4';
      
      // Spy on fetchMerkleState
      const fetchSpy = sandbox.spy(proofService, 'fetchMerkleState');
      
      await proofService.generateProof(treeId, leafIndex, leafData);
      
      expect(fetchSpy.calledOnce).to.be.true;
      expect(fetchSpy.calledWith(treeId)).to.be.true;
    });
  });
  
  describe('Proof Verification', () => {
    it('should verify a valid proof', async function() {
      this.timeout(5000); // Increase timeout
      
      const treeId = 'test-tree-8';
      const leafIndex = 5;
      const leafData = 'test-data-4';
      
      // Spy on mockVerifyProof
      const verifySpy = sandbox.spy(proofService as any, 'mockVerifyProof');
      
      // Generate a proof
      const proof = await proofService.generateProof(treeId, leafIndex, leafData);
      
      // Verify the proof
      const isValid = await proofService.verifyProof(proof);
      
      expect(isValid).to.be.true;
      expect(verifySpy.calledOnce).to.be.true;
      expect(verifySpy.calledWith(proof)).to.be.true;
    });
    
    it('should handle invalid proofs', async function() {
      this.timeout(5000); // Increase timeout
      
      // Create a stub that returns false for verification
      const verifyStub = sandbox.stub(proofService as any, 'mockVerifyProof').resolves(false);
      
      // Create mock proof
      const mockProof: MerkleProof = {
        leafIndex: 1,
        leaf: 'invalid-leaf',
        siblings: ['sibling1', 'sibling2'],
        root: 'invalid-root'
      };
      
      const isValid = await proofService.verifyProof(mockProof);
      
      expect(isValid).to.be.false;
      expect(verifyStub.calledOnce).to.be.true;
      expect(verifyStub.calledWith(mockProof)).to.be.true;
    });
    
    it('should calculate root from a leaf and its proof', () => {
      const leaf = 'test-leaf';
      const siblings = ['sibling1', 'sibling2', 'sibling3'];
      
      const root = proofService.calculateRootFromProof(leaf, siblings);
      
      expect(root).to.be.a('string');
      expect(root).to.include('mock-root-');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle errors in proof generation', async function() {
      this.timeout(5000); // Increase timeout
      
      const treeId = 'error-tree';
      const leafIndex = 7;
      const leafData = 'error-data';
      
      // Stub fetchMerkleState to succeed but mockGenerateProof to fail
      sandbox.stub(proofService, 'fetchMerkleState').resolves({
        treeId,
        height: 20,
        root: 'mock-root',
        leaves: [],
        nodeCount: 0
      });
      
      sandbox.stub(proofService as any, 'mockGenerateProof')
        .rejects(new Error('Failed to generate proof'));
      
      try {
        await proofService.generateProof(treeId, leafIndex, leafData);
        // Should not reach here
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.equal('Failed to generate proof');
      }
    });
    
    it('should handle errors in proof verification', async function() {
      this.timeout(5000); // Increase timeout
      
      // Create mockProof
      const mockProof: MerkleProof = {
        leafIndex: 1,
        leaf: 'test-leaf',
        siblings: ['sibling1', 'sibling2'],
        root: 'test-root'
      };
      
      // Stub mockVerifyProof to throw an error
      sandbox.stub(proofService as any, 'mockVerifyProof')
        .rejects(new Error('Failed to verify proof'));
      
      try {
        await proofService.verifyProof(mockProof);
        // Should not reach here
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.equal('Failed to verify proof');
      }
    });
  });
}); 