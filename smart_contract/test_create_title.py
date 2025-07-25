"""
Test script for creating a land title NFT using the ArdhiChain smart contract
"""

import os
import json
import base64
import time
from algosdk import account, mnemonic, encoding, logic
from algosdk.v2client import algod
from algosdk import transaction
from algosdk.atomic_transaction_composer import AtomicTransactionComposer, AccountTransactionSigner
from algosdk.abi import Contract, Method

# Configuration
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""
APP_ID = 741241349  # Updated to new contract ID
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

# Constants for minimum balance requirements
BASE_MIN_BALANCE = 100_000     # 0.1 ALGO minimum for account
MIN_BALANCE_PER_ASSET = 100_000  # 0.1 ALGO per asset
MIN_TXN_FEE = 1_000           # 0.001 ALGO
FUNDING_AMOUNT = 25_000       # 0.025 ALGO to fund contract

# ABI Contract Specification
contract_spec = {
    "name": "LandTitle",
    "methods": [
        {
            "name": "create_title",
            "args": [
                {"type": "string", "name": "land_id"},
                {"type": "string", "name": "metadata_url"}
            ],
            "returns": {"type": "uint64"}
        }
    ]
}

def retry_with_backoff(func, *args, **kwargs):
    """Retry a function with exponential backoff"""
    for i in range(MAX_RETRIES):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if i == MAX_RETRIES - 1:  # Last attempt
                raise
            wait_time = (RETRY_DELAY * (2 ** i)) + (0.1 * i)  # Exponential backoff
            print(f"Attempt {i+1} failed. Retrying in {wait_time:.1f} seconds...")
            time.sleep(wait_time)

def check_account_balance(algod_client, address, min_balance):
    """Check if account has sufficient balance"""
    account_info = algod_client.account_info(address)
    balance = account_info.get('amount', 0)
    asset_count = len(account_info.get('assets', []))
    
    # Calculate total minimum required including base minimum
    total_min = BASE_MIN_BALANCE + (asset_count * MIN_BALANCE_PER_ASSET) + min_balance
    
    if balance < total_min:
        raise Exception(
            f"Insufficient balance. Have: {balance/1_000_000:.6f} ALGO, "
            f"Need: {total_min/1_000_000:.6f} ALGO "
            f"(Base min: {BASE_MIN_BALANCE/1_000_000:.6f}, "
            f"Assets min: {(asset_count * MIN_BALANCE_PER_ASSET)/1_000_000:.6f}, "
            f"Operation min: {min_balance/1_000_000:.6f})"
        )
    return balance

def fund_contract_account(algod_client, app_id, admin_private_key):
    """Fund the contract account with ALGOs"""
    app_address = logic.get_application_address(app_id)
    admin_address = account.address_from_private_key(admin_private_key)
    
    # Calculate required balances for operations
    operation_cost = (
        FUNDING_AMOUNT +        # Amount to send to contract
        MIN_TXN_FEE * 3        # Fees for funding + create + opt-in
    )
    
    # Check admin balance including base minimum and operation cost
    balance = check_account_balance(algod_client, admin_address, operation_cost)
    print(f"Admin account balance: {balance/1_000_000:.6f} ALGO")
    print(f"Operation cost: {operation_cost/1_000_000:.6f} ALGO")
    
    print(f"Funding contract account {app_address}...")
    params = retry_with_backoff(algod_client.suggested_params)
    
    txn = transaction.PaymentTxn(
        sender=admin_address,
        receiver=app_address,
        amt=FUNDING_AMOUNT,
        sp=params
    )
    
    signed_txn = txn.sign(admin_private_key)
    tx_id = retry_with_backoff(algod_client.send_transaction, signed_txn)
    print(f"Funding transaction ID: {tx_id}")
    
    # Wait for confirmation
    def wait_for_confirmation():
        return transaction.wait_for_confirmation(algod_client, tx_id, 4)
    confirmed_txn = retry_with_backoff(wait_for_confirmation)
    print("Funding transaction confirmed in round:", confirmed_txn["confirmed-round"])

