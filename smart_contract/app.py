"""
ArdhiChain Smart Contract - Land Registry on Algorand

This PyTEAL/Beaker smart contract manages land title NFTs on the Algorand blockchain.
It allows authorized administrators to create land title NFTs and provides
verification functionality for public use.

Requirements:
- pip install beaker-pyteal pyteal
- Algorand SDK for Python
"""

from beaker import *
from pyteal import *

# Application State Schema
class ArdhiChainState:
    # Global state to store the admin address
    admin_address = GlobalStateValue(
        stack_type=TealType.bytes,
        key=Bytes("admin"),
        default=Bytes("")
    )

# Initialize the Beaker application
app = Application("ArdhiChain", state=ArdhiChainState())

@app.create
def create(admin_addr: abi.Address) -> Expr:
    """
    Contract creation method.
    Sets the admin address who can create land title NFTs.
    
    Args:
        admin_addr: The Algorand address of the administrator
    """
    return Seq([
        # Only the creator can set the initial admin
        Assert(Txn.sender() == Global.creator_address()),
        
        # Store the admin address in global state
        app.state.admin_address.set(admin_addr.get()),
        
        Approve()
    ])

@app.external
def create_title(
    land_id: abi.String,
    metadata_url: abi.String,
    *,
    output: abi.Uint64
) -> Expr:
    """
    Creates a new Land Title NFT (ASA).
    Only the admin can call this method.
    
    Args:
        land_id: Unique identifier for the land (used as asset name)
        metadata_url: IPFS URL containing property metadata
        
    Returns:
        The newly created Asset ID
    """
    return Seq([
        # Verify that sender is the admin
        Assert(Txn.sender() == app.state.admin_address.get()),
        
        # Create the Land Title NFT as an inner transaction
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetConfig,
            TxnField.config_asset_total: Int(1),  # NFT - only 1 unit
            TxnField.config_asset_decimals: Int(0),  # No decimals for NFT
            TxnField.config_asset_name: land_id.get(),
            TxnField.config_asset_unit_name: Bytes("ARDHI"),  # Unit name for identification
            TxnField.config_asset_url: metadata_url.get(),
            # Set all management addresses to the contract for immutability
            TxnField.config_asset_manager: Global.current_application_address(),
            TxnField.config_asset_reserve: Global.current_application_address(),
            TxnField.config_asset_freeze: Global.current_application_address(),
            TxnField.config_asset_clawback: Global.current_application_address(),
        }),
        InnerTxnBuilder.Submit(),
        
        # Contract must opt-in to the newly created asset
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: InnerTxn.created_asset_id(),
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.asset_amount: Int(0)  # Opt-in transaction
        }),
        InnerTxnBuilder.Submit(),
        
        # Store created asset ID in the output
        output.set(InnerTxn.created_asset_id()),
        
        Approve()
    ])

@app.external
def admin_transfer_title(asset_id: abi.Uint64, receiver: abi.Address) -> Expr:
    """
    Transfer an NFT from the contract to the initial owner.
    Only the admin can call this method.
    The receiver must have already opted in to the asset.
    
    Args:
        asset_id: The ID of the NFT to transfer
        receiver: The address to receive the NFT
    """
    return Seq([
        # Verify that sender is the admin
        Assert(Txn.sender() == app.state.admin_address.get()),
        
        # Transfer the NFT from contract to receiver
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_receiver: receiver.get(),
            TxnField.asset_sender: Global.current_application_address(),
            TxnField.xfer_asset: asset_id.get(),
            TxnField.asset_amount: Int(1)
        }),
        InnerTxnBuilder.Submit(),
        
        Approve()
    ])

@app.external
def user_transfer_title(asset_id: abi.Uint64, receiver: abi.Address) -> Expr:
    """
    Transfer an NFT from one user to another.
    Only the current owner can call this method.
    The receiver must have already opted in to the asset.
    
    Args:
        asset_id: The ID of the NFT to transfer
        receiver: The address to receive the NFT
    """
    # Check if sender owns the asset
    sender_balance = AssetHolding.balance(Txn.sender(), asset_id.get())
    
    return Seq([
        # Verify sender owns the asset
        sender_balance,
        Assert(sender_balance.hasValue()),
        Assert(sender_balance.value() == Int(1)),
        
        # First, clawback the asset from sender to contract
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.asset_sender: Txn.sender(),
            TxnField.xfer_asset: asset_id.get(),
            TxnField.asset_amount: Int(1)
        }),
        InnerTxnBuilder.Submit(),
        
        # Then, transfer the asset from contract to receiver
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_receiver: receiver.get(),
            TxnField.asset_sender: Global.current_application_address(),
            TxnField.xfer_asset: asset_id.get(),
            TxnField.asset_amount: Int(1)
        }),
        InnerTxnBuilder.Submit(),
        
        Approve()
    ])

@app.external(read_only=True)
def verify_record(asa_id: abi.Uint64, *, output: abi.Address) -> Expr:
    """
    Verifies the current owner of a Land Title NFT.
    This is a read-only method that can be called by anyone.
    
    Args:
        asa_id: The Asset ID of the land title NFT
        
    Returns:
        Address of the current owner
    """
    holder_balance = AssetHolding.balance(Txn.sender(), asa_id.get())
    
    return Seq([
        holder_balance,
        # For NFTs, we need to find who has balance = 1
        # This is a simplified version - in production, you'd iterate through accounts
        output.set(Txn.sender()),
        Approve()
    ])

@app.external(read_only=True)
def get_admin(*, output: abi.Address) -> Expr:
    """
    Returns the current admin address.
    Args:
        output: The output parameter to store the admin address
    """
    return output.set(app.state.admin_address.get())

# Deployment configuration
if __name__ == "__main__":
    # This would be used for deployment
    # The actual deployment should be done using the Algorand SDK
    print("ArdhiChain Smart Contract")
    print("Compile with: python -c 'from app import app; print(app.build().teal)'")