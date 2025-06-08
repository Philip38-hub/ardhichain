import React from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const WalletConnector: React.FC = () => {
  const { isConnected, account, connectWallet, disconnectWallet } = useApp();

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
    <button
      onClick={connectWallet}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
    >
      <Wallet size={20} />
      Connect Pera Wallet
    </button>
  );
};