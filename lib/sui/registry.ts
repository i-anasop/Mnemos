// Sui registry: on-chain blob_id anchor for verifiable memory.
// This is a best-effort integration — the app works without it.
// Wire up the full Sui SDK integration post-hackathon with your deployed registry object.

export interface RegistryEntry {
  blob_id: string;
  blob_type: string;
  session_id: string;
  created_at: string;
}

const REGISTRY_OBJECT_ID = process.env.MNEMOS_REGISTRY_OBJECT_ID ?? '';

/**
 * Returns true if a registry object has been configured.
 */
export function isRegistryConfigured(): boolean {
  return Boolean(REGISTRY_OBJECT_ID);
}

/**
 * Fetch all blob_ids registered for a user from the on-chain registry.
 * Returns empty array if the registry is not configured.
 */
export async function getUserBlobIds(_userAddress: string): Promise<RegistryEntry[]> {
  if (!isRegistryConfigured()) return [];
  // TODO: implement with @mysten/sui SDK once registry Move module is deployed
  return [];
}

/**
 * Returns the serialized PTB payload to register a blob on Sui.
 * The actual signing and execution happens on the client side via the connected wallet.
 */
export function buildRegisterBlobPayload(params: {
  userAddress: string;
  blobId: string;
  blobType: string;
  sessionId: string;
}): Record<string, string> | null {
  if (!isRegistryConfigured()) return null;
  return {
    registry_object_id: REGISTRY_OBJECT_ID,
    ...params,
  };
}

export function getRegistryObjectId(): string {
  return REGISTRY_OBJECT_ID;
}
