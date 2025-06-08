import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Search, Globe, Lock, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Home: React.FC = () => {
  const { isConnected, isAdmin } = useApp();

  const features = [
    {
      icon: Shield,
      title: 'Blockchain Security',
      description: 'Land titles are secured by the Algorand blockchain, ensuring immutable and tamper-proof records.'
    },
    {
      icon: Globe,
      title: 'Public Verification',
      description: 'Anyone can verify land ownership and authenticity using just the Asset ID.'
    },
    {
      icon: Lock,
      title: 'IPFS Storage',
      description: 'Official documents are stored on IPFS for decentralized, permanent access.'
    },
    {
      icon: Zap,
      title: 'Instant Transfers',
      description: 'Transfer land ownership instantly with blockchain-powered atomic transactions.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">ArdhiChain</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The future of land registry is here. Secure, transparent, and decentralized land title management 
            powered by the Algorand blockchain.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/verify"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Verify Land Title
            </Link>
            {isConnected && (
              <Link
                to="/my-titles"
                className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 px-8 py-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                My Titles
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Shield className="w-5 h-5" />
                Admin Panel
              </Link>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Powered by Algorand</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">4.4s</div>
              <div className="text-gray-600">Block Finality</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">0.001</div>
              <div className="text-gray-600">ALGO Transaction Fee</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">Carbon</div>
              <div className="text-gray-600">Negative Blockchain</div>
            </div>
          </div>
        </div>

        {/* How it Works */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How ArdhiChain Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Mint NFT</h3>
              <p className="text-gray-600">
                Government administrators create unique NFTs for each land title with official documentation stored on IPFS.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">2. Own & Transfer</h3>
              <p className="text-gray-600">
                Landowners can view their titles and transfer ownership through secure blockchain transactions.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Verify Publicly</h3>
              <p className="text-gray-600">
                Anyone can verify land ownership and authenticity using the public verification system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};