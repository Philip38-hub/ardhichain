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
  static async searchAssetsByUnitName(unitName: string): Promise<any[]> {
    try {
      console.log(`Searching for assets with unit-name: ${unitName}`);
      const response = await indexerClient
        .searchForAssets()
        .unit(unitName)
        .do();
      console.log('Search results:', response);
      return response.assets || [];
    } catch (error) {
      console.error('Error searching for assets:', error);
      return [];
    }
  }

  static getApplicationAddress(appId: number): string {
    return algosdk.getApplicationAddress(appId).toString();
  }

  static async getContractAssets(appId: number): Promise<any[]> {
    try {
      console.log("Getting assets for contract ID:", appId);
      const appAddress = this.getApplicationAddress(appId);
      console.log("Contract address:", appAddress);

      // Get account info directly first
      const accountInfo = await algodClient.accountInformation(appAddress).do();
      console.log("Contract account info:", {
        address: appAddress,
        amount: accountInfo.amount,
        totalAssets: accountInfo.assets?.length || 0,
        appID: appId
      });

      // Get assets through indexer for more details
      const assets = await this.getAccountAssets(appAddress);
      console.log("Contract assets from indexer:", assets.map(asset => ({
        'asset-id': asset['asset-id'],
        amount: asset.amount,
        'is-frozen': asset['is-frozen']
      })));

      return assets;
    } catch (error) {
      console.error("Error getting contract assets:", {
        error: error instanceof Error ? error.message : error,
        appId,
        indexerUrl: import.meta.env.VITE_INDEXER_URL
      });
      return [];
    }
  }

  static async getAccountAssets(address: string): Promise<any[]> {
    try {
      console.log('Fetching assets for address:', address);
      console.log('Using indexer URL:', import.meta.env.VITE_INDEXER_URL);
      
      const accountInfo = await indexerClient.lookupAccountByID(address).do();
      console.log('Raw account info:', accountInfo);
      
      const assets = accountInfo.account.assets || [];
      console.log('Found assets:', assets);
      
      return assets;
    } catch (error) {
      // Check if this is a 404 "no accounts found" error - this is expected for new/unused addresses
      if (error instanceof Error && 
          error.message.includes('status 404') && 
          error.message.includes('no accounts found for address')) {
        console.warn(`Account not found in indexer (this is normal for new addresses): ${address}`);
        console.warn('This typically means the address has not been used yet or the indexer is not fully synced');
        return [];
      }
      
      // For all other errors, log as error and re-throw
      console.error('Error fetching account assets:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return [];
    }
  }

  static async getAssetInfo(assetId: number): Promise<any> {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second between retries
    const indexerUrl = import.meta.env.VITE_INDEXER_URL;
    const appId = parseInt(import.meta.env.VITE_APP_ID || '0');

    // First check if the contract holds this asset
    console.log(`Checking contract (${appId}) assets...`);
    const contractAssets = await this.getContractAssets(appId);
    console.log('Contract assets:', contractAssets);
    
    const assetInContract = contractAssets.some(asset => {
      // Get asset ID from either property format
      const assetIdFromContract = BigInt(asset.assetId || asset['asset-id']);
      const searchAssetId = BigInt(assetId);
      const match = assetIdFromContract === searchAssetId;
      
      console.log('Comparing asset IDs:', {
        fromContract: assetIdFromContract.toString(),
        searchingFor: searchAssetId.toString(),
        match
      });
      
      return match;
    });
    console.log(`Asset ${assetId} in contract: ${assetInContract}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}: Fetching asset info for ID ${assetId} from ${indexerUrl}`);
        
        // Try direct HTTP request first to check raw response
        const directResponse = await fetch(`${indexerUrl}/v2/assets/${assetId}`);
        console.log(`Direct API Response:`, {
          status: directResponse.status,
          statusText: directResponse.statusText,
          contractHoldsAsset: assetInContract
        });
        
        // Now try with the SDK
        const assetInfo = await indexerClient.lookupAssetByID(assetId).do();
        console.log('Asset info response:', assetInfo);
        return assetInfo.asset;
      } catch (error) {
        // Check if this is a 404 error
        if (error instanceof Error && error.message.includes('status 404')) {
          console.warn(`Attempt ${attempt}: Asset not found for asset-id: ${assetId}`);
          console.warn('Diagnostic information:');
          console.warn(`1. Network: ${indexerUrl} (testnet)`);
          console.warn(`2. Asset ID: ${assetId}`);
          console.warn('3. Common causes:');
          console.warn('   - Asset exists but indexer is not synced');
          console.warn('   - Asset was recently created');
          console.warn('   - Asset exists on different network');
          
          if (attempt < maxRetries) {
            console.log(`Waiting ${retryDelay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        }

        // For other errors, log details and rethrow
        console.error('Error fetching asset info:', {
          attempt,
          error: error instanceof Error ? error.message : error,
          assetId,
          indexerUrl
        });

        if (attempt === maxRetries) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    return null;
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

  static async adminTransferTitle(
    adminAccount: string,
    assetId: number,
    receiverAddress: string,
    peraWallet: any
  ): Promise<void> {
    try {
      console.log("Starting admin transfer:", { adminAccount, assetId, receiverAddress });
      
      // Get suggested parameters
      const suggestedParams = await algodClient.getTransactionParams().do();
      const appId = parseInt(import.meta.env.VITE_APP_ID || '0');
      
      // Create application call transaction
      const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: account,
        appIndex: appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          new Uint8Array(Buffer.from('create_title')),
          new Uint8Array(Buffer.from(landId)),
          new Uint8Array(Buffer.from(metadataUrl))
        ],
        suggestedParams
      });

      const signedTxn = await peraWallet.signTransaction([appCallTxn]);
      const response = await algodClient.sendRawTransaction(signedTxn).do();
      const txId = response.txid;
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      // Get the created asset ID from the transaction
      const confirmedTxn = await algodClient.pendingTransactionInformation(txId).do();
      const innerTxns = (confirmedTxn as any).innerTxnResults as { txn: { txn: any } }[];
      const assetId = innerTxns?.[0]?.txn?.txn?.['created-asset-index'];
      
      if (!assetId) {
        throw new Error('Failed to get created asset ID from transaction');
      }
      
      return assetId;
    } catch (error) {
      console.error("Error in admin transfer:", error);
      throw new Error(`Failed to transfer title: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async userTransferTitle(
    senderAccount: string,
    assetId: number,
    receiverAddress: string,
    peraWallet: any
  ): Promise<void> {
    try {
      console.log("Starting user transfer:", { senderAccount, assetId, receiverAddress });
      
      // Get suggested parameters
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Create asset transfer transaction
      const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: from,
        receiver: to,
        assetIndex: assetId,
        amount: 1,
        suggestedParams
      });

      const signedTxn = await peraWallet.signTransaction([transferTxn]);
      const response = await algodClient.sendRawTransaction(signedTxn).do();
      const txId = response.txid;
      
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      return txId;
    } catch (error) {
      console.error("Error in user transfer:", error);
      throw new Error(`Failed to transfer title: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        
        // Minimum required for creating a title:
        // 1000 microAlgos for app call transaction fee
        // 1000 microAlgos for potential inner transaction fee
        // 300000 microAlgos in case contract needs funding
        const txnFee = 1000;
        const innerTxnFee = 1000;
        const maxFundingNeeded = 300000;
        const minRequired = txnFee + innerTxnFee + maxFundingNeeded;

        if (balance < minRequired) {
          throw new Error(
            `Insufficient funds: Account has ${balance} microAlgos, but at least ${minRequired} microAlgos ` +
            `are required (${txnFee} for transaction fee, ${innerTxnFee} for inner transaction, ` +
            `and up to ${maxFundingNeeded} for potential contract funding). ` +
            `Please fund your account with at least ${minRequired/1000000} Algos.`
          );
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

      const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: account,
        receiver: account,
        assetIndex: assetId,
        amount: 0,
        suggestedParams
      });
      
      const signedTxn = await peraWallet.signTransaction([optInTxn]);
      const response = await algodClient.sendRawTransaction(signedTxn).do();
      const txId = response.txid;
      
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      return txId;
    } catch (error) {
      console.error('Error opting in to asset:', error);
      throw error;
    }
  }
}