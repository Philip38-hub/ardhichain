import algosdk from 'algosdk';
import { PropertyMetadata } from '../types';

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
      const suggestedParams = await algodClient.getTransactionParams().do();
      const appId = parseInt(import.meta.env.VITE_APP_ID);
      
      // Create application call transaction
      const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: account,
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
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      // Get the created asset ID from the transaction
      const confirmedTxn = await algodClient.pendingTransactionInformation(txId).do();
      const assetId = confirmedTxn['inner-txns']?.[0]?.['created-asset-index'];
      
      return assetId;
    } catch (error) {
      console.error('Error creating title:', error);
      throw error;
    }
  }

  static async transferAsset(
    from: string,
    to: string,
    assetId: number,
    peraWallet: any
  ): Promise<string> {
    try {
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Create asset transfer transaction
      const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from,
        to,
        assetIndex: assetId,
        amount: 1,
        suggestedParams
      });

      const signedTxn = await peraWallet.signTransaction([transferTxn]);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      return txId;
    } catch (error) {
      console.error('Error transferring asset:', error);
      throw error;
    }
  }

  static async optInToAsset(
    account: string,
    assetId: number,
    peraWallet: any
  ): Promise<string> {
    try {
      const suggestedParams = await algodClient.getTransactionParams().do();

      const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: account,
        to: account,
        assetIndex: assetId,
        amount: 0,
        suggestedParams
      });

      const signedTxn = await peraWallet.signTransaction([optInTxn]);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      return txId;
    } catch (error) {
      console.error('Error opting in to asset:', error);
      throw error;
    }
  }
}