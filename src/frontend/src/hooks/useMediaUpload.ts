import { HttpAgent } from "@icp-sdk/core/agent";
import { useState } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadMedia = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const config = await loadConfig();
      const agent = new HttpAgent({ host: config.backend_host });
      if (config.backend_host?.includes("localhost")) {
        await agent.fetchRootKey().catch(console.warn);
      }
      const storageClient = new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );
      const bytes = await file.arrayBuffer();
      const { hash } = await storageClient.putFile(new Uint8Array(bytes));
      const url = await storageClient.getDirectURL(hash);
      return url;
    } finally {
      setUploading(false);
    }
  };

  return { uploadMedia, uploading };
}
