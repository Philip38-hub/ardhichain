/**
 * IPFS Provider Interface
 * Defines the contract for IPFS storage providers
 */
export interface IPFSProvider {
  uploadFile(file: File): Promise<string>;
  uploadJSON(data: any): Promise<string>;
  fetchJSON(cid: string): Promise<any>;
  getFileUrl(cid: string): string;
  validateConnection(): Promise<boolean>;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  metadata?: Record<string, any>;
}

export interface MigrationResult {
  success: boolean;
  originalCid: string;
  newCid: string;
  error?: string;
}