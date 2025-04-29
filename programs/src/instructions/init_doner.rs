use anchor_lang::prelude::*;
use crate::state::DonerInfo;

#[derive(Accounts)]
#[instruction(campaign: Pubkey)]
pub struct InitDoner<'info> {
    #[account(mut)]
    pub doner: Signer<'info>,

    #[account(
        init,
        payer = doner,
        seeds = [b"doner", campaign.as_ref(), doner.key().as_ref()],
        bump,
        space = 8 + DonerInfo::INIT_SPACE
    )]
    pub doner_account_info: Account<'info, DonerInfo>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitDoner<'info> {
    pub fn init_doner(&mut self, campaign: Pubkey) -> Result<()> {
        let doner_info = &mut self.doner_account_info;
        doner_info.doner = self.doner.key();
        doner_info.amount = 0;
        doner_info.campaign = campaign;

        msg!("Doner account initialized: {:?}", doner_info);
        Ok(())
    }
}
