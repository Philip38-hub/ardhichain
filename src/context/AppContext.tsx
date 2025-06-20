import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import { AppContextType } from '../types';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initialize Pera Wallet with configuration options
const peraWallet = new PeraWalletConnect({
  shouldShowSignTxnToast: true,
  chainId: 416002 // Algorand TestNet chain ID
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

  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connectWallet = async () => {
    try {
      setConnectionInProgress(true);
      setConnectionError(null);
      
      console.log('Initiating Pera Wallet connection...');
      const accounts = await peraWallet.connect();
      
      console.log('Connected accounts:', accounts);
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        console.log('Wallet connected successfully');
      } else {
        setConnectionError('No accounts returned from wallet');
        console.error('No accounts returned from wallet');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      let errorMessage = 'Failed to connect to wallet';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setConnectionError(errorMessage);
    } finally {
      setConnectionInProgress(false);
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
    disconnectWallet,
    connectionInProgress,
    connectionError
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