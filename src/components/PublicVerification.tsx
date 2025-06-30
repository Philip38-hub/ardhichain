import React, { useState } from 'react';
import { Search, MapPin, FileText, Clock, ExternalLink } from 'lucide-react';
import { AlgorandService } from '../services/algorand';
import { IPFSService } from '../services/ipfs';
import { PropertyMetadata } from '../types';

interface VerificationResult {
  assetId: number;
  currentOwner: string;
  metadata: PropertyMetadata | null;
  transactions: any[];
}

export const PublicVerification: React.FC = () => {
  const [assetId, setAssetId] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const assetInfo = await AlgorandService.getAssetInfo(parseInt(assetId));
      
      if (!assetInfo) {
        setError(`Asset ${assetId} not found. Please verify the asset ID and try again.`);
        return;
      }

      console.log('Asset params:', {
        unitName: assetInfo.params?.['unit-name'],
        url: assetInfo.params?.url,
        creator: assetInfo.params?.creator,
        total: assetInfo.params?.total,
        decimals: assetInfo.params?.decimals,
        defaultFrozen: assetInfo.params?.['default-frozen'],
        name: assetInfo.params?.name
      });

      // Enhanced validation for ArdhiChain land titles
      const isLandTitle = (
        // Check if it follows land title naming pattern (LR/YYYY/NNN)
        /^LR\/\d{4}\/\d+$/.test(assetInfo.params?.name || '') &&
        // Check if it has metadata URL (IPFS)
        (assetInfo.params?.url?.startsWith('ipfs://') || assetInfo.params?.url?.length > 0) &&
        // Check if it's a non-divisible token (NFT)
        assetInfo.params?.decimals === 0 &&
        // Check if total supply is 1 (NFT)
        assetInfo.params?.total === 1n &&
        // Check if it has the ARDHI unit name (optional but preferred)
        (assetInfo.params?.['unit-name'] === 'ARDHI' || assetInfo.params?.['unit-name'] === undefined)
      );

      if (!isLandTitle) {
        // Provide more specific error messages based on what's wrong
        const issues = [];
        
        if (!/^LR\/\d{4}\/\d+$/.test(assetInfo.params?.name || '')) {
          issues.push(`Invalid land ID format: "${assetInfo.params?.name}" (expected format: LR/YYYY/NNN)`);
        }
        
        if (!assetInfo.params?.url || assetInfo.params.url.length === 0) {
          issues.push('No metadata URL found');
        }
        
        if (assetInfo.params?.decimals !== 0) {
          issues.push(`Invalid decimals: ${assetInfo.params?.decimals} (expected: 0 for NFT)`);
        }
        
        if (assetInfo.params?.total !== 1n) {
          issues.push(`Invalid total supply: ${assetInfo.params?.total?.toString()} (expected: 1 for NFT)`);
        }

        setError(`This asset does not appear to be a valid ArdhiChain land title. Issues found:\n${issues.join('\n')}`);
        return;
      }

      // Get current owner by checking who has the asset
      let currentOwner = assetInfo.params.creator; // Default to creator
      
      // Try to find the actual current owner by checking asset holdings
      try {
        const transactions = await AlgorandService.getAssetTransactions(parseInt(assetId));
        
        // Find the most recent transfer transaction to determine current owner
        const transferTxns = transactions.filter(tx => 
          tx['tx-type'] === 'axfer' && 
          tx['asset-transfer-transaction']?.['asset-id'] === parseInt(assetId)
        );
        
        if (transferTxns.length > 0) {
          // Sort by round number to get the most recent
          transferTxns.sort((a, b) => b['confirmed-round'] - a['confirmed-round']);
          const latestTransfer = transferTxns[0];
          currentOwner = latestTransfer['asset-transfer-transaction']?.receiver || currentOwner;
        }
      } catch (ownerError) {
        console.warn('Could not determine current owner from transactions, using creator as fallback');
      }

      // Fetch metadata
      let metadata: PropertyMetadata | null = null;
      const metadataUrl = assetInfo.params.url;
      if (metadataUrl) {
        try {
          if (metadataUrl.startsWith('ipfs://')) {
            const cid = metadataUrl.replace('ipfs://', '');
            metadata = await IPFSService.fetchJSON(cid);
          } else if (metadataUrl.length > 0) {
            // Handle non-IPFS URLs or CID-only formats
            const cid = metadataUrl.startsWith('Qm') ? metadataUrl : metadataUrl;
            metadata = await IPFSService.fetchJSON(cid);
          }
        } catch (metadataError) {
          console.warn('Could not fetch metadata:', metadataError);
          // Continue without metadata - the asset is still valid
        }
      }

      // Get transaction history
      const transactions = await AlgorandService.getAssetTransactions(parseInt(assetId));

      setResult({
        assetId: parseInt(assetId),
        currentOwner,
        metadata,
        transactions
      });

    } catch (error) {
      console.error('Verification error:', error);
      if (error instanceof Error) {
        if (error.message.includes('status 404')) {
          setError(`Asset ID ${assetId} not found. This could mean:
          1. The asset ID is incorrect
          2. The asset was recently created (wait a few minutes)
          3. The asset exists on a different network
          4. The indexer is not fully synced`);
        } else if (error.message.includes('network')) {
          setError('Network error. Please check your internet connection and try again.');
        } else {
          setError(`Failed to verify asset: ${error.message}`);
        }
      } else {
        setError('Failed to verify asset. Please check the Asset ID and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen p-4 md:p-8 bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(/ardhi.jpg)' }}
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-md">Public Land Title Verification</h1>
          <p className="text-xl text-gray-200 drop-shadow-sm">Verify the authenticity and ownership of any land title</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <input
                type="number"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="Enter Asset ID (e.g., 123456789)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Search className="w-5 h-5" />
              )}
              Verify
            </button>
          </form>

          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg whitespace-pre-line">
              {error}
            </div>
          )}
        </div>

        {result && (
          <div className="space-y-8">
            {/* Property Details */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Property Details</h2>
                  <p className="text-gray-600">Asset ID: {result.assetId}</p>
                </div>
              </div>

              {result.metadata ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Land ID</label>
                    <p className="text-lg font-semibold text-gray-900">{result.metadata.land_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                    <p className="text-lg text-gray-900">{result.metadata.area}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <p className="text-lg text-gray-900">{result.metadata.location}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Municipality</label>
                    <p className="text-lg text-gray-900">{result.metadata.municipality}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
                    <p className="text-lg text-gray-900">
                      {new Date(result.metadata.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {result.metadata.document_hash && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Official Document</label>
                      <a
                        href={IPFSService.getFileUrl(result.metadata.document_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <FileText className="w-5 h-5" />
                        View Official Document
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    <strong>Note:</strong> Metadata could not be loaded for this asset, but the asset appears to be a valid ArdhiChain land title based on its structure.
                  </p>
                </div>
              )}
            </div>

            {/* Current Owner */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Current Owner</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-mono text-lg break-all">{result.currentOwner}</p>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Transaction History</h3>
              </div>

              {result.transactions.length > 0 ? (
                <div className="space-y-4">
                  {result.transactions.slice(0, 10).map((tx) => (
                    <div key={tx.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {tx['tx-type'] === 'acfg' ? 'Asset Creation' : 
                           tx['tx-type'] === 'axfer' ? 'Asset Transfer' : 
                           tx['tx-type']}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(tx['round-time'] * 1000).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p><strong>Transaction ID:</strong> {tx.id}</p>
                        <p><strong>Round:</strong> {tx['confirmed-round']}</p>
                        {tx.sender && <p><strong>From:</strong> {tx.sender}</p>}
                        {tx['asset-transfer-transaction']?.receiver && 
                         <p><strong>To:</strong> {tx['asset-transfer-transaction'].receiver}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No transaction history available.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};