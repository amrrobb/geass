import { verifyMessage, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export interface SiwaMessage {
  domain: string;
  address: `0x${string}`;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
}

export function createSiwaMessage(
  address: `0x${string}`,
  nonce: string,
  domain = "geass.local",
  uri = "https://geass.local"
): { message: string; params: SiwaMessage } {
  const params: SiwaMessage = {
    domain,
    address,
    statement: "Sign in to GEASS as an autonomous agent. This signature proves agent identity without revealing the principal.",
    uri,
    version: "1",
    chainId: 84532, // Base Sepolia
    nonce,
    issuedAt: new Date().toISOString(),
  };

  const message = [
    `${params.domain} wants you to sign in with your Ethereum account:`,
    params.address,
    "",
    params.statement,
    "",
    `URI: ${params.uri}`,
    `Version: ${params.version}`,
    `Chain ID: ${params.chainId}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${params.issuedAt}`,
  ].join("\n");

  return { message, params };
}

export async function verifySiwaSignature(
  message: string,
  signature: `0x${string}`,
  expectedAddress: `0x${string}`
): Promise<{ address: `0x${string}`; valid: boolean }> {
  try {
    const valid = await verifyMessage({
      address: expectedAddress,
      message,
      signature,
    });
    return { address: expectedAddress, valid };
  } catch {
    return { address: expectedAddress, valid: false };
  }
}

// Server-side signing: agent proves its identity without the user's wallet
export async function signSiwaMessage(message: string): Promise<Hex> {
  const key = process.env.PRIVATE_KEY as Hex;
  if (!key) throw new Error("PRIVATE_KEY not set — cannot sign SIWA message");
  const account = privateKeyToAccount(key);
  return account.signMessage({ message });
}

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
