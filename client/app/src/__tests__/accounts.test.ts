import { describe, it, expect } from 'vitest';

// Mocked account structures (TypeScript interfaces for test)
interface GlobalConfig {
  admin: string;
  fee_bps: number;
  treasury: string;
  paused: boolean;
  last_update_time: number;
}

interface CampaignInfo {
  creator: string;
  title: string;
  description: string;
  mint: string;
  token_account: string;
  total_donation_received: number;
  merkle_tree: string;
  latest_merkle_root: string;
  donation_count: number;
  last_update_time: number;
}

interface TokenAccount {
  mint: string;
  owner: string;
  token_account: string;
  total_received: number;
  last_update_time: number;
}

interface DonorPDA {
  donor: string;
  campaign: string;
  total_donated: number;
  last_donation_time: number;
}

describe('Solana Account Structures', () => {
  it('should initialize and access GlobalConfig fields', () => {
    const config: GlobalConfig = {
      admin: 'AdminPubkey',
      fee_bps: 100,
      treasury: 'TreasuryPubkey',
      paused: false,
      last_update_time: Date.now(),
    };
    expect(config.admin).toBe('AdminPubkey');
    expect(config.fee_bps).toBe(100);
    expect(config.paused).toBe(false);
  });

  it('should initialize and access CampaignInfo fields', () => {
    const campaign: CampaignInfo = {
      creator: 'CreatorPubkey',
      title: 'Save the Children',
      description: 'A campaign for medical aid',
      mint: 'MintPubkey',
      token_account: 'TokenAccountPubkey',
      total_donation_received: 5000,
      merkle_tree: 'MerkleTreePubkey',
      latest_merkle_root: 'RootHash',
      donation_count: 10,
      last_update_time: Date.now(),
    };
    expect(campaign.title).toMatch(/Save/);
    expect(campaign.total_donation_received).toBeGreaterThan(0);
  });

  it('should initialize and access TokenAccount fields', () => {
    const token: TokenAccount = {
      mint: 'MintPubkey',
      owner: 'OwnerPubkey',
      token_account: 'TokenAccountPubkey',
      total_received: 10000,
      last_update_time: Date.now(),
    };
    expect(token.owner).toBe('OwnerPubkey');
    expect(token.total_received).toBe(10000);
  });

  it('should initialize and access DonorPDA fields', () => {
    const donor: DonorPDA = {
      donor: 'DonorPubkey',
      campaign: 'CampaignPubkey',
      total_donated: 250,
      last_donation_time: Date.now(),
    };
    expect(donor.donor).toBe('DonorPubkey');
    expect(donor.total_donated).toBeGreaterThan(0);
  });
}); 