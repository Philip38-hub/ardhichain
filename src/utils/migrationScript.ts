/**
 * Migration Script Utilities
 * Helper functions for running migrations outside the UI
 */

import { ContentMigrator } from '../services/ipfs';

export interface MigrationConfig {
  sourceProvider: 'pinata' | 'nodely';
  targetProvider: 'pinata' | 'nodely';
  cids: string[];
  batchSize?: number;
  delayBetweenBatches?: number;
}

export class MigrationRunner {
  private config: MigrationConfig;
  private migrator: ContentMigrator;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.migrator = new ContentMigrator(config.sourceProvider, config.targetProvider);
  }

  async runBatchMigration(): Promise<void> {
    const batchSize = this.config.batchSize || 10;
    const delay = this.config.delayBetweenBatches || 5000;
    const batches = this.createBatches(this.config.cids, batchSize);

    console.log(`Starting batch migration: ${batches.length} batches of ${batchSize} items`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length}`);

      try {
        const report = await this.migrator.migrateAllContent(batch);
        console.log(`Batch ${i + 1} completed: ${report.successCount}/${report.totalItems} successful`);

        // Save progress
        this.saveProgress(i + 1, batches.length, report);

        // Delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          console.log(`Waiting ${delay}ms before next batch...`);
          await this.delay(delay);
        }
      } catch (error) {
        console.error(`Batch ${i + 1} failed:`, error);
        // Continue with next batch
      }
    }

    console.log('Migration completed');
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private saveProgress(currentBatch: number, totalBatches: number, report: any): void {
    const progress = {
      timestamp: new Date().toISOString(),
      currentBatch,
      totalBatches,
      report
    };

    // In a real implementation, this would save to a database or file
    localStorage.setItem('migration_progress', JSON.stringify(progress));
  }

  static loadProgress(): any {
    const saved = localStorage.getItem('migration_progress');
    return saved ? JSON.parse(saved) : null;
  }
}

// Example usage function
export async function runExampleMigration(): Promise<void> {
  const config: MigrationConfig = {
    sourceProvider: 'pinata',
    targetProvider: 'nodely',
    cids: [
      // Add your CIDs here
      'QmExample1...',
      'QmExample2...',
      'QmExample3...'
    ],
    batchSize: 5,
    delayBetweenBatches: 3000
  };

  const runner = new MigrationRunner(config);
  await runner.runBatchMigration();
}