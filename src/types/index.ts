export interface LandTitle {
  assetId: number;
  landId: string;
  location: string;
  area: string;
  municipality: string;
  documentHash: string;
  metadataUrl: string;
  owner: string;
  createdAt?: string;
}

export interface TransferRequest {
  assetId: number;
  buyerAddress: string;
  salePrice?: number;
}

export interface AppContextType {
  account: string | null;
  isConnected: boolean;
  isAdmin: boolean;
  peraWallet: any;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  connectionInProgress: boolean;
  connectionError: string | null;
}

export interface PropertyMetadata {
  land_id: string;
  location: string;
  area: string;
  municipality: string;
  document_hash: string;
  created_at: string;
}