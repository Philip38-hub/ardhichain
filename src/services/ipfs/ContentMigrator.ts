import { IPFSProvider, MigrationResult } from './IPFSProvider';
import { IPFSServiceFactory } from './IPFSServiceFactory';
import axios from 'axios';

export interface MigrationReport {
  totalItems: number;
  successCount: number;
  failureCount: number;
  results: MigrationResult[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export interface ValidationReport {
  totalValidated: number;
  validCount: number;
  invalidCount: number;
  errors: string[];
}

export class ContentMigrator {
  private sourceProvider: IPFSProvider;
  private targetProvider: IPFSProvider;
  private cidMappings: Map<string, string> = new Map();

  constructor(sourceProviderType: 'pinata' | 'nodely', targetProviderType: 'pinata' | 'nodely') {
    this.sourceProvider = IPFSServiceFactory.create(sourceProviderType);
    this.targetProvider = IPFSServiceFactory.create(targetProviderType);
  }

  async migrateAllContent(cids: string[]): Promise<MigrationReport> {
    const report: MigrationReport = {
      totalItems: cids.length,
      successCount: 0,
      failureCount: 0,
      results: [],
      startTime: new Date()
    };

    console.log(`Starting migration of ${cids.length} items...`);

    for (const cid of cids) {
      try {
        const result = await this.migrateSingleAsset(cid);
        report.results.push(result);
        
        if (result.success) {
          report.successCount++;
          this.cidMappings.set(result.originalCid, result.newCid);
        } else {
          report.failureCount++;
        }

        // Add delay to avoid rate limiting
        await this.delay(100);
      } catch (error) {
        const result: MigrationResult = {
          success: false,
          originalCid: cid,
          newCid: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        report.results.push(result);
        report.failureCount++;
      }
    }

    report.endTime = new Date();
    report.duration = report.endTime.getTime() - report.startTime.getTime();

    console.log(`Migration completed: ${report.successCount}/${report.totalItems} successful`);
    return report;
  }

  async migrateSingleAsset(cid: string): Promise<MigrationResult> {
    try {
      // Download content from source provider
      const sourceUrl = this.sourceProvider.getFileUrl(cid);
      const response = await axios.get(sourceUrl, {
        responseType: 'blob',
        timeout: 30000
      });

      // Determine content type and create appropriate upload
      const contentType = response.headers['content-type'];
      let newCid: string;

      if (contentType?.includes('application/json')) {
        // Handle JSON metadata
        const jsonData = await response.data.text();
        const parsedData = JSON.parse(jsonData);
        newCid = await this.targetProvider.uploadJSON(parsedData);
      } else {
        // Handle file uploads
        const file = new File([response.data], `migrated-${cid}`, {
          type: contentType || 'application/octet-stream'
        });
        newCid = await this.targetProvider.uploadFile(file);
      }

      return {
        success: true,
        originalCid: cid,
        newCid: newCid
      };
    } catch (error) {
      console.error(`Failed to migrate ${cid}:`, error);
      return {
        success: false,
        originalCid: cid,
        newCid: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async validateMigration(cidMappings: Map<string, string>): Promise<ValidationReport> {
    const report: ValidationReport = {
      totalValidated: cidMappings.size,
      validCount: 0,
      invalidCount: 0,
      errors: []
    };

    for (const [originalCid, newCid] of cidMappings) {
      try {
        // Fetch content from both providers
        const originalUrl = this.sourceProvider.getFileUrl(originalCid);
        const newUrl = this.targetProvider.getFileUrl(newCid);

        const [originalResponse, newResponse] = await Promise.all([
          axios.get(originalUrl, { timeout: 10000 }),
          axios.get(newUrl, { timeout: 10000 })
        ]);

        // Compare content (basic validation)
        if (JSON.stringify(originalResponse.data) === JSON.stringify(newResponse.data)) {
          report.validCount++;
        } else {
          report.invalidCount++;
          report.errors.push(`Content mismatch: ${originalCid} -> ${newCid}`);
        }
      } catch (error) {
        report.invalidCount++;
        report.errors.push(`Validation failed for ${originalCid} -> ${newCid}: ${error}`);
      }
    }

    return report;
  }

  getCidMappings(): Map<string, string> {
    return new Map(this.cidMappings);
  }

  async rollbackMigration(): Promise<void> {
    // In a real implementation, this would:
    // 1. Restore original CID references in the database
    // 2. Update smart contract metadata URLs
    // 3. Clean up migrated content from target provider
    console.log('Rollback functionality would be implemented here');
    throw new Error('Rollback not implemented - manual intervention required');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}