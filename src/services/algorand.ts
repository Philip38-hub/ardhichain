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

// Add common headers to identify the client application
const commonHeaders = {
  'User-Agent': 'LandTitle-DApp/1.0.0'
};

// Use proxied URLs in development, direct URLs in production
const getAlgodUrl = () => {
  if (import.meta.env.DEV) {
    return `${window.location.origin}/api/algod`;
  }
  return import.meta.env.VITE_ALGOD_NODE_URL;
};

const getIndexerUrl = () => {
  if (import.meta.env.DEV) {
    return `${window.location.origin}/api/indexer`;
  }
  return import.meta.env.VITE_INDEXER_URL;
};

const algodClient = new algosdk.Algodv2(
  '',
  getAlgodUrl(),
  undefined,
  commonHeaders
);

const indexerClient = new algosdk.Indexer(
  '',
  getIndexerUrl(),
  undefined,
  commonHeaders
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
        indexerUrl: getIndexerUrl()
      });
      return [];
    }
  }

  static async getAccountAssets(address: string): Promise<any[]> {
    try {

      console.log('Fetching assets for address:', address);
      console.log('Using indexer URL:', getIndexerUrl());
      
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
    const indexerUrl = getIndexerUrl();
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
        const directUrl = import.meta.env.DEV 
          ? `/api/indexer/v2/assets/${assetId}`
          : `${indexerUrl}/v2/assets/${assetId}`;
        
        const directResponse = await fetch(directUrl, {
          headers: commonHeaders
        });
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
      console.log('Fetching asset transactions for ID:', assetId);
      const transactions = await indexerClient
        .lookupAssetTransactions(assetId)
        .limit(100)
        .do();
      return transactions.transactions || [];
    } catch (error) {
      console.error('Error fetching asset transactions:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
          throw new Error(
            'Unable to connect to Algorand Indexer. Please check your internet connection and try again.'
          );
        }
      }
      
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
      
      // Create ABI contract instance
      const contractSpec = {
        name: "LandTitle",
        methods: [
          {
            name: "admin_transfer_title",
            args: [
              { type: "uint64", name: "asset_id" },
              { type: "address", name: "receiver" }
            ],
            returns: { type: "void" }
          }
        ]
      };

      const contract = new algosdk.ABIContract(contractSpec);
      const adminTransferMethod = contract.getMethodByName("admin_transfer_title");
      
      // Create AtomicTransactionComposer
      const atc = new algosdk.AtomicTransactionComposer();
      
      // Create signer
      const signer = (txnGroup: algosdk.Transaction[]): Promise<Uint8Array[]> => {
        return peraWallet.signTransaction([
          txnGroup.map(txn => ({
            txn: txn,
            signers: [adminAccount]
          }))
        ]).then((signed: any) => Array.isArray(signed) ? signed.flat() : [signed]);
      };
      
      // Add method call
      atc.addMethodCall({
        appID: appId,
        method: adminTransferMethod,
        sender: adminAccount,
        suggestedParams: suggestedParams,
        methodArgs: [assetId, receiverAddress],
        signer
      });

      // Execute the transaction
      console.log("Executing admin transfer transaction...");
      const result = await atc.execute(algodClient, 4);
      console.log("Admin transfer completed successfully:", result.txIDs);
      
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
      const appId = parseInt(import.meta.env.VITE_APP_ID || '0');
      
      // Create ABI contract instance
      const contractSpec = {
        name: "LandTitle",
        methods: [
          {
            name: "user_transfer_title",
            args: [
              { type: "uint64", name: "asset_id" },
              { type: "address", name: "receiver" }
            ],
            returns: { type: "void" }
          }
        ]
      };

      const contract = new algosdk.ABIContract(contractSpec);
      const userTransferMethod = contract.getMethodByName("user_transfer_title");
      
      // Create AtomicTransactionComposer
      const atc = new algosdk.AtomicTransactionComposer();
      
      // Create signer
      const signer = (txnGroup: algosdk.Transaction[]): Promise<Uint8Array[]> => {
        return peraWallet.signTransaction([
          txnGroup.map(txn => ({
            txn: txn,
            signers: [senderAccount]
          }))
        ]).then((signed: any) => Array.isArray(signed) ? signed.flat() : [signed]);
      };
      
      // Add method call
      atc.addMethodCall({
        appID: appId,
        method: userTransferMethod,
        sender: senderAccount,
        suggestedParams: suggestedParams,
        methodArgs: [assetId, receiverAddress],
        signer
      });

      // Execute the transaction
      console.log("Executing user transfer transaction...");
      const result = await atc.execute(algodClient, 4);
      console.log("User transfer completed successfully:", result.txIDs);
      
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
        
        // Calculate minimum balance requirements
        const baseMinBalance = BigInt(100000); // 0.1 Algos base requirement
        const perAssetMinBalance = BigInt(100000); // 0.1 Algos per asset
        const feeBuffer = BigInt(10000); // 0.01 Algos for fees
        
        // Count existing assets managed by the contract
        const existingAssets = contractInfo.assets?.length || 0;
        const totalPerAssetMin = perAssetMinBalance * BigInt(existingAssets + 1); // Include the one we're about to create
        
        const targetBalance = baseMinBalance + totalPerAssetMin + feeBuffer;
        const minContractBalance = targetBalance;

        console.log(`Contract balance check:
          - Current balance: ${contractInfo.amount} microAlgos
          - Required minimum: ${minContractBalance} microAlgos
          - Base minimum: ${baseMinBalance} microAlgos
          - Per asset minimum: ${perAssetMinBalance} microAlgos
          - Fee buffer: ${feeBuffer} microAlgos
        `);

        if (BigInt(contractInfo.amount) < minContractBalance) {
          console.log(`Contract needs funding. Current balance: ${contractInfo.amount}, Required minimum: ${minContractBalance}`);
          
          // Calculate how much additional funding is needed (plus a small buffer)
          const fundingAmount = Number(targetBalance - BigInt(contractInfo.amount) + BigInt(50000)); // Add 0.05 Algos as buffer
          console.log(`Funding contract with ${fundingAmount} microAlgos`);
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
          
          // Get updated contract balance to verify funding
          const updatedContractInfo = await algodClient.accountInformation(appAddress).do();
          console.log(`Updated contract balance: ${updatedContractInfo.amount} microAlgos`);
          
          if (BigInt(updatedContractInfo.amount) < minContractBalance) {
            throw new Error(
              `Contract funding was not sufficient. Current balance: ${updatedContractInfo.amount}, ` +
              `Required minimum: ${minContractBalance}. Please try again.`
            );
          }
          
          // Add a small delay to ensure the funding transaction is fully processed
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log("Proceeding with title creation after successful funding");
        } else {
          // Verify the balance is still sufficient
          const currentBalance = BigInt(contractInfo.amount);
          if (currentBalance < minContractBalance) {
            throw new Error(
              `Contract balance ${currentBalance} is below required minimum ${minContractBalance}. ` +
              `Will attempt to fund on next try.`
            );
          }
          console.log("Contract has sufficient balance, no funding needed");
        }
      } catch (error) {
        console.error("Error checking or funding contract:", error);
        if (error instanceof Error) {
          // If the error was from our balance checks, we should stop
          if (error.message.includes('Contract funding was not sufficient') ||
              error.message.includes('Contract balance') ||
              error.message.includes('below required minimum')) {
            throw error;
          }
          // Log but continue for other types of errors
          console.log("Continuing despite error:", error.message);
        }
        // Continue for unknown errors, the transaction might still succeed
      }

      // Check if account is admin
      console.log("Checking admin authorization...");
      try {
        const appInfo = await algodClient.getApplicationByID(appId).do();
        const globalState = appInfo.params.globalState || [];
        // Get admin key bytes
        const adminKey = new TextEncoder().encode("admin");
        console.log("Admin key (hex):", Buffer.from(adminKey).toString('hex'));
        
        // Find admin state
        const adminState = globalState.find(state => {
          const stateKeyHex = Buffer.from(state.key).toString('hex');
          const adminKeyHex = Buffer.from(adminKey).toString('hex');
          console.log(`Comparing state key ${stateKeyHex} with admin key ${adminKeyHex}`);
          return stateKeyHex === adminKeyHex;
        });

        if (!adminState?.value?.bytes) {
          console.error("Admin state not found in global state");
          console.log("Available state keys:", globalState.map(state => Buffer.from(state.key).toString()));
          throw new Error("Admin address not found in application state");
        }

        const storedAdmin = algosdk.encodeAddress(adminState.value.bytes);
        console.log("Stored admin address:", storedAdmin);
        console.log("Current account:", account);
        
        if (storedAdmin !== account) {
          throw new Error("Account is not authorized as admin");
        }
        console.log("Admin authorization confirmed");
      } catch (error) {
        console.error("Error checking admin authorization:", error);
        throw new Error("Failed to verify admin authorization");
      }

      // Create the application call transaction
      console.log("Creating application call transaction...");
      
      const modifiedParams = {...suggestedParams};
      modifiedParams.fee = BigInt(1000); // Minimum fee in microAlgos
      modifiedParams.flatFee = true;
      
      console.log("Using modified params with explicit fee:", safeStringify(modifiedParams));
      
      // Create ABI contract instance
      const contractSpec = {
        name: "LandTitle",
        methods: [
          {
            name: "create_title",
            args: [
              { type: "string", name: "land_id" },
              { type: "string", name: "metadata_url" }
            ],
            returns: { type: "uint64" }
          }
        ]
      };

      const contract = new algosdk.ABIContract(contractSpec);
      const createTitleMethod = contract.getMethodByName("create_title");
      
      // Create AtomicTransactionComposer
      const atc = new algosdk.AtomicTransactionComposer();
      
      // Create a custom signer that wraps PeraWallet
      const signer = (txnGroup: algosdk.Transaction[]): Promise<Uint8Array[]> => {
        return peraWallet.signTransaction([
          txnGroup.map(txn => ({
            txn: txn,
            signers: [account]
          }))
        ]).then((signed: any) => Array.isArray(signed) ? signed.flat() : [signed]);
      };
      
      // Add method call with Pera Wallet signer
      atc.addMethodCall({
        appID: appId,
        method: createTitleMethod,
        sender: account,
        suggestedParams: modifiedParams,
        methodArgs: [landId, metadataUrl.replace('ipfs://', '')],
        signer
      });

      // Execute the transaction
      console.log("Executing transaction using AtomicTransactionComposer...");
      const result = await atc.execute(algodClient, 4);
      console.log("Transaction executed successfully");
      console.log("Transaction IDs:", result.txIDs);

      // Get the created asset ID from the transaction result
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, result.txIDs[0], 4);

      // AtomicTransactionComposer handles the signing and execution process
      // Now let's extract the asset ID from the confirmed transaction
      
      // Extract the created asset ID from the transaction
      const innerTxns = confirmedTxn.innerTxns || [];
      console.log("Inner transactions:", safeStringify(innerTxns));
      
      // Find the asset creation transaction
      let assetId = 0;
      
      // Attempt to extract asset ID from inner transactions
      for (const innerTxn of innerTxns) {
        const txnData = innerTxn as any;
        console.log("Processing inner transaction:", safeStringify(txnData));
        
        try {
          // First, check the direct assetIndex field (most common)
          if (txnData.assetIndex) {
            assetId = parseInt(txnData.assetIndex);
            console.log("Found asset ID in assetIndex field:", assetId);
            break;
          }

          // Check if this is an asset config transaction
          if (txnData.txn?.txn?.type === 'acfg') {
            // For asset creation, try different possible locations
            if (txnData.txn.txn.assetConfig?.assetIndex === "0") {
              // This is an asset creation transaction
              if (txnData.assetIndex) {
                assetId = parseInt(txnData.assetIndex);
                console.log("Found asset ID in asset creation response:", assetId);
                break;
              }
            }
            
            // Log asset config details for debugging
            console.log("Asset config details:", safeStringify(txnData.txn.txn.assetConfig));
          }
        } catch (error) {
          console.log("Error processing inner transaction:", error);
          console.log("Problematic transaction:", safeStringify(txnData));
        }
      }
      
      if (!assetId) {
        // Enhanced error handling with transaction analysis
        console.log("Asset ID not found in expected location");
        console.log("Full transaction details:", safeStringify(confirmedTxn));
        
        // Check if we have any inner transactions
        if (!innerTxns || innerTxns.length === 0) {
          throw new Error(
            'No inner transactions found in response. This may indicate the smart contract ' +
            'did not complete the asset creation. Please check the contract logs.'
          );
        }

        // Log all transaction types for debugging
        console.log("Inner transaction types:", innerTxns.map(txn => {
          const txnData = txn as any;
          return `${txnData.txn?.txn?.type || 'unknown'} (${txnData.txn?.txn?.assetIndex || 'no index'})`;
        }));

        throw new Error(
          'Could not find asset creation transaction in response. Transaction completed but ' +
          'asset creation may have failed. Please check the smart contract logs.'
        );
      }
      
      console.log("Successfully created asset with ID:", assetId);
      
      // Verify the asset with retries
      const maxRetries = 3;
      const retryDelay = 1000; // 1 second
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          console.log(`Attempting to verify asset ${assetId} (attempt ${i + 1}/${maxRetries})...`);
          const assetInfo = await indexerClient.lookupAssetByID(assetId).do();
          const params = assetInfo.asset.params;
          
          console.log("Asset verification result:", {
            found: {
              name: params.name,
              unitName: params.unitName,
              url: params.url,
              total: params.total,
              decimals: params.decimals,
              defaultFrozen: params.defaultFrozen
            },
            expected: {
              name: landId,
              url: metadataUrl.replace('ipfs://', '')
            }
          });
          
          if (params.name === landId && params.url === metadataUrl.replace('ipfs://', '')) {
            console.log("Asset verified successfully - all parameters match");
            return assetId;
          }
          
          console.log("Asset parameters don't match expectations, waiting before retry...");
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } catch (error) {
          console.log(`Verification attempt ${i + 1} failed:`, error);
          if (i < maxRetries - 1) {
            console.log(`Waiting ${retryDelay}ms before retrying...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
      
      // If we got here, return the asset ID but warn that verification failed
      console.log("Warning: Asset was created but verification failed or parameters didn't match");
      console.log("The asset may take a few seconds to appear correctly in the indexer");
      // Return the asset ID with warning status and explorer URLs
      const warningMsg = `Asset was created but verification is pending. ` +
                        `It may take a few seconds to appear in the indexer.\n` +
                        `Asset ID: ${assetId}\n` +
                        `Check the transaction: https://testnet.algoexplorer.io/tx/${result.txIDs[0]}\n` +
                        `Check the asset: https://testnet.algoexplorer.io/asset/${assetId}`;
      console.log(warningMsg);
      
      // Add some context to the returned error
      const err = new Error(warningMsg) as any;
      err.assetId = assetId;
      err.txnId = result.txIDs[0];
      err.status = 'PENDING_VERIFICATION';
      err.explorerUrls = {
        transaction: `https://testnet.algoexplorer.io/tx/${result.txIDs[0]}`,
        asset: `https://testnet.algoexplorer.io/asset/${assetId}`
      };
      throw err;
    } catch (error: unknown) {
      console.error("Error during transaction signing or sending:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        
        // Handle specific errors with more helpful messages
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('balance') && errorMsg.includes('below min')) {
          // Extract balance info from error message
          const currentBalance = errorMsg.match(/balance (\d+)/)?.[1];
          const requiredMin = errorMsg.match(/below min (\d+)/)?.[1];
          
          throw new Error(
            'The smart contract needs more funds to manage assets. ' +
            `Current balance: ${currentBalance || 'unknown'} microAlgos, ` +
            `Required: ${requiredMin || 'unknown'} microAlgos. ` +
            'Please try again - the contract will be funded automatically on the next attempt.'
          );
        } else if (error.message.includes('overspend') || error.message.includes('Insufficient funds')) {
          throw new Error(
            'Insufficient funds: Your wallet does not have enough Algos to pay the transaction fee. ' +
            'To fund your wallet, you can use the Algorand TestNet Dispenser at https://bank.testnet.algorand.network/ ' +
            'or request funds from the Algorand TestNet Discord.'
          );
        } else if (error.message.includes('TransactionPool.Remember')) {
          // Generic transaction rejection message
          throw new Error(
            'Transaction rejected by the network. This could be due to insufficient funds or other issues. ' +
            'Please ensure all accounts have sufficient balance and try again.'
          );
        } else if (error.message.includes('timeout') || error.message.includes('network') || error.message.includes('failed to fetch')) {
          throw new Error(
            'Network issue encountered while creating title. If you received an asset ID, you can verify the ' +
            'status manually at: https://testnet.algoexplorer.io/ \n' +
            'Please check your connection and try again if needed.'
          );
        }
      }
      throw new Error(`Failed to create title: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  // Legacy method for backward compatibility
  static async transferAsset(
    senderAccount: string,
    receiverAddress: string,
    assetId: number,
    peraWallet: any
  ): Promise<void> {
    return this.userTransferTitle(senderAccount, assetId, receiverAddress, peraWallet);
  }
}