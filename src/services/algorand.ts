import algosdk from 'algosdk';
import { PropertyMetadata } from '../types';
import { Buffer } from 'buffer';

// Helper function to safely stringify objects that may contain BigInt values
function safeStringify(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    // Convert BigInt to String when serializing
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

const algodClient = new algosdk.Algodv2(
  '',
  import.meta.env.VITE_ALGOD_NODE_URL,
  ''
);

const indexerClient = new algosdk.Indexer(
  '',
  import.meta.env.VITE_INDEXER_URL,
  ''
);

export class AlgorandService {
  static async getAccountAssets(address: string): Promise<any[]> {
    try {
      const accountInfo = await indexerClient.lookupAccountByID(address).do();
      return accountInfo.account.assets || [];
    } catch (error) {
      console.error('Error fetching account assets:', error);
      return [];
    }
  }

  static async getAssetInfo(assetId: number): Promise<any> {
    try {
      const assetInfo = await indexerClient.lookupAssetByID(assetId).do();
      return assetInfo.asset;
    } catch (error) {
      console.error('Error fetching asset info:', error);
      return null;
    }
  }

  static async getAssetTransactions(assetId: number): Promise<any[]> {
    try {
      const transactions = await indexerClient
        .lookupAssetTransactions(assetId)
        .limit(100)
        .do();
      return transactions.transactions || [];
    } catch (error) {
      console.error('Error fetching asset transactions:', error);
      return [];
    }
  }

  static async createTitle(
    account: string,
    landId: string,
    metadataUrl: string,
    peraWallet: any
  ): Promise<number> {
    try {
      console.log("Starting createTitle with account:", account);
      console.log("Land ID:", landId);
      console.log("Metadata URL:", metadataUrl);
      
      // Get transaction parameters
      const suggestedParams = await algodClient.getTransactionParams().do();
      console.log("Got suggested params:", safeStringify(suggestedParams));
      
      const appId = parseInt(import.meta.env.VITE_APP_ID || '0');
      console.log("Using app ID:", appId);

      if (!appId) {
        throw new Error('App ID not found in environment variables');
      }

      // Create the application call transaction
      console.log("Creating application call transaction...");
      
      // Create application args as Uint8Array
      const createTitleArg = new Uint8Array(Buffer.from('create_title'));
      const landIdArg = new Uint8Array(Buffer.from(landId));
      const metadataUrlArg = new Uint8Array(Buffer.from(metadataUrl));
      
      // Create the transaction object
      const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: account,
        appIndex: appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [createTitleArg, landIdArg, metadataUrlArg],
        suggestedParams: suggestedParams
      });

      console.log("Transaction created successfully");
      
      try {
        // Check if wallet is connected before signing
        if (!peraWallet || typeof peraWallet.signTransaction !== 'function') {
          console.error("PeraWallet not properly initialized or connected");
          console.log("PeraWallet object:", safeStringify(peraWallet));
          throw new Error('Wallet not connected or initialized properly');
        }
        
        // Sign the transaction using PeraWallet Connect
        console.log("Requesting signature from wallet...");
        
        // Format transaction for Pera Wallet according to documentation
        // The correct format is an array of transaction groups
        // Each transaction group is an array of SignerTransaction objects
        const singleTxnGroup = [
          {
            txn: appCallTxn,
            signers: [account]
          }
        ];
        
        console.log("Transaction prepared for signing:");
        console.log("- Transaction type:", typeof appCallTxn);
        console.log("- Transaction group format:", Array.isArray(singleTxnGroup));
        
        // Add a message for mobile users
        console.log("Please check your Pera Wallet mobile app to sign the transaction");
        console.log("If the app doesn't open automatically, please open it manually and check for pending transactions");
        
        // Sign the transaction with simplified approach
        let signedTxns;
        try {
          // First, check if the transaction is properly formatted
          if (!appCallTxn || typeof appCallTxn !== 'object') {
            throw new Error('Invalid transaction object');
          }
          
          // Log the exact transaction format we're sending to Pera Wallet
          console.log("Calling peraWallet.signTransaction with transaction group");
          
          // Use the format directly from Pera Wallet examples
          signedTxns = await peraWallet.signTransaction([singleTxnGroup]);
          
          console.log("Transaction signed successfully!");
          console.log("Signed transaction type:", typeof signedTxns);
          console.log("Is array:", Array.isArray(signedTxns));
          console.log("Length:", signedTxns ? signedTxns.length : 0);
        } catch (error) {
          console.error("Error during transaction signing:", error);
          if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            
            // Check for specific error types
            if (error.message.includes('getEncodingSchema')) {
              throw new Error('Transaction format error: The transaction object may not be compatible with Pera Wallet. Please ensure you have the latest version of the Pera Wallet app installed.');
            }
          }
          throw new Error(`Transaction signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`); 
        }
        console.log("Transaction signed successfully!");
        console.log("Signed transaction type:", typeof signedTxns);
        console.log("Is array:", Array.isArray(signedTxns));
        console.log("Length:", signedTxns ? signedTxns.length : 0);
        
        if (!signedTxns || signedTxns.length === 0) {
          throw new Error('No signed transaction returned from wallet');
        }
        
        // Send the signed transaction
        console.log("Sending signed transaction to network...");
        
        // Handle the signed transaction based on its structure
        // Pera Wallet typically returns a nested array structure
        let signedTxnToSend;
        let txId;
        
        try {
          // First try to flatten the array to handle any nesting
          if (Array.isArray(signedTxns)) {
            if (signedTxns.length > 0 && Array.isArray(signedTxns[0])) {
              // It's a nested array structure like [[Uint8Array]]
              signedTxnToSend = signedTxns[0];
              console.log("Using first element of nested array structure");
            } else {
              // It's already a flat array
              signedTxnToSend = signedTxns;
              console.log("Using flat array structure");
            }
          } else {
            // It's not an array at all
            signedTxnToSend = signedTxns;
            console.log("Using non-array structure");
          }
          
          console.log("Prepared transaction for sending:");
          console.log("- Type:", typeof signedTxnToSend);
          console.log("- Is array:", Array.isArray(signedTxnToSend));
          console.log("- Length (if array):", Array.isArray(signedTxnToSend) ? signedTxnToSend.length : 'N/A');
          
          // Send the transaction to the network
          txId = await algodClient.sendRawTransaction(signedTxnToSend).do();
          console.log("Transaction sent with ID:", txId.txid);
        } catch (error) {
          console.error("Error sending transaction to network:", error);
          
          // Try alternative approach if the first one fails
          console.log("Trying alternative approach to send transaction...");
          
          try {
            // Try to use the flattened array approach from Pera Wallet docs
            const flattenedTxns = Array.isArray(signedTxns) ? signedTxns.flat() : signedTxns;
            console.log("Flattened transaction type:", typeof flattenedTxns);
            
            // Send the transaction to the network
            txId = await algodClient.sendRawTransaction(flattenedTxns).do();
            console.log("Transaction sent with ID (alternative method):", txId.txid);
          } catch (innerError) {
            console.error("Both transaction sending methods failed:", innerError);
            throw new Error(`Failed to send transaction to network: ${innerError instanceof Error ? innerError.message : 'Unknown error'}`);
          }
        }
        
        // Wait for confirmation
        console.log("Waiting for confirmation...");
        const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId.txid, 4);
        console.log("Transaction confirmed:", safeStringify(confirmedTxn));
        
        // Extract the created asset ID from the transaction
        const innerTxns = confirmedTxn.innerTxns || [];
        console.log("Inner transactions:", safeStringify(innerTxns));
        
        // Find the asset creation transaction
        let assetId = 0;
        for (const innerTxn of innerTxns) {
          const innerTxnAny = innerTxn as any;
          if (innerTxnAny['asset-config-transaction'] && innerTxnAny['created-asset-index']) {
            assetId = innerTxnAny['created-asset-index'];
            console.log("Found created asset ID:", assetId);
            break;
          }
        }
        
        if (!assetId) {
          // If not found in inner transactions, check the main transaction
          const txnResponse = confirmedTxn as any;
          console.log("Checking main transaction for asset ID");
          assetId = txnResponse['created-asset-index'] ?? txnResponse.createdAssetIndex ?? 0;
          
          if (assetId) {
            console.log("Asset created with ID:", assetId);
          } else {
            throw new Error('No asset was created in this transaction');
          }
        }
        
        return assetId;
      } catch (error: any) {
        console.error("Error during transaction signing or sending:", error);
        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
        throw new Error(`Transaction failed: ${error?.message || safeStringify(error) || 'Unknown error'}`);
      }
    } catch (error) {
      // Enhanced error logging
      console.error('Error creating title:', error);
      
      // Log additional details about the error
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else {
        console.error('Unknown error type:', typeof error);
        console.error('Error stringified:', safeStringify(error));
      }
      
      // Rethrow with more context
      throw new Error(`Failed to create title: ${error instanceof Error ? error.message : safeStringify(error)}`);
    }
  }

  // Keep the rest of the class methods as they are
  // ...
}