def find_asset_id_in_transaction(algod_client, tx_id):
    """Find the created asset ID in a transaction's inner transactions"""
    try:
        tx_info = algod_client.pending_transaction_info(tx_id)
        print(f"\nTransaction info: {json.dumps(tx_info, indent=2)}")
        
        if "inner-txns" in tx_info:
            for inner_tx in tx_info["inner-txns"]:
                print(f"\nInner transaction: {json.dumps(inner_tx, indent=2)}")
                asset_index = inner_tx.get("asset-index")
                if asset_index:
                    return asset_index
        return None
    except Exception as e:
        print(f"Error inspecting transaction: {e}")
        return None

def test_create_title():
    """Test creating a new land title NFT"""
    
    # Initialize Algod client
    algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS, headers={"User-Agent": "ArdhiChain/1.0"})
    
    # Get admin account from environment variable
    admin_private_key = os.getenv('ADMIN_PRIVATE_KEY')
    if not admin_private_key:
        print("Error: ADMIN_PRIVATE_KEY environment variable not set")
        return
    
    # Get the admin address
    admin_address = account.address_from_private_key(admin_private_key)
    print(f"Using admin address: {admin_address}")
    
    try:
        # Step 1: Fund the contract account
        fund_contract_account(algod_client, APP_ID, admin_private_key)
        
        # Step 2: Create the NFT through smart contract
        print("\nCreating NFT...")
        print("Preparing transaction arguments...")
        
        # Initialize ABI contract and get method
        contract = Contract.from_json(json.dumps(contract_spec))
        create_title_method = contract.get_method_by_name("create_title")
        
        # Create atomic transaction composer
        atc = AtomicTransactionComposer()
        signer = AccountTransactionSigner(admin_private_key)
        
        # Add create_title method call
        sp = retry_with_backoff(algod_client.suggested_params)
        
        atc.add_method_call(
            app_id=APP_ID,
            method=create_title_method,
            sender=admin_address,
            sp=sp,
            signer=signer,
            method_args=["TEST-PLOT-001", "ipfs://QmTest123"]
        )
        
        # Execute transaction with retry
        print("Executing transaction...")
        def execute_transaction():
            return atc.execute(algod_client, 4)
        result = retry_with_backoff(execute_transaction)
        
        print(f"Transaction executed. ID: {result.tx_ids[0]}")
        print(f"ABI Results: {result.abi_results}")
        
        # Try to get asset ID from transaction info
        asset_id = None
        
        if result.abi_results:
            # First try from ABI results
            asset_id = result.abi_results[0].return_value
            
        if not asset_id:
            # Try to find in transaction info
            asset_id = find_asset_id_in_transaction(algod_client, result.tx_ids[0])
            
        if not asset_id:
            raise Exception("Could not determine created asset ID")
            
        print(f"Success! Asset ID: {asset_id}")
        
        # Verify admin has enough balance for opt-in
        print("\nChecking balance for opt-in...")
        operation_cost = MIN_TXN_FEE
        check_account_balance(algod_client, admin_address, operation_cost)
        
        # Step 3: Opt-in to the asset
        print("\nOpting in to the asset...")
        params = retry_with_backoff(algod_client.suggested_params)
        opt_in_txn = transaction.AssetOptInTxn(
            sender=admin_address,
            sp=params,
            index=asset_id
        )
        
        signed_opt_in = opt_in_txn.sign(admin_private_key)
        tx_id = retry_with_backoff(algod_client.send_transaction, signed_opt_in)
        print(f"Opt-in Transaction ID: {tx_id}")
        
        # Wait for opt-in confirmation
        def wait_for_opt_in():
            return transaction.wait_for_confirmation(algod_client, tx_id, 4)
        confirmed_txn = retry_with_backoff(wait_for_opt_in)
        print("Opt-in confirmed!")
        
        print("\nLand title NFT setup completed successfully!")
        print(f"Asset ID: {asset_id}")
            
    except Exception as e:
        print(f"Error creating land title: {str(e)}")
        if hasattr(e, '__cause__') and e.__cause__:
            print(f"Caused by: {str(e.__cause__)}")

if __name__ == "__main__":
    test_create_title()