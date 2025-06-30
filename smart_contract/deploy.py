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
from algosdk import account, mnemonic, encoding
from algosdk.v2client import algod
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
    
    # Get admin address
    admin_address = account.address_from_private_key(admin_private_key)
    print(f"Deploying contract with admin address: {admin_address}")
    
    # Get the contract TEAL source
    app_spec = app.build()
    
    try:
        # Compile TEAL programs
        print("Compiling approval program...")
        approval_result = algod_client.compile(app_spec.approval_program)
        approval_bytes = base64.b64decode(approval_result["result"])
        
        print("Compiling clear program...")
        clear_result = algod_client.compile(app_spec.clear_program)
        clear_bytes = base64.b64decode(clear_result["result"])
        
        # Get suggested transaction parameters
        print("Getting network parameters...")
        params = algod_client.suggested_params()
        
        # Create unsigned transaction
        print("Creating deployment transaction...")
        txn = transaction.ApplicationCreateTxn(
            sender=admin_address,
            sp=params,
            on_complete=transaction.OnComplete.NoOpOC,
            approval_program=approval_bytes,
            clear_program=clear_bytes,
            global_schema=transaction.StateSchema(num_uints=0, num_byte_slices=1),
            local_schema=transaction.StateSchema(num_uints=0, num_byte_slices=0),
            app_args=[
                bytes.fromhex("cc694eaa"),  # Method selector for create(address)void
                encoding.decode_address(admin_address)  # admin_addr argument
            ]
        )
        
        # Sign transaction
        print("Signing transaction...")
        signed_txn = txn.sign(admin_private_key)
        
        # Send transaction
        print("Sending transaction...")
        tx_id = algod_client.send_transaction(signed_txn)
        print(f"Transaction ID: {tx_id}")
        
        # Wait for confirmation
        print("Waiting for confirmation...")
        confirmed_txn = transaction.wait_for_confirmation(algod_client, tx_id, 4)
        
        # Get application ID
        app_id = confirmed_txn["application-index"]
        print(f"\nContract deployed successfully!")
        print(f"Application ID: {app_id}")
        print(f"\nAdd this to your .env file: VITE_APP_ID={app_id}")
        return app_id
        
    except Exception as e:
        print(f"Error deploying contract: {str(e)}")
        return None

if __name__ == "__main__":
    deploy_contract()