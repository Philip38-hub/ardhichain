"""
Deployment script for ArdhiChain Smart Contract

This script deploys the ArdhiChain smart contract to Algorand TestNet.
Make sure to set up your environment variables and install required packages:

pip install py-algorand-sdk beaker-pyteal

Environment variables needed:
- ADMIN_PRIVATE_KEY: Private key of the admin account
- ALGOD_TOKEN: Algorand node token (empty string for public nodes)
- ALGOD_ADDRESS: Algorand node URL
"""

import os
import base64
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import ApplicationCreateTxn, OnComplete, StateSchema
from algosdk import transaction
from app import app

# Configuration
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""

def deploy_contract():
    """Deploy the ArdhiChain smart contract to TestNet"""
    
    # Initialize Algod client
    algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
    
    # Get admin account from environment
    admin_private_key = os.getenv('ADMIN_PRIVATE_KEY')
    if not admin_private_key:
        print("Error: ADMIN_PRIVATE_KEY environment variable not set")
        return
    
    admin_address = account.address_from_private_key(admin_private_key)
    print(f"Deploying contract with admin address: {admin_address}")
    
    # Compile the contract
    approval_program = app.build().approval_program
    clear_program = app.build().clear_program
    
    # Define schema
    global_schema = StateSchema(num_uints=0, num_byte_slices=1)  # admin_address
    local_schema = StateSchema(num_uints=0, num_byte_slices=0)   # No local state
    
    # Get transaction parameters
    params = algod_client.suggested_params()
    
    # Create application creation transaction
    txn = ApplicationCreateTxn(
        sender=admin_address,
        sp=params,
        on_complete=OnComplete.NoOpOC.real,
        approval_program=approval_program,
        clear_program=clear_program,
        global_schema=global_schema,
        local_schema=local_schema,
        app_args=[admin_address.encode()]  # Pass admin address as argument
    )
    
    # Sign transaction
    signed_txn = txn.sign(admin_private_key)
    
    # Submit transaction
    tx_id = algod_client.send_transaction(signed_txn)
    print(f"Transaction ID: {tx_id}")
    
    # Wait for confirmation
    confirmed_txn = transaction.wait_for_confirmation(algod_client, tx_id, 4)
    
    # Get application ID
    app_id = confirmed_txn["application-index"]
    print(f"Contract deployed successfully!")
    print(f"Application ID: {app_id}")
    print(f"Add this to your .env file: VITE_APP_ID={app_id}")
    
    return app_id

if __name__ == "__main__":
    deploy_contract()