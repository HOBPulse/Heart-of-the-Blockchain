// @ts-nocheck // For Vitest test runner, ignore unresolved vitest types in some editors
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { Connection, Keypair } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

// Mock del módulo @lightprotocol/stateless.js completamente
vi.mock('@lightprotocol/stateless.js', () => {
  // Implementación simulada de Rpc
  class MockRpc {
    getSlot = vi.fn().mockResolvedValue(12345);
  }
  
  // Mock de la función createRpc
  const createRpc = vi.fn().mockImplementation(() => new MockRpc());
  
  return {
    Rpc: MockRpc,
    createRpc
  };
});

// Mock de fs y path
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue(JSON.stringify({}))
}));

vi.mock('path', () => ({
  resolve: vi.fn().mockImplementation((p) => p)
}));

// Mock de Connection de Solana
vi.mock('@solana/web3.js', async () => {
  const actual = await vi.importActual('@solana/web3.js');
  return {
    ...actual,
    Connection: vi.fn().mockImplementation(() => ({
      getSlot: vi.fn().mockResolvedValue(12345),
      getVersion: vi.fn().mockResolvedValue({ "solana-core": "1.16.0" })
    }))
  };
});

// Importamos la clase después de los mocks
import { LightProtocolService } from './LightProtocolService';

// Test wallet
class DummyWallet implements Wallet {
  payer = Keypair.generate();
  signTransaction = async (tx: any) => tx;
  signAllTransactions = async (txs: any[]) => txs;
  publicKey = this.payer.publicKey;
}

describe('LightProtocolService', () => {
  let service: LightProtocolService;

  beforeAll(() => {
    // Crear el servicio con la implementación real pero dependencias mockeadas
    service = new LightProtocolService();
  });

  it('should instantiate with default config', () => {
    expect(service).toBeDefined();
    expect(service.getConnection).toBeDefined();
    expect(service.getRpc).toBeDefined();
  });

  it('testConnection should return true', async () => {
    const result = await service.testConnection();
    expect(result).toBe(true);
  });

  it('initializeProgram should return an AnchorProvider', async () => {
    const wallet = new DummyWallet();
    const provider = await service.initializeProgram(wallet);
    expect(provider).toBeDefined();
    expect(provider.connection).toBeDefined();
    expect(provider.wallet).toBe(wallet);
  });

  it('getRpc returns an Rpc instance', () => {
    const rpc = service.getRpc();
    expect(rpc).toBeDefined();
    // Verificar que tiene el método getSlot
    expect(typeof rpc.getSlot).toBe('function');
  });

  it('getConnection returns a Connection instance', () => {
    const conn = service.getConnection();
    expect(conn).toBeDefined();
    expect(typeof conn.getSlot).toBe('function');
  });
}); 