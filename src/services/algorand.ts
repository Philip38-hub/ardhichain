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
        }
      }
      throw new Error(`Failed to create title: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
