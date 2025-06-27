import React, { useState } from 'react';
import { FileText, Upload, MapPin, Ruler, Building, AlertCircle, Smartphone, CheckCircle, User } from 'lucide-react';
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
    municipality: '',
    initialOwnerAddress: ''
  });
  const [document, setDocument] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'uploading' | 'signing' | 'processing' | 'complete'>('idle');

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

  const validateAlgorandAddress = (address: string): boolean => {
    // Basic Algorand address validation
    // Algorand addresses are 58 characters long and use base32 encoding
    const algorandAddressRegex = /^[A-Z2-7]{58}$/;
    return algorandAddressRegex.test(address);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || !account) return;

    // Validate the initial owner address
    if (!validateAlgorandAddress(formData.initialOwnerAddress)) {
      setErrorMessage('Please enter a valid Algorand address for the initial owner. Algorand addresses are 58 characters long and contain only uppercase letters and numbers 2-7.');
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    setTransactionStatus('uploading');

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

      // Create the land title NFT with initial owner
      setTransactionStatus('signing');
      console.log('Requesting transaction signature from Pera Wallet...');
      
      const assetId = await AlgorandService.createTitle(
        account,
        formData.landId,
        metadataUrl,
        formData.initialOwnerAddress,
        peraWallet
      );
      
      // Update status to complete
      setTransactionStatus('complete');
      setSuccessMessage(`Land title created successfully! Asset ID: ${assetId}. The NFT has been transferred to ${formData.initialOwnerAddress.slice(0, 6)}...${formData.initialOwnerAddress.slice(-4)}`);
      
      // Reset form
      setFormData({
        landId: '',
        location: '',
        area: '',
        municipality: '',
        initialOwnerAddress: ''
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
        } else if (error.message.includes('receiver must opt-in')) {
          message = `The initial owner (${formData.initialOwnerAddress.slice(0, 6)}...${formData.initialOwnerAddress.slice(-4)}) must first opt-in to receive the asset. Please ask them to opt-in to asset transfers in their wallet.`;
        } else {
          message = `Error: ${error.message}`;
        }
      }
      
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Create new land title NFTs with direct ownership</p>
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
                <User className="w-4 h-4 inline mr-2" />
                Initial Owner's Algorand Address
              </label>
              <input
                type="text"
                name="initialOwnerAddress"
                value={formData.initialOwnerAddress}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Enter the 58-character Algorand address of the land owner"
              />
              <p className="text-sm text-gray-500 mt-2">
                The newly created land title NFT will be transferred directly to this address. 
                Make sure the address is correct as this cannot be undone.
              </p>
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
      </div>
    </div>
  );
};