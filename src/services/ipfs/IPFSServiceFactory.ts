import { IPFSProvider } from './IPFSProvider';
import { PinataProvider } from './PinataProvider';
import { NodelyProvider } from './NodelyProvider';

export type IPFSProviderType = 'pinata' | 'nodely';

export class IPFSServiceFactory {
  private static instance: IPFSProvider | null = null;

  static create(providerType?: IPFSProviderType): IPFSProvider {
    const provider = providerType || (import.meta.env.VITE_IPFS_PROVIDER as IPFSProviderType) || 'pinata';
    
    try {
      switch (provider) {
        case 'nodely':
          return new NodelyProvider();
        case 'pinata':
        default:
          return new PinataProvider();
      }
    } catch (error) {
      console.error(`Failed to create ${provider} provider:`, error);
      // Fallback to the other provider
      if (provider === 'nodely') {
        console.log('Falling back to Pinata provider');
        return new PinataProvider();
      } else {
        console.log('Falling back to Nodely provider');
        return new NodelyProvider();
      }
    }
  }

  static getInstance(providerType?: IPFSProviderType): IPFSProvider {
    if (!this.instance) {
      this.instance = this.create(providerType);
    }
    return this.instance;
  }

  static resetInstance(): void {
    this.instance = null;
  }
}