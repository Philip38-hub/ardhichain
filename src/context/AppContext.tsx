import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import { AppContextType } from '../types';

const AppContext = createContext<AppContextType | undefined>(undefined);

const peraWallet = new PeraWalletConnect({
  projectId: 'ardhichain-land-registry',
  projectMeta: {
    name: 'ArdhiChain',
    description: 'Decentralized Land Registry on Algorand',
    url: 'https://ardhichain.app',
    icons: ['https://pera-wallet.perawallet.app/icons/icon-192.png']
  }
});

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const adminAddress = import.meta.env.VITE_ADMIN_ADDRESS;
  const isAdmin = account === adminAddress;

  useEffect(() => {
    // Check for existing session
    peraWallet.reconnectSession().then((accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
      }
    }).catch(() => {
      // Silent fail for reconnection
    });

    // Listen for disconnect events
    peraWallet.connector?.on('disconnect', () => {
      setAccount(null);
      setIsConnected(false);
    });
  }, []);

  const connectWallet = async () => {
    try {
      const accounts = await peraWallet.connect();
      setAccount(accounts[0]);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnectWallet = () => {
    peraWallet.disconnect();
    setAccount(null);
    setIsConnected(false);
  };

  const value: AppContextType = {
    account,
    isConnected,
    isAdmin,
    peraWallet,
    connectWallet,
    disconnectWallet
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};