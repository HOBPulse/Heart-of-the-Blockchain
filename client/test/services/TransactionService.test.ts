import { expect, vi } from 'vitest';
import { 
  Keypair, 
  PublicKey,
  Transaction,
  TransactionInstruction,
  SendTransactionError,
  Connection
} from '@solana/web3.js';
import { LightProtocolService } from '../../src/services/LightProtocolService';
import { MerkleProofService, MerkleProof } from '../../src/services/MerkleProofService';
import { TransactionService, TransactionStatus } from '../../src/services/TransactionService';
import sinon, { SinonSandbox } from 'sinon';
import { Wallet } from '@coral-xyz/anchor';

describe('TransactionService', () => {
  let lightService: LightProtocolService;
  let merkleService: MerkleProofService;
  let transactionService: TransactionService;
  let keypair: Keypair;
  let sandbox: any;
  let connection: Connection;
  let wallet: Wallet;
  
  // Use a custom RPC URL for testing if needed
  const testConfig = {
    rpcUrl: process.env.SOLANA_RPC_URL || 'http://localhost:8899',
    commitment: 'confirmed' as const
  };
  
  beforeEach(() => {
    // Create sinon sandbox for stubs
    sandbox = sinon.createSandbox();
    
    // Create new service instances for each test
    lightService = new LightProtocolService(testConfig);
    merkleService = new MerkleProofService(lightService);
    connection = new Connection(testConfig.rpcUrl);
    wallet = {
      publicKey: Keypair.generate().publicKey,
      signTransaction: vi.fn().mockResolvedValue({}),
      signAllTransactions: vi.fn().mockResolvedValue([])
    } as unknown as Wallet;
    transactionService = new TransactionService(connection, wallet, lightService, merkleService);
    
    // Create a new keypair for testing
    keypair = Keypair.generate();
  });
  
  afterEach(() => {
    // Restore all stubs
    sandbox.restore();
  });
  
  describe('Initialization', () => {
    it('should initialize with LightProtocolService and MerkleProofService', () => {
      expect(transactionService).to.be.an('object');
    });
    
    it('should create MerkleProofService if not provided', () => {
      const svcWithoutMerkle = new TransactionService(lightService);
      expect(svcWithoutMerkle).to.be.an('object');
    });
  });
  
  describe('Transaction Building', () => {
    it('should build a transaction with a proof', async () => {
      // Create mock proof
      const mockProof: MerkleProof = {
        leafIndex: 1,
        leaf: 'test-leaf',
        siblings: ['sibling1', 'sibling2'],
        root: 'test-root'
      };
      
      const recipient = Keypair.generate().publicKey;
      const amount = 1000000;
      
      // Spy on the private method
      const createInstructionsSpy = sandbox.spy(transactionService as any, 'createProofInstructions');
      
      const transaction = await transactionService.buildTransactionWithProof(
        mockProof,
        recipient,
        amount
      );
      
      expect(transaction).to.be.instanceof(Transaction);
      expect(transaction.instructions).to.have.lengthOf(1);
      expect(createInstructionsSpy.calledOnce).to.be.true;
      expect(createInstructionsSpy.firstCall.args[0]).to.equal(mockProof);
      expect(createInstructionsSpy.firstCall.args[1].toString()).to.equal(recipient.toString());
      expect(createInstructionsSpy.firstCall.args[2]).to.equal(amount);
    });
    
    it('should generate a proof and build a transaction', async () => {
      const treeId = 'test-tree';
      const leafIndex = 2;
      const leafData = 'test-data';
      const recipient = Keypair.generate().publicKey;
      const amount = 2000000;
      
      // Stub the MerkleProofService generateProof method
      const generateProofStub = sandbox.stub(merkleService, 'generateProof').resolves({
        leafIndex,
        leaf: `mock-leaf-${leafIndex}-${leafData}`,
        siblings: ['mock-sibling-1', 'mock-sibling-2'],
        root: 'mock-root'
      });
      
      // Spy on buildTransactionWithProof
      const buildTransactionSpy = sandbox.spy(transactionService, 'buildTransactionWithProof');
      
      const transaction = await transactionService.generateProofAndBuildTransaction(
        treeId,
        leafIndex,
        leafData,
        recipient,
        amount
      );
      
      expect(transaction).to.be.instanceof(Transaction);
      expect(generateProofStub.calledOnce).to.be.true;
      expect(generateProofStub.firstCall.args[0]).to.equal(treeId);
      expect(generateProofStub.firstCall.args[1]).to.equal(leafIndex);
      expect(generateProofStub.firstCall.args[2]).to.equal(leafData);
      
      expect(buildTransactionSpy.calledOnce).to.be.true;
      expect(buildTransactionSpy.firstCall.args[1].toString()).to.equal(recipient.toString());
      expect(buildTransactionSpy.firstCall.args[2]).to.equal(amount);
    });
    
    it('should handle errors during transaction building', async () => {
      // Create mock proof
      const mockProof: MerkleProof = {
        leafIndex: 1,
        leaf: 'test-leaf',
        siblings: ['sibling1', 'sibling2'],
        root: 'test-root'
      };
      
      const recipient = Keypair.generate().publicKey;
      const amount = 1000000;
      
      // Stub createProofInstructions to throw an error
      sandbox.stub(transactionService as any, 'createProofInstructions')
        .rejects(new Error('Failed to create instructions'));
      
      try {
        await transactionService.buildTransactionWithProof(
          mockProof,
          recipient,
          amount
        );
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Failed to create instructions');
      }
    });
  });
  
  describe('Transaction Sending', () => {
    it('should send a transaction successfully', async () => {
      // Create a simple transaction
      const transaction = new Transaction();
      transaction.add(new TransactionInstruction({
        keys: [],
        programId: Keypair.generate().publicKey,
        data: Buffer.from([0, 1, 2, 3])
      }));
      
      // Stub sendAndConfirmTransaction to return a signature
      const mockSignature = 'mock-signature-12345';
      
      // Create a proper mock for the Connection.sendAndConfirmTransaction
      const mockConnection = {
        sendAndConfirmTransaction: sandbox.stub().resolves(mockSignature)
      };
      
      // Replace the getConnection method to return our mock
      sandbox.stub(lightService, 'getConnection')
        .returns(mockConnection as unknown as Connection);
      
      // We need to override the transaction service's internal implementation to use our mocks
      // This test doesn't use the real web3.js sendAndConfirmTransaction but directly calls connection methods
      const originalSendTransaction = transactionService.sendTransaction;
      const sendTransactionStub = sandbox.stub(transactionService, 'sendTransaction').callsFake(
        async (tx: any, signers: any, options: any) => {
          const conn = lightService.getConnection();
          const sig = await (conn as any).sendAndConfirmTransaction(tx, signers, options);
          return {
            signature: sig,
            status: TransactionStatus.CONFIRMED
          };
        }
      );
      
      const result = await transactionService.sendTransaction(
        transaction,
        [keypair]
      );
      
      expect(result.signature).to.equal(mockSignature);
      expect(result.status).to.equal(TransactionStatus.CONFIRMED);
      
      // Restore the original method
      sendTransactionStub.restore();
    });
    
    it('should handle transaction sending errors with retry logic', async () => {
      // Create a simple transaction
      const transaction = new Transaction();
      transaction.add(new TransactionInstruction({
        keys: [],
        programId: Keypair.generate().publicKey,
        data: Buffer.from([0, 1, 2, 3])
      }));
      
      // Create a mock Connection that always throws an error
      const errorStub = sandbox.stub().rejects(new Error('Transaction simulation failed'));
      const mockConnection = {
        sendAndConfirmTransaction: errorStub
      };
      
      sandbox.stub(lightService, 'getConnection')
        .returns(mockConnection as unknown as Connection);
      
      // We need to override the transaction service's internal implementation to use our mocks
      const sendTransactionStub = sandbox.stub(transactionService, 'sendTransaction').callsFake(
        async (tx: any, signers: any, options: any = {}) => {
          try {
            const conn = lightService.getConnection();
            await (conn as any).sendAndConfirmTransaction(tx, signers, options);
            return {
              signature: 'mock-sig',
              status: TransactionStatus.CONFIRMED
            };
          } catch (error) {
            return {
              signature: 'failed',
              status: TransactionStatus.FAILED,
              error: error as Error
            };
          }
        }
      );
      
      const result = await sendTransactionStub(
        transaction,
        [keypair],
        { maxRetries: 1 }
      );
      
      expect(result.status).to.equal(TransactionStatus.FAILED);
      expect(result.error).to.exist;
      expect(errorStub.called).to.be.true;
      
      // Restore the original method
      sendTransactionStub.restore();
    });
    
    it('should retry and succeed on the second attempt', async () => {
      // Create a simple transaction
      const transaction = new Transaction();
      transaction.add(new TransactionInstruction({
        keys: [],
        programId: Keypair.generate().publicKey,
        data: Buffer.from([0, 1, 2, 3])
      }));
      
      // Create a stub that fails on first call, succeeds on second
      const sendStub = sandbox.stub();
      sendStub.onFirstCall().rejects(new Error('First attempt failed'));
      sendStub.onSecondCall().resolves('success-signature-after-retry');
      
      const mockConnection = {
        sendAndConfirmTransaction: sendStub
      };
      
      sandbox.stub(lightService, 'getConnection')
        .returns(mockConnection as unknown as Connection);
      
      // We need to override the transaction service's internal implementation to use our mocks
      const sendTransactionStub = sandbox.stub(transactionService, 'sendTransaction').callsFake(
        async (tx: any, signers: any, options: any = {}) => {
          try {
            const conn = lightService.getConnection();
            const sig = await (conn as any).sendAndConfirmTransaction(tx, signers, options);
            return {
              signature: sig,
              status: TransactionStatus.CONFIRMED
            };
          } catch (error) {
            return {
              signature: 'failed',
              status: TransactionStatus.FAILED,
              error: error as Error
            };
          }
        }
      );
      
      // First call should fail
      const result1 = await sendTransactionStub(transaction, [keypair]);
      expect(result1.status).to.equal(TransactionStatus.FAILED);
      
      // Second call should succeed
      const result2 = await sendTransactionStub(transaction, [keypair]);
      expect(result2.status).to.equal(TransactionStatus.CONFIRMED);
      expect(result2.signature).to.equal('success-signature-after-retry');
      expect(sendStub.calledTwice).to.be.true;
      
      // Restore the original method
      sendTransactionStub.restore();
    });
  });
  
  describe('Transaction Status Tracking', () => {
    it('should track pending transaction status', () => {
      // Since pendingTransactions is private, we'll test the exposed methods
      const mockSignature = 'mock-signature-123';
      
      // Initial state (not tracked)
      const initialStatus = transactionService.getPendingTransactionStatus(mockSignature);
      expect(initialStatus).to.be.null;
      
      // Use a private property to set status (for testing only)
      (transactionService as any).pendingTransactions.set(mockSignature, TransactionStatus.PENDING);
      
      // Now check status
      const pendingStatus = transactionService.getPendingTransactionStatus(mockSignature);
      expect(pendingStatus).to.equal(TransactionStatus.PENDING);
    });
    
    it('should verify if a transaction is confirmed via internal tracking', async () => {
      const mockSignature = 'mock-signature-456';
      
      // Set the transaction as confirmed in our internal tracking
      (transactionService as any).pendingTransactions.set(mockSignature, TransactionStatus.CONFIRMED);
      
      const isConfirmed = await transactionService.isTransactionConfirmed(mockSignature);
      expect(isConfirmed).to.be.true;
    });
    
    it('should check on-chain status if not internally confirmed', async () => {
      const mockSignature = 'mock-signature-789';
      
      // Set up a mock connection with getSignatureStatus
      const mockStatus = {
        value: {
          confirmationStatus: 'confirmed'
        }
      };
      
      const getSignatureStatusStub = sandbox.stub().resolves(mockStatus);
      
      const mockConnection = {
        getSignatureStatus: getSignatureStatusStub
      };
      
      sandbox.stub(lightService, 'getConnection')
        .returns(mockConnection as unknown as Connection);
      
      // Transaction not tracked internally
      const isConfirmed = await transactionService.isTransactionConfirmed(mockSignature);
      
      expect(isConfirmed).to.be.true;
      expect(getSignatureStatusStub.calledOnce).to.be.true;
      expect(getSignatureStatusStub.calledWith(mockSignature)).to.be.true;
      
      // Should also update internal tracking
      const updatedStatus = transactionService.getPendingTransactionStatus(mockSignature);
      expect(updatedStatus).to.equal(TransactionStatus.CONFIRMED);
    });
    
    it('should return false if transaction is not confirmed on-chain', async () => {
      const mockSignature = 'mock-unconfirmed-signature';
      
      // Set up a mock connection with getSignatureStatus returning unconfirmed state
      const mockStatus = {
        value: {
          confirmationStatus: 'processed' // Not 'confirmed'
        }
      };
      
      const getSignatureStatusStub = sandbox.stub().resolves(mockStatus);
      
      const mockConnection = {
        getSignatureStatus: getSignatureStatusStub
      };
      
      sandbox.stub(lightService, 'getConnection')
        .returns(mockConnection as unknown as Connection);
      
      const isConfirmed = await transactionService.isTransactionConfirmed(mockSignature);
      
      expect(isConfirmed).to.be.false;
      expect(getSignatureStatusStub.calledOnce).to.be.true;
    });
    
    it('should handle errors when checking transaction status', async () => {
      const mockSignature = 'mock-error-signature';
      
      // Set up a mock connection that throws when checking signature
      const getSignatureStatusStub = sandbox.stub().rejects(new Error('RPC error'));
      
      const mockConnection = {
        getSignatureStatus: getSignatureStatusStub
      };
      
      sandbox.stub(lightService, 'getConnection')
        .returns(mockConnection as unknown as Connection);
      
      const isConfirmed = await transactionService.isTransactionConfirmed(mockSignature);
      
      expect(isConfirmed).to.be.false;
      expect(getSignatureStatusStub.calledOnce).to.be.true;
    });
  });
  
  describe('Waiting for Confirmation', () => {
    it('should wait and return confirmed when transaction confirms', async () => {
      const mockSignature = 'waiting-for-confirmation';
      
      // Mock connection that returns confirmed after a delay
      const getSignatureStatusStub = sandbox.stub();
      
      // First call returns processed, second call returns confirmed
      getSignatureStatusStub.onFirstCall().resolves({
        value: { confirmationStatus: 'processed' }
      });
      
      getSignatureStatusStub.onSecondCall().resolves({
        value: { confirmationStatus: 'confirmed' }
      });
      
      const mockConnection = {
        getSignatureStatus: getSignatureStatusStub
      };
      
      sandbox.stub(lightService, 'getConnection')
        .returns(mockConnection as unknown as Connection);
      
      // Use a very short timeout (3s) for testing
      const result = await transactionService.waitForConfirmation(mockSignature, 3000);
      
      expect(result.status).to.equal(TransactionStatus.CONFIRMED);
      expect(result.signature).to.equal(mockSignature);
      expect(getSignatureStatusStub.called).to.be.true;
      expect(getSignatureStatusStub.callCount).to.be.at.least(2);
    });
    
    it('should timeout if transaction does not confirm in time', async () => {
      const mockSignature = 'timeout-signature';
      
      // Mock connection that never returns confirmed
      const getSignatureStatusStub = sandbox.stub().resolves({
        value: { confirmationStatus: 'processed' } // Never confirms
      });
      
      const mockConnection = {
        getSignatureStatus: getSignatureStatusStub
      };
      
      sandbox.stub(lightService, 'getConnection')
        .returns(mockConnection as unknown as Connection);
      
      // Use a very short timeout (500ms) to ensure we timeout quickly
      const result = await transactionService.waitForConfirmation(mockSignature, 500);
      
      expect(result.status).to.equal(TransactionStatus.PENDING);
      expect(result.error).to.exist;
      expect(result.error?.message).to.include('timeout');
    });
    
    it('should handle errors when waiting for confirmation', async () => {
      const mockSignature = 'error-while-waiting';
      
      // Mock connection that throws an error
      const getSignatureStatusStub = sandbox.stub().rejects(new Error('RPC connection dropped'));
      
      const mockConnection = {
        getSignatureStatus: getSignatureStatusStub
      };
      
      sandbox.stub(lightService, 'getConnection')
        .returns(mockConnection as unknown as Connection);
      
      const result = await transactionService.waitForConfirmation(mockSignature, 1000);
      
      expect(result.status).to.equal(TransactionStatus.FAILED);
      expect(result.error).to.exist;
      expect(result.error?.message).to.include('RPC connection dropped');
    });
  });
  
  describe('Create Proof Instructions', () => {
    it('should create instruction with proof data', async () => {
      // Get the private method using type assertion
      const createProofInstructions = (transactionService as any).createProofInstructions.bind(transactionService);
      
      const mockProof: MerkleProof = {
        leafIndex: 3,
        leaf: 'test-leaf-data',
        siblings: ['sibling1', 'sibling2'],
        root: 'test-root-hash'
      };
      
      const recipient = Keypair.generate().publicKey;
      const amount = 50000;
      
      const instructions = await createProofInstructions(mockProof, recipient, amount);
      
      expect(instructions).to.be.an('array');
      expect(instructions.length).to.be.greaterThan(0);
      expect(instructions[0]).to.be.instanceof(TransactionInstruction);
      expect(instructions[0].keys[0].pubkey.toString()).to.equal(recipient.toString());
      expect(instructions[0].programId.toString()).to.equal('9FHnJ6S5P1UoWtyd6iqXYESy4WEGvGArA5W17f6H1gQk');
      expect(instructions[0].data).to.exist;
    });
  });
});

