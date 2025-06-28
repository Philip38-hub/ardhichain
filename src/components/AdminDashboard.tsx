import React, { useState } from 'react';
import { FileText, Upload, MapPin, Ruler, Building, AlertCircle, Smartphone, CheckCircle, Send, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { IPFSService } from '../services/ipfs';
import { AlgorandService } from '../services/algorand';
import { PropertyMetadata } from '../types';

export const AdminDashboard: React.FC = () => {
  const { account, peraWallet, isAdmin } = useApp();
  const [formData, setFormData] = useState({
    landId: '',
    location: '',
    area: '',
    municipality: ''
  });
  const [document, setDocument] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'uploading' | 'signing' | 'processing' | 'complete'>('idle');
  const [createdAssetId, setCreatedAssetId] = useState<number | null>(null);

  // Transfer to owner state
  const [transferData, setTransferData] = useState({
    assetId: '',
    ownerAddress: ''
  });
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSuccessMessage, setTransferSuccessMessage] = useState('');
  const [transferErrorMessage, setTransferErrorMessage] = useState('');

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only authorized administrators can access this page.</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocument(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || !account) return;

    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    setTransactionStatus('uploading');
    setCreatedAssetId(null);

    try {
      // Upload document to IPFS
      const documentCid = await IPFSService.uploadFile(document);
      console.log('Document uploaded to IPFS with CID:', documentCid);

      // Create metadata object
      const metadata: PropertyMetadata = {
        land_id: formData.landId,
        location: formData.location,
        area: formData.area,
        municipality: formData.municipality,
        document_hash: documentCid,
        created_at: new Date().toISOString()
      };

      // Upload metadata to IPFS
      const metadataCid = await IPFSService.uploadJSON(metadata);
      const metadataUrl = `ipfs://${metadataCid}`;
      console.log('Metadata uploaded to IPFS with CID:', metadataCid);
      
      // Update status to signing
      setTransactionStatus('signing');

      // Create the land title NFT
      setTransactionStatus('signing');
      console.log('Requesting transaction signature from Pera Wallet...');
      
      const assetId = await AlgorandService.createTitle(
        account,
        formData.landId,
        metadataUrl,
        peraWallet
      );
      
      // Update status to complete
      setTransactionStatus('complete');
      setCreatedAssetId(assetId);
      setSuccessMessage(`Land title created successfully! Asset ID: ${assetId}. You can now transfer this title to its owner using the form below.`);
      
      // Pre-fill the transfer form with the created asset ID
      setTransferData(prev => ({ ...prev, assetId: assetId.toString() }));
      
      // Reset form
      setFormData({
        landId: '',
        location: '',
        area: '',
        municipality: ''
      });
      setDocument(null);
      
    } catch (error) {
      console.error('Error creating land title:', error);
      setTransactionStatus('idle');
      
      // Extract error message
      let message = 'Failed to create land title. Please try again.';
      if (error instanceof Error) {
        // Check for specific error messages
        if (error.message.includes('Transaction signing timed out')) {
          message = 'Transaction signing timed out. Please check your Pera Wallet mobile app and try again.';
        } else if (error.message.includes('User rejected')) {
          message = 'Transaction was rejected in the Pera Wallet app.';
        } else if (error.message.includes('getEncodingSchema')) {
          message = 'Error with transaction format. Please ensure your Pera Wallet app is up to date.';
        } else if (error.message.includes('Insufficient funds') || error.message.includes('overspend')) {
          message = 'Your wallet does not have enough Algos to complete this transaction. Please fund your wallet with at least 0.001 Algos and try again.';
        } else if (error.message.includes('TransactionPool.Remember')) {
          message = 'Transaction failed: Your wallet may not have enough Algos to pay the transaction fee. Please fund your wallet and try again.';
        } else {
          message = `Error: ${error.message}`;
        }
      }
      
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.assetId || !transferData.ownerAddress || !account) return;

    setIsTransferring(true);
    setTransferSuccessMessage('');
    setTransferErrorMessage('');

    try {
      await AlgorandService.adminTransferTitle(
        account,
        parseInt(transferData.assetId),
        transferData.ownerAddress,
        peraWallet
      );

      setTransferSuccessMessage(`Title successfully transferred to ${transferData.ownerAddress}!`);
      setTransferData({ assetId: '', ownerAddress: '' });
      
    } catch (error) {
      console.error('Error transferring title:', error);
      let message = 'Failed to transfer title. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          message = 'Transfer was rejected in the Pera Wallet app.';
        } else if (error.message.includes('overspend') || error.message.includes('Insufficient funds')) {
          message = 'Insufficient funds to complete the transfer.';
        } else if (error.message.includes('asset not opted in')) {
          message = 'The receiver has not opted in to this asset. They must opt in first before receiving the transfer.';
        } else {
          message = `Transfer failed: ${error.message}`;
        }
      }
      setTransferErrorMessage(message);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Create Land Title Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Land Title NFT</h1>
              <p className="text-gray-600">Create new land title NFTs on the blockchain</p>
            </div>
          </div>

          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <CheckCircle size={18} />
              {successMessage}
            </div>
          )}
          
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle size={18} />
              {errorMessage}
            </div>
          )}
          
          {transactionStatus === 'signing' && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone size={18} className="text-yellow-600" />
                <span className="font-medium">Waiting for wallet approval</span>
              </div>
              <p className="text-sm">
                Please check your Pera Wallet mobile app to approve the transaction. 
                If the app didn't open automatically, please open it manually and check for pending requests.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Official Land ID
                </label>
                <input
                  type="text"
                  name="landId"
                  value={formData.landId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., LR/2024/001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="w-4 h-4 inline mr-2" />
                  Municipality
                </label>
                <input
                  type="text"
                  name="municipality"
                  value={formData.municipality}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Nairobi City"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Westlands, Plot 123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Ruler className="w-4 h-4 inline mr-2" />
                Area
              </label>
              <input
                type="text"
                name="area"
                value={formData.area}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 0.5 acres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Upload className="w-4 h-4 inline mr-2" />
                Official Document
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
              />
              <p className="text-sm text-gray-500 mt-2">
                Upload the official land registry document (PDF, JPG, PNG)
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {transactionStatus === 'uploading' && (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading to IPFS...
                </>
              )}
              {transactionStatus === 'signing' && (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Waiting for Wallet Signature...
                </>
              )}
              {transactionStatus === 'processing' && (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing Transaction...
                </>
              )}
              {(transactionStatus === 'idle' || !isLoading) && (
                <>
                  <FileText className="w-5 h-5" />
                  Create Land Title NFT
                </>
              )}
            </button>
          </form>
        </div>

        {/* Transfer Title to Owner Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Send className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Transfer Title to Owner</h2>
              <p className="text-gray-600">Transfer created land titles to their rightful owners</p>
            </div>
          </div>

          {transferSuccessMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <CheckCircle size={18} />
              {transferSuccessMessage}
            </div>
          )}
          
          {transferErrorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle size={18} />
              {transferErrorMessage}
            </div>
          )}

          <form onSubmit={handleTransferSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset ID
                </label>
                <input
                  type="number"
                  value={transferData.assetId}
                  onChange={(e) => setTransferData(prev => ({ ...prev, assetId: e.target.value }))}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter Asset ID"
                />
                <p className="text-sm text-gray-500 mt-1">
                  The Asset ID of the land title to transfer
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner's Wallet Address
                </label>
                <input
                  type="text"
                  value={transferData.ownerAddress}
                  onChange={(e) => setTransferData(prev => ({ ...prev, ownerAddress: e.target.value }))}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter owner's Algorand address"
                />
                <p className="text-sm text-gray-500 mt-1">
                  The owner must have opted in to this asset first
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={18} />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Important:</p>
                  <p>The recipient must have opted in to the asset before you can transfer it to them. They need the Asset ID to opt in.</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isTransferring}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isTransferring ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  Transfer to Owner
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};