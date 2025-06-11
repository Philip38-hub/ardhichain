import { IPFSServiceFactory } from './IPFSServiceFactory';
import { PropertyMetadata } from '../../types';

// Maintain backward compatibility with existing code
export class IPFSService {
  private static get provider() {
    return IPFSServiceFactory.getInstance();
  }

  static async uploadFile(file: File): Promise<string> {
    return this.provider.uploadFile(file);
  }

  static async uploadJSON(metadata: PropertyMetadata): Promise<string> {
    return this.provider.uploadJSON(metadata);
  }

  static async fetchJSON(cid: string): Promise<PropertyMetadata> {
    return this.provider.fetchJSON(cid);
  }

  static getFileUrl(cid: string): string {
    return this.provider.getFileUrl(cid);
  }

  static async validateConnection(): Promise<boolean> {
    return this.provider.validateConnection();
  }
}

// Export new architecture for advanced usage
export { IPFSServiceFactory } from './IPFSServiceFactory';
export { ContentMigrator } from './ContentMigrator';
export type { IPFSProvider, MigrationResult } from './IPFSProvider';
export type { MigrationReport, ValidationReport } from './ContentMigrator';