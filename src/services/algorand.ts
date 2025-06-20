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
      
      // Check account balance first
      try {
        console.log("Checking account balance...");
        const accountInfo = await algodClient.accountInformation(account).do();
        const balance = accountInfo.amount;
        console.log(`Account balance: ${balance} microAlgos`);
        
        // We need at least 2000 microAlgos for transaction fees (1000 for app call + 1000 for potential contract funding)
        const minRequired = 2000;
        if (balance < minRequired) {
          throw new Error(`Insufficient funds: Account has ${balance} microAlgos, but at least ${minRequired} microAlgos are required for the transaction fees. Please fund your account.`);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Insufficient funds')) {
          throw error; // Re-throw our custom error
        }
        console.error("Error checking account balance:", error);
        // Continue even if we can't check the balance, the transaction will fail later if insufficient
      }
      
      // Get suggested parameters for the transaction
      const suggestedParams = await algodClient.getTransactionParams().do();
      console.log("Got suggested params:", safeStringify(suggestedParams));
      
      // Get the application ID from environment variables
      const appId = parseInt(import.meta.env.VITE_APP_ID || '0');
      console.log("Using app ID:", appId);
      
      // Check if the contract needs funding
      // Get the application address
      const appAddress = algosdk.getApplicationAddress(appId);
      console.log("Smart contract address:", appAddress);
      
      try {
        const contractInfo = await algodClient.accountInformation(appAddress).do();
        console.log(`Contract balance: ${contractInfo.amount} microAlgos`);
        
        // If contract has less than 100000 microAlgos (0.1 Algo), fund it
        const minContractBalance = 100000; // 0.1 Algos
        if (contractInfo.amount < minContractBalance) {
          console.log("Contract needs funding. Preparing funding transaction...");
          
          // Create funding transaction
          const fundingAmount = 200000; // 0.2 Algos
          // Create payment transaction
          const fundingTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            suggestedParams: suggestedParams,
            sender: account,
            receiver: appAddress,
            amount: fundingAmount
          });
          
          // Sign and send funding transaction
          console.log("Requesting signature for funding transaction...");
          // Format transaction for Pera Wallet
          const fundingTxnGroup = [{ txn: fundingTxn, signers: [account] }];
          const signedFundingTxn = await peraWallet.signTransaction([fundingTxnGroup]);
          
          console.log("Sending funding transaction to network...");
          // Pera Wallet returns a nested array structure, so we need to flatten it
          const flattenedSignedFundingTxn = Array.isArray(signedFundingTxn) ? signedFundingTxn.flat() : signedFundingTxn;
          const fundingTxnResult = await algodClient.sendRawTransaction(flattenedSignedFundingTxn).do();
          console.log("Funding transaction sent with ID:", fundingTxnResult.txid);
          
          // Wait for confirmation
          await algosdk.waitForConfirmation(algodClient, fundingTxnResult.txid, 4);
          console.log("Funding transaction confirmed");
        } else {
          console.log("Contract has sufficient balance, no funding needed");
        }
      } catch (error) {
        console.error("Error checking or funding contract:", error);
        // Continue anyway, the transaction might still succeed
      }

      // Create the application call transaction
      console.log("Creating application call transaction...");
      
      // We'll use a simpler approach without ABI to avoid compatibility issues with Pera Wallet
      // This approach uses direct method name and arguments encoding
      
      // Create the transaction object with explicit fee
      const modifiedParams = {...suggestedParams};
      modifiedParams.fee = BigInt(1000); // Minimum fee in microAlgos
      modifiedParams.flatFee = true; // Use flat fee instead of per-byte fee
      
      console.log("Using modified params with explicit fee:", safeStringify(modifiedParams));
      
      // Create the application call transaction with simple method name and arguments
      const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        suggestedParams: modifiedParams,
        sender: account,
        appIndex: appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          new Uint8Array(Buffer.from('create_title')),
          new Uint8Array(Buffer.from(landId)),
          new Uint8Array(Buffer.from(metadataUrl))
        ]
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
      } catch (error) {
        console.error("Error during transaction signing or sending:", error);
        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
          
          // Handle specific errors with more helpful messages
          if (error.message.includes('overspend') || error.message.includes('Insufficient funds')) {
            throw new Error(
              'Insufficient funds: Your wallet does not have enough Algos to pay the transaction fee. ' +
              'To fund your wallet, you can use the Algorand TestNet Dispenser at https://bank.testnet.algorand.network/ ' +
              'or request funds from the Algorand TestNet Discord.'
            );
          } else if (error.message.includes('TransactionPool.Remember')) {
            throw new Error(
              'Transaction rejected by the network. This may be due to insufficient funds. ' +
              'Please ensure your wallet has at least 0.001 Algos to cover the transaction fee.'
            );
          }
        }
        throw new Error(`Failed to create title: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