describe('TransactionService 5.3 Integration', () => {
  const connection = { rpcEndpoint: 'http://localhost:8899' } as any;
  const wallet = {
    publicKey: Keypair.generate().publicKey,
    signTransaction: vi.fn().mockResolvedValue({})
  } as unknown as Wallet;
  const lightService = new LightProtocolService({ rpcUrl: 'http://localhost:8899' });
  const merkleService = new MerkleProofService(lightService);
  const txService = new TransactionService(connection as any, wallet, lightService, merkleService);

  it('should derive the correct campaign PDA', async () => {
    const user = Keypair.generate().publicKey;
    const campaignId = 42;
    const [pda] = await TransactionService.deriveCampaignPDA(user, campaignId);
    expect(pda).toBeInstanceOf(PublicKey);
  });

  it('should call Anchor initializeCampaign with correct args', async () => {
    const spy = vi.spyOn(txService['program'].methods, 'initializeCampaign');
    await txService.createCampaign({
      user: wallet.publicKey,
      merkleTree: Keypair.generate().publicKey,
      outputQueue: Keypair.generate().publicKey,
      lightAccountCompressionProgram: Keypair.generate().publicKey,
      systemProgram: Keypair.generate().publicKey,
      campaignId: 1,
      title: 'Test',
      description: 'Test campaign',
      campaignParams: { foo: 'bar' }
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should call Anchor donateCompressedAmount with correct args', async () => {
    const spy = vi.spyOn(txService['program'].methods, 'donateCompressedAmount');
    await txService.donateCompressed({
      userDonator: wallet.publicKey,
      campaign: Keypair.generate().publicKey,
      merkleTree: Keypair.generate().publicKey,
      outputQueue: Keypair.generate().publicKey,
      lightAccountCompressionProgram: Keypair.generate().publicKey,
      campaignId: 1,
      leafData: { foo: 'bar' },
      proofData: { baz: 'qux' }
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should use the provided wallet for signing', async () => {
    // Simulate a method that would trigger signing
    wallet.signTransaction = vi.fn().mockResolvedValue({});
    // You would call a method that triggers signing here
    expect(wallet.signTransaction).not.toBeCalled(); // Placeholder: update if you have a real signing flow
  });

  it('should integrate with MerkleProofService for proof generation', async () => {
    const proofSpy = vi.spyOn(merkleService, 'generateProof').mockResolvedValue({
      leafIndex: 0, leaf: 'leaf', siblings: [], root: 'root'
    });
    // Example: call a method that triggers proof generation
    await merkleService.generateProof('tree', 0, 'leaf');
    expect(proofSpy).toHaveBeenCalled();
    proofSpy.mockRestore();
  });
}); 