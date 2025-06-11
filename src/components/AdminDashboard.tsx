import React, { useState } from 'react';
import { FileText, Upload, MapPin, Ruler, Building, Settings, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { IPFSService } from '../services/ipfs';
import { AlgorandService } from '../services/algorand';
import { PropertyMetadata } from '../types';
import { MigrationDashboard } from './admin/MigrationDashboard';
import { IPFSHealthCheck } from './admin/IPFSHealthCheck';

type AdminView = 'create' | 'migration' | 'health';

export const AdminDashboard: React.FC = () => {
  const { account, peraWallet, isAdmin } = useApp();
  const [activeView, setActiveView] = useState<AdminView>('create');
  const [formData, setFormData] = useState({
    landId: '',
    location: '',
    area: '',
    municipality: ''
  });
  const [document, setDocument] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

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
    setUploadProgress(0);

    try {
      // Upload document to IPFS with progress tracking
      const documentCid = await IPFSService.uploadFile(document);
      setUploadProgress(50);

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
      setUploadProgress(75);

      // Create the land title NFT
      const assetId = await AlgorandService.createTitle(
        account,
        formData.landId,
        metadataUrl,
        peraWallet
      );
      setUploadProgress(100);

      setSuccessMessage(`Land title created successfully! Asset ID: ${assetId}`);
      
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
      alert('Failed to create land title. Please try again.');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const renderCreateView = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create Land Title</h2>
          <p className="text-gray-600">Create new land title NFTs</p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
          {successMessage}
        </div>
      )}

      {isLoading && uploadProgress > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Upload Progress</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
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
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating Land Title...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Create Land Title NFT
            </>
          )}
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage land titles and IPFS infrastructure</p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveView('create')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeView === 'create'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-5 h-5" />
              Create Titles
            </button>
            <button
              onClick={() => setActiveView('migration')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeView === 'migration'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-5 h-5" />
              Migration
            </button>
            <button
              onClick={() => setActiveView('health')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeView === 'health'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="w-5 h-5" />
              Health Check
            </button>
          </div>
        </div>

        {/* Content */}
        {activeView === 'create' && renderCreateView()}
        {activeView === 'migration' && <MigrationDashboard />}
        {activeView === 'health' && <IPFSHealthCheck />}
      </div>
    </div>
  );
};