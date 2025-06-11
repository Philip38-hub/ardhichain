import React, { useState } from 'react';
import { Upload, Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ContentMigrator, MigrationReport, ValidationReport } from '../../services/ipfs';
import { useApp } from '../../context/AppContext';

export const MigrationDashboard: React.FC = () => {
  const { isAdmin } = useApp();
  const [migrationReport, setMigrationReport] = useState<MigrationReport | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cidsInput, setCidsInput] = useState('');
  const [sourceProvider, setSourceProvider] = useState<'pinata' | 'nodely'>('pinata');
  const [targetProvider, setTargetProvider] = useState<'pinata' | 'nodely'>('nodely');

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only administrators can access the migration dashboard.</p>
        </div>
      </div>
    );
  }

  const handleMigration = async () => {
    if (!cidsInput.trim()) {
      alert('Please enter CIDs to migrate');
      return;
    }

    setIsLoading(true);
    try {
      const cids = cidsInput.split('\n').map(cid => cid.trim()).filter(cid => cid);
      const migrator = new ContentMigrator(sourceProvider, targetProvider);
      
      const report = await migrator.migrateAllContent(cids);
      setMigrationReport(report);

      if (report.successCount > 0) {
        // Validate migration
        const validation = await migrator.validateMigration(migrator.getCidMappings());
        setValidationReport(validation);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      alert('Migration failed. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">IPFS Migration Dashboard</h1>
          <p className="text-gray-600">Migrate content between IPFS providers</p>
        </div>

        {/* Migration Configuration */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Migration Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source Provider</label>
              <select
                value={sourceProvider}
                onChange={(e) => setSourceProvider(e.target.value as 'pinata' | 'nodely')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pinata">Pinata</option>
                <option value="nodely">Nodely</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Provider</label>
              <select
                value={targetProvider}
                onChange={(e) => setTargetProvider(e.target.value as 'pinata' | 'nodely')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pinata">Pinata</option>
                <option value="nodely">Nodely</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CIDs to Migrate (one per line)
            </label>
            <textarea
              value={cidsInput}
              onChange={(e) => setCidsInput(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="QmExample1...&#10;QmExample2...&#10;QmExample3..."
            />
          </div>

          <button
            onClick={handleMigration}
            disabled={isLoading || sourceProvider === targetProvider}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Migrating Content...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Start Migration
              </>
            )}
          </button>

          {sourceProvider === targetProvider && (
            <p className="text-red-600 text-sm mt-2">Source and target providers must be different</p>
          )}
        </div>

        {/* Migration Results */}
        {migrationReport && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Migration Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{migrationReport.totalItems}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{migrationReport.successCount}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{migrationReport.failureCount}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {migrationReport.duration ? `${Math.round(migrationReport.duration / 1000)}s` : 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Duration</div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="max-h-64 overflow-y-auto">
              <h3 className="font-semibold text-gray-900 mb-3">Detailed Results</h3>
              <div className="space-y-2">
                {migrationReport.results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      result.success ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm truncate">
                        {result.originalCid} → {result.newCid || 'Failed'}
                      </div>
                      {result.error && (
                        <div className="text-red-600 text-xs mt-1">{result.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Validation Results */}
        {validationReport && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Validation Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{validationReport.totalValidated}</div>
                <div className="text-sm text-gray-600">Total Validated</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{validationReport.validCount}</div>
                <div className="text-sm text-gray-600">Valid</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{validationReport.invalidCount}</div>
                <div className="text-sm text-gray-600">Invalid</div>
              </div>
            </div>

            {validationReport.errors.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Validation Errors</h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {validationReport.errors.map((error, index) => (
                    <div key={index} className="text-red-600 text-sm bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};