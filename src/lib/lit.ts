import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { LIT_NETWORK, LIT_RPC, LIT_ABILITY, AUTH_METHOD_SCOPE } from "@lit-protocol/constants";
import {
  createSiweMessage,
  generateAuthSig,
  LitActionResource,
  LitPKPResource,
} from "@lit-protocol/auth-helpers";
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";
import * as ethers from "ethers";

// Spending policy Lit Action — runs inside Lit TEE nodes
// The agent's key ONLY signs if the transaction is within policy
export const SPENDING_POLICY_ACTION = `
(async () => {
  const txValue = BigInt(unsignedTx.value || "0");
  const maxPerTx = BigInt(maxPerTxWei);

  if (txValue > maxPerTx) {
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: "Transaction exceeds spending policy",
        requested: txValue.toString(),
        limit: maxPerTx.toString(),
      }),
    });
    return;
  }

  // Only sign if policy passes — key never leaves TEE
  const serialized = JSON.stringify(unsignedTx);
  const toSign = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized))
  );

  const sigShare = await Lit.Actions.signEcdsa({
    toSign,
    publicKey,
    sigName: "policySig",
  });

  Lit.Actions.setResponse({
    response: JSON.stringify({
      success: true,
      message: "Signed within spending policy",
      value: txValue.toString(),
      limit: maxPerTx.toString(),
    }),
  });
})();
`;

let _litClient: LitNodeClient | null = null;

export async function getLitClient(): Promise<LitNodeClient> {
  if (_litClient?.ready) return _litClient;
  _litClient = new LitNodeClient({
    litNetwork: LIT_NETWORK.NagaDev as any,
    debug: false,
  });
  await _litClient.connect();
  return _litClient;
}

export async function getChronicleWallet(): Promise<ethers.Wallet> {
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error("PRIVATE_KEY not set in .env");
  return new ethers.Wallet(
    key,
    new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
  );
}

export async function mintPKP(): Promise<{
  tokenId: string;
  publicKey: string;
  ethAddress: string;
}> {
  const litClient = await getLitClient();
  const wallet = await getChronicleWallet();

  const contractClient = new LitContracts({
    signer: wallet,
    network: LIT_NETWORK.NagaDev as any,
  });
  await contractClient.connect();

  // Mint PKP with wallet auth
  const mintResult = await contractClient.mintWithAuth({
    authMethod: {
      authMethodType: 1, // EthWallet
      accessToken: JSON.stringify({
        sig: "0x",
        derivedVia: "ethWallet",
        signedMessage: "Aegis Agent PKP",
        address: wallet.address,
      }),
    },
    scopes: [AUTH_METHOD_SCOPE.SignAnything, AUTH_METHOD_SCOPE.PersonalSign],
  });

  return {
    tokenId: mintResult.pkp.tokenId,
    publicKey: mintResult.pkp.publicKey,
    ethAddress: mintResult.pkp.ethAddress,
  };
}

export async function getSessionSigs(
  pkpPublicKey: string,
) {
  const litClient = await getLitClient();
  const wallet = await getChronicleWallet();

  return litClient.getSessionSigs({
    chain: "baseSepolia",
    expiration: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    resourceAbilityRequests: [
      {
        resource: new LitPKPResource("*") as any,
        ability: LIT_ABILITY.PKPSigning,
      },
      {
        resource: new LitActionResource("*") as any,
        ability: LIT_ABILITY.LitActionExecution,
      },
    ],
    authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }: any) => {
      const toSign = await createSiweMessage({
        uri: uri!,
        expiration: expiration!,
        resources: resourceAbilityRequests!,
        walletAddress: wallet.address,
        nonce: await litClient.getLatestBlockhash(),
        litNodeClient: litClient,
      } as any);
      return generateAuthSig({ signer: wallet, toSign });
    },
  });
}

export async function signWithPolicy(
  pkpPublicKey: string,
  unsignedTx: {
    to: string;
    value: string;
    chainId: number;
    data?: string;
  },
  maxPerTxEth: string = "0.01"
): Promise<{
  success: boolean;
  signature?: any;
  response?: any;
  error?: string;
}> {
  const litClient = await getLitClient();
  const sessionSigs = await getSessionSigs(pkpPublicKey);

  const maxPerTxWei = ethers.utils.parseEther(maxPerTxEth).toString();

  const result = await litClient.executeJs({
    sessionSigs,
    code: SPENDING_POLICY_ACTION,
    jsParams: {
      unsignedTx,
      publicKey: pkpPublicKey,
      maxPerTxWei,
    },
  });

  const response = JSON.parse(result.response as string);

  if (result.signatures?.policySig) {
    return {
      success: true,
      signature: result.signatures.policySig,
      response,
    };
  }

  return {
    success: false,
    error: response.error,
    response,
  };
}

export async function getPKPWallet(
  pkpPublicKey: string,
): Promise<PKPEthersWallet> {
  const litClient = await getLitClient();
  const sessionSigs = await getSessionSigs(pkpPublicKey);

  const pkpWallet = new PKPEthersWallet({
    controllerSessionSigs: sessionSigs,
    pkpPubKey: pkpPublicKey,
    litNodeClient: litClient,
  });
  await pkpWallet.init();

  return pkpWallet;
}

export function disconnectLit() {
  if (_litClient) {
    _litClient.disconnect();
    _litClient = null;
  }
}
