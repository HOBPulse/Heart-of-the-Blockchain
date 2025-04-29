import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { HeartOfBlockchain } from "../target/types/heart_of_blockchain";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";


let provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

let USDCmint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

const campaignID = new anchor.BN(1);
const campaignTitle = "Health Care";
const campaignDescription = "Campaign for health care";

let creator: Keypair;
let campaignAccountInfo: PublicKey;
let campaignTokenAccount: PublicKey;

let doner: Keypair;
let donerAccountInfo: PublicKey;
let donerTokenAccount: PublicKey;

before(async () => {
  creator = Keypair.generate();
  doner = Keypair.generate();
  
  const transferIx = anchor.web3.SystemProgram.transfer({
    fromPubkey: provider.wallet.publicKey,
    toPubkey: creator.publicKey,
    lamports: 2 * anchor.web3.LAMPORTS_PER_SOL,
  });

  const tx = new anchor.web3.Transaction().add(transferIx);
  await provider.sendAndConfirm(tx);

  const transferIx2 = anchor.web3.SystemProgram.transfer({
    fromPubkey: provider.wallet.publicKey,
    toPubkey: doner.publicKey,
    lamports: 2 * anchor.web3.LAMPORTS_PER_SOL,
  });

  const tx2 = new anchor.web3.Transaction().add(transferIx2);
  await provider.sendAndConfirm(tx2);


  [campaignAccountInfo] = PublicKey.findProgramAddressSync(
    [
      new anchor.BN(campaignID.toString()).toArrayLike(Buffer, "le", 8), 
      Buffer.from(campaignTitle), 
    ],
    program.programId
  );

  let tokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    USDCmint,
    creator.publicKey,
    true
  );

  campaignTokenAccount = tokenAccount.address;

  [donerAccountInfo] = PublicKey.findProgramAddressSync(
    [Buffer.from("doner"), campaignAccountInfo.toBuffer(), doner.publicKey.toBuffer()],
    program.programId,
  );

  let tokenAccount2 = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    USDCmint,
    doner.publicKey,
    true
  );

  donerTokenAccount = tokenAccount2.address;
})

const program = anchor.workspace.heartOfBlockchain as Program<HeartOfBlockchain>;

describe("heart_of_blockchain", () => {
  it("Initialize campaign", async () => {
    const tx = await program.methods.initCampaign(campaignID, campaignTitle, campaignDescription).accounts({
      creator: creator.publicKey,
      mint: USDCmint,
      campaignAccountInfo,
      campaignTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
    }).signers([creator]).rpc();

    console.log(`Transaction Signature: ${tx}`);
  });

  it("Initialize doner", async () => {
    const tx = await program.methods.initDoner(campaignAccountInfo).accounts({
      doner: doner.publicKey,
      donerAccountInfo,
      systemProgram: SystemProgram.programId,
    }).signers([doner]).rpc();

    console.log(`Transasction Signature: ${tx}`);
  });

  it("Donate amount", async () => {
    await mintTo(
      provider.connection,
      doner,
      USDCmint,
      donerTokenAccount,
      doner,
      10
    );

    let donateAmount = new anchor.BN(5);

    const tx = await program.methods.donateAmount(campaignID, campaignTitle, donateAmount).accounts({
      doner: doner.publicKey,
      mint: USDCmint,
      campaignAccountInfo,
      donerTokenAccount,
      campaignTokenAccount,
      donerAccountInfo,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
    }).signers([doner]).rpc();

    console.log(`Transaction Signature: ${tx}`);
  })
});
