import { VersionedTransaction, PublicKey } from "@solana/web3.js";
import { SolanaAgentKit } from "../index";
import { TOKENS } from "../constants";
import { getMint } from "@solana/spl-token";

/**
 * Create a new pool using FluxBeam
 * @param agent SolanaAgentKit instance
 * @param outputMint Target token mint address
 * @param inputAmount Amount to swap (in token decimals)
 * @param inputMint Source token mint address (defaults to USDC)
 * @param slippageBps Slippage tolerance in basis points (default: 300 = 3%)
 * @returns Transaction signature
 */

export async function createPoolFluxBeam(
  agent: SolanaAgentKit,
  token_a: PublicKey,
  token_a_amount: number,
  token_b: PublicKey,
  token_b_amount: number,
): Promise<string> {
  try {
    const FLUXBEAM_API = `https://api.fluxbeam.xyz/v1`;

    const isTokenA_NativeSol = token_a.equals(TOKENS.SOL);
    const tokenA_Decimals = isTokenA_NativeSol
      ? 9
      : (await getMint(agent.connection, token_a)).decimals;

    const scaledAmountTokenA = token_a_amount * Math.pow(10, tokenA_Decimals);

    const isTokenB_NativeSol = token_b.equals(TOKENS.SOL);
    const tokenB_Decimals = isTokenB_NativeSol
      ? 9
      : (await getMint(agent.connection, token_b)).decimals;

    const scaledAmountTokenB = token_b_amount * Math.pow(10, tokenB_Decimals);

    const { poolTransaction } = await (
      await fetch(`${FLUXBEAM_API}/token_pools`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payer: agent.wallet_address,
          token_a: token_a,
          token_b: token_b,
          token_a_amount: scaledAmountTokenA,
          token_b_amount: scaledAmountTokenB,
        }),
      })
    ).json();
    // Deserialize transaction
    const TransactionBuf = Buffer.from(poolTransaction, "base64");

    const transaction = VersionedTransaction.deserialize(TransactionBuf);
    // Sign and send transaction
    transaction.sign([agent.wallet]);

    const signature = agent.connection.sendRawTransaction(
      transaction.serialize(),
      {
        maxRetries: 3,
        skipPreflight: true,
      },
    );
    return signature;
  } catch (error: any) {
    throw new Error(`Swap failed: ${error.message}`);
  }
}
