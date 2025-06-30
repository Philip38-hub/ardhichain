#!/bin/bash

# Set the mnemonic as a single line
MNEMONIC="imitate slam defense payment file fatigue flame hurry shop play wagon practice where gas load differ lens violin metal general hope friend immense about brand"
export ADMIN_ADDRESS="WYNQNDD3J5NEG55MOZ5RTGV45NTTHU5CACZ2QJ4EJNHDWINSYG2LFCBPWE"

# Derive private key from mnemonic using Python
export ADMIN_PRIVATE_KEY=$(python3 -c '
from algosdk import mnemonic
import os, sys

private_key = mnemonic.to_private_key(sys.argv[1])
print(private_key)
' "$MNEMONIC")

# Run the deployment script
python deploy.py

# Clear sensitive environment variables
unset MNEMONIC
unset ADMIN_ADDRESS
unset ADMIN_PRIVATE_KEY
