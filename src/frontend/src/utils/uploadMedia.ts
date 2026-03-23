import { HttpAgent } from "@icp-sdk/core/agent";
import { loadConfig } from "../config";
import { StorageClient } from "./StorageClient";

export async function uploadMedia(file: File): Promise<string> {
  const config = await loadConfig();
  const agent = new HttpAgent({ host: (config as any).backend_host });
  const storageClient = new StorageClient(
    (config as any).bucket_name,
    (config as any).storage_gateway_url,
    (config as any).backend_canister_id,
    (config as any).project_id,
    agent,
  );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { hash } = await storageClient.putFile(bytes);
  return storageClient.getDirectURL(hash);
}
