import React, { useState, useEffect } from 'react';
import { Wallet, LogOut, Smartphone, QrCode, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const WalletConnector: React.FC = () => {
  const { 
    isConnected, 
    account, 
    connectWallet, 
    disconnectWallet,
    connectionInProgress,
    connectionError 
  } = useApp();
  const [showWalletHelp, setShowWalletHelp] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if user is on a mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    };
    
    setIsMobile(checkMobile());
  }, []);

  const handleConnectClick = () => {
    connectWallet();
    setShowWalletHelp(true);
  };

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-3">
        <div className="bg-gray-100 px-3 py-2 rounded-lg">
          <span className="text-sm font-mono">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
        <button
          onClick={disconnectWallet}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleConnectClick}
        disabled={connectionInProgress}
        className={`flex items-center gap-2 ${connectionInProgress ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white px-6 py-3 rounded-lg transition-colors font-medium`}
      >
        <Wallet size={20} />
        {connectionInProgress ? 'Connecting...' : 'Connect Pera Wallet'}
      </button>
      
      {connectionError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            <span>{connectionError}</span>
          </div>
        </div>
      )}
      
      {showWalletHelp && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-1 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-medium text-blue-800 mb-2">Connecting to Pera Wallet</h3>
              <p className="text-sm text-gray-700 mb-3">
                {isMobile ? (
                  <>The Pera Wallet app should open automatically. If it doesn't, please check your notifications or manually open the Pera Wallet app.</>  
                ) : (
                  <>You'll need to use the Pera Wallet mobile app to approve this connection. Please check your mobile device.</>  
                )}
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Smartphone size={16} className="text-blue-600" />
                  <span>Make sure you have the Pera Wallet app installed</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <QrCode size={16} className="text-blue-600" />
                  <span>Open the app and approve the connection request</span>
                </div>
              </div>
              <button 
                onClick={() => setShowWalletHelp(false)}
                className="mt-3 text-xs text-blue-600 hover:text-blue-800"
              >
                Hide this message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};