import React, { useState, useEffect } from 'react';
import { MapPin, FileText, Send, ExternalLink, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AlgorandService } from '../services/algorand';
import { IPFSService } from '../services/ipfs';
import { LandTitle, PropertyMetadata } from '../types';
import { getDemoTitlesForAccount, isDemoMode } from '../services/mockData';

export const MyTitles: React.FC = () => {
  const { account, peraWallet, isConnected } = useApp();
  const [titles, setTitles] = useState<LandTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTitle, setSelectedTitle] = useState<LandTitle | null>(null);
  const [transferData, setTransferData] = useState({
    buyerAddress: '',
    salePrice: ''
  });
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState('');
  const [transferError, setTransferError] = useState('');

  useEffect(() => {
    console.log("MyTitles useEffect triggered");
    console.log("Account state:", account);
    console.log("Connected state:", isConnected);
    if (account) {
      console.log("Calling loadTitles for account:", account);
      loadTitles();
    } else {
      console.log("No account available, skipping loadTitles");
    }
  }, [account]);

  const loadTitles = async () => {
    console.log("loadTitles function called");
    if (!account) {
      console.log("No account in loadTitles, returning early");
      return;
    }

    try {
      setLoading(true);
      console.log("Loading titles for account:", account);
      
      // Check if demo mode is enabled
      if (isDemoMode()) {
        console.log("Demo mode enabled, loading demo titles");
        const demoTitles = getDemoTitlesForAccount(account);
        setTitles(demoTitles);
        setLoading(false);
        return;
      }

      // Direct indexer search for created assets
      try {
        console.log("Attempting direct indexer search for created assets...");
        const createdAssetsResponse = await fetch(
          `${import.meta.env.VITE_INDEXER_URL}/v2/accounts/${account}/created-assets`
        );
        const createdAssets = await createdAssetsResponse.json();
        console.log("Created assets from indexer:", createdAssets);
      } catch (error) {
        console.error("Error fetching created assets directly:", error);
      }

      // Get application ID and check contract's assets
      const appId = parseInt(import.meta.env.VITE_APP_ID);
      console.log("Smart contract app ID:", appId);
      console.log("Checking smart contract assets...");
      const contractAssets = await AlgorandService.getContractAssets(appId);
      console.log("Smart contract assets:", contractAssets);
      
      // First search for all ARDHI assets in the network
      console.log("Searching for all ARDHI assets in the network...");
      const allArdhiAssets = await AlgorandService.searchAssetsByUnitName('ARDHI');
      console.log("All ARDHI assets found:", allArdhiAssets);
      
      // Check which assets were created by this account
      console.log("Checking for assets created by current account...");
      const createdByAccount = allArdhiAssets.filter(
        asset => asset.params.creator === account
      );
      console.log("Assets created by current account:", createdByAccount);
      
      // Then get account's assets
      const assets = await AlgorandService.getAccountAssets(account);
      console.log("Fetched assets from service:", assets);
      
      if (createdByAccount.length > 0 && assets.length === 0) {
        console.log("Found assets created by account but not in account's assets - may need opt-in");
        console.log("Created asset IDs:", createdByAccount.map(asset => asset.index));
      }
      
      if (!assets || assets.length === 0) {
        console.log("No assets found. Checking if account exists...");
        const accountResponse = await fetch(
          `${import.meta.env.VITE_INDEXER_URL}/v2/accounts/${account}`
        );
        const accountInfo = await accountResponse.json();
        console.log("Direct account info from indexer:", accountInfo);
      }
      
      // Filter for ARDHI unit name assets
      const ardhiAssets = assets.filter(asset => asset.amount > 0);
      console.log("Assets with amount > 0:", ardhiAssets);

      const titlePromises = ardhiAssets.map(async (asset) => {
        try {
          console.log("Fetching asset info for asset ID:", asset['asset-id']);
          const assetInfo = await AlgorandService.getAssetInfo(asset['asset-id']);
          console.log("Asset info:", assetInfo);
          
          if (assetInfo?.params?.['unit-name'] === 'ARDHI') {
            console.log("Found ARDHI asset:", asset['asset-id']);
            const metadataUrl = assetInfo.params.url;
            let metadata: PropertyMetadata | null = null;
            
            if (metadataUrl?.startsWith('ipfs://')) {
              console.log("Fetching IPFS metadata from:", metadataUrl);
              const cid = metadataUrl.replace('ipfs://', '');
              metadata = await IPFSService.fetchJSON(cid);
              console.log("IPFS metadata:", metadata);
            }

            return {
              assetId: asset['asset-id'],
              landId: assetInfo.params.name || '',
              location: metadata?.location || 'Unknown',
              area: metadata?.area || 'Unknown',
              municipality: metadata?.municipality || 'Unknown',
              documentHash: metadata?.document_hash || '',
              metadataUrl: metadataUrl || '',
              owner: account,
              createdAt: metadata?.created_at
            } as LandTitle;
          }
        } catch (error) {
          console.error('Error loading asset metadata:', error);
        }
        return null;
      });

      const resolvedTitles = await Promise.all(titlePromises);
      const filteredTitles = resolvedTitles.filter(title => title !== null) as LandTitle[];
      console.log("Final filtered titles:", filteredTitles);
      setTitles(filteredTitles);
    } catch (error) {
      console.error('Error loading titles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTitle || !transferData.buyerAddress || !account) return;

    // Check if this is a demo title
    if (isDemoMode() && selectedTitle.assetId >= 999000) {
      setTransferSuccess('Demo transfer completed! In a real environment, this would transfer the NFT on the blockchain.');
      setTransferData({ buyerAddress: '', salePrice: '' });
      
      // Close modal after a short delay
      setTimeout(() => {
        setSelectedTitle(null);
        setTransferSuccess('');
        // Remove the transferred title from the demo list
        setTitles(prev => prev.filter(title => title.assetId !== selectedTitle.assetId));
      }, 2000);
      return;
    }

    setIsTransferring(true);
    setTransferSuccess('');
    setTransferError('');

    try {
      await AlgorandService.userTransferTitle(
        account,
        selectedTitle.assetId,
        transferData.buyerAddress,
        peraWallet
      );

      setTransferSuccess('Transfer completed successfully!');
      setTransferData({ buyerAddress: '', salePrice: '' });
      
      // Close modal after a short delay
      setTimeout(() => {
        setSelectedTitle(null);
        setTransferSuccess('');
        loadTitles(); // Reload titles to reflect the transfer
      }, 2000);
      
    } catch (error) {
      console.error('Transfer failed:', error);
      let message = 'Transfer failed. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          message = 'Transfer was rejected in the Pera Wallet app.';
        } else if (error.message.includes('overspend') || error.message.includes('Insufficient funds')) {
          message = 'Insufficient funds to complete the transfer.';
        } else if (error.message.includes('asset not opted in')) {
          message = 'The buyer has not opted in to this asset. They must opt in first before receiving the transfer.';
        } else if (error.message.includes('balance') && error.message.includes('0')) {
          message = 'You do not own this asset or it has already been transferred.';
        } else {
          message = `Transfer failed: ${error.message}`;
        }
      }
      setTransferError(message);
    } finally {
      setIsTransferring(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">Connect your Pera Wallet to view your land titles.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your land titles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Land Titles</h1>
              <p className="text-gray-600">Manage your registered land properties</p>
            </div>
            {isDemoMode() && (
              <div className="bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded-lg flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">Demo Mode Active</span>
              </div>
            )}
          </div>
        </div>

        {titles.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Land Titles Found</h3>
            <p className="text-gray-600">
              {isDemoMode() 
                ? "Demo titles will appear here when demo mode is enabled in your environment variables."
                : "You don't own any land titles yet."
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {titles.map((title) => (
              <div
                key={title.assetId}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                onClick={() => setSelectedTitle(title)}
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{title.landId}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        Asset ID: {title.assetId}
                        {isDemoMode() && title.assetId >= 999000 && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">DEMO</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-gray-700">Location:</span>
                        <p className="text-gray-600">{title.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-400 rounded-sm flex-shrink-0"></div>
                      <span className="font-medium text-gray-700">Area:</span>
                      <span className="text-gray-600">{title.area}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <span className="font-medium text-gray-700">Municipality:</span>
                      <span className="text-gray-600">{title.municipality}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
                      View Details & Transfer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Title Detail Modal */}
        {selectedTitle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedTitle.landId}</h2>
                      <p className="text-gray-500 flex items-center gap-2">
                        Asset ID: {selectedTitle.assetId}
                        {isDemoMode() && selectedTitle.assetId >= 999000 && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">DEMO TITLE</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTitle(null);
                      setTransferSuccess('');
                      setTransferError('');
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset ID</label>
                    <p className="text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded-lg">{selectedTitle.assetId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{selectedTitle.area}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{selectedTitle.location}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Municipality</label>
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{selectedTitle.municipality}</p>
                  </div>
                </div>

                {selectedTitle.documentHash && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Official Document</label>
                    {isDemoMode() && selectedTitle.assetId >= 999000 ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-blue-800 text-sm">
                          <FileText className="w-4 h-4 inline mr-2" />
                          Demo document - In production, this would link to the actual IPFS document
                        </p>
                      </div>
                    ) : (
                      <a
                        href={IPFSService.getFileUrl(selectedTitle.documentHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        View Document
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Transfer Ownership
                  </h3>
                  
                  {transferSuccess && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                      <CheckCircle size={18} />
                      {transferSuccess}
                    </div>
                  )}
                  
                  {transferError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                      <AlertCircle size={18} />
                      {transferError}
                    </div>
                  )}

                  <form onSubmit={handleTransfer} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Buyer's Algorand Address
                      </label>
                      <input
                        type="text"
                        value={transferData.buyerAddress}
                        onChange={(e) => setTransferData({...transferData, buyerAddress: e.target.value})}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Enter buyer's wallet address..."
                      />
                      {!isDemoMode() && (
                        <p className="text-sm text-gray-500 mt-1">
                          The buyer must have opted in to this asset first
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sale Price (ALGO) - Optional
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        min="0"
                        value={transferData.salePrice}
                        onChange={(e) => setTransferData({...transferData, salePrice: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="0.0"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        For record keeping only - payment is handled separately
                      </p>
                    </div>

                    {!isDemoMode() && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={18} />
                          <div className="text-sm text-yellow-800">
                            <p className="font-medium mb-1">Important:</p>
                            <p>The buyer must have opted in to asset ID {selectedTitle.assetId} before you can transfer it to them.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isTransferring}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-400 disabled:to-green-500 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                    >
                      {isTransferring ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Transferring...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          {isDemoMode() && selectedTitle.assetId >= 999000 ? 'Demo Transfer' : 'Transfer Title'}
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};