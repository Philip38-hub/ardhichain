# ArdhiChain - Decentralized Land Registry

ArdhiChain is a decentralized land registry application built on the Algorand blockchain. It enables secure, transparent, and immutable land title management using NFTs (Non-Fungible Tokens).

## Features

- **Blockchain Security**: Land titles are secured by Algorand's blockchain technology
- **NFT-Based Titles**: Each land title is represented as a unique NFT
- **IPFS Storage**: Official documents are stored on IPFS via Nodely for decentralized access
- **Public Verification**: Anyone can verify land ownership using Asset IDs
- **Instant Transfers**: Transfer land ownership through atomic blockchain transactions
- **Admin Dashboard**: Authorized administrators can create new land title NFTs

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for development and building
- Tailwind CSS for styling
- React Router for navigation
- Pera Wallet integration
- Algorand SDK for blockchain interactions
- Axios for HTTP requests

### Smart Contract
- PyTEAL/Beaker framework
- Algorand Standard Assets (ASAs) for NFTs
- IPFS integration for metadata storage

### Blockchain & Storage
- Algorand TestNet
- Pera Wallet for user authentication
- AlgoNode API for blockchain access
- **Nodely IPFS** for decentralized file storage

## Project Structure

```
/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── context/           # React context providers
│   ├── services/          # API and blockchain services
│   └── types/             # TypeScript type definitions
├── smart_contract/        # PyTEAL smart contract
│   ├── app.py            # Main contract logic
│   ├── deploy.py         # Deployment script
│   └── requirements.txt  # Python dependencies
└── README.md
```

## Setup Instructions

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Python** (v3.8 or higher)
3. **Pera Wallet** (mobile app or browser extension)
4. **Nodely Account** (for IPFS storage)

### Frontend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env

   ```

3. **Configure environment variables**:
   ```env
   VITE_ADMIN_ADDRESS=your_admin_wallet_address
   VITE_APP_ID=your_deployed_contract_app_id
   VITE_ALGOD_NODE_URL=https://testnet-api.algonode.cloud
   VITE_INDEXER_URL=https://testnet-idx.algonode.cloud
   VITE_IPFS_GATEWAY_URL=https://ipfs.nodely.dev/ipfs/
   VITE_NODELY_API_URL=https://api.nodely.dev
   VITE_NODELY_API_KEY=your_nodely_api_key
   VITE_NODELY_PROJECT_ID=your_nodely_project_id
   ```

### Nodely IPFS Setup

1. **Create Nodely Account**:
   - Visit [Nodely.dev](https://nodely.dev)
   - Sign up for an account
   - Create a new project

2. **Get API Credentials**:
   - Navigate to your project dashboard
   - Copy your API Key
   - Copy your Project ID
   - Add these to your `.env` file

3. **API Endpoints Used**:
   - `POST /v1/upload` - File uploads
   - `POST /v1/upload/json` - JSON metadata uploads
   - `GET /v1/health` - Service health check
   - Gateway: `https://ipfs.nodely.dev/ipfs/{cid}` - Content retrieval

### Smart Contract Setup

1. **Navigate to smart contract directory**:
   ```bash
   cd smart_contract
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables for deployment**:
   ```bash
   export ADMIN_PRIVATE_KEY=your_admin_private_key
   ```

4. **Deploy the contract**:
   ```bash
   python deploy.py
   ```

5. **Update frontend .env with the deployed APP_ID**

### Running the Application

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open your browser** and navigate to `http://localhost:5173`

## Usage Guide

### For Administrators

1. **Connect Pera Wallet** with the admin address
2. **Navigate to Admin Dashboard**
3. **Fill out the land title form**:
   - Official Land ID
   - Location details
   - Area information
   - Municipality
   - Upload official document
4. **Submit** to create a new land title NFT

### For Land Owners

1. **Connect Pera Wallet**
2. **Navigate to "My Titles"** to view owned land titles
3. **Click on any title** to view details
4. **Use "Transfer Title"** to transfer ownership to another address

### For Public Verification

1. **Navigate to "Verify"** page (no wallet required)
2. **Enter the Asset ID** of the land title
3. **View complete property details** and ownership history

## Smart Contract Details

The ArdhiChain smart contract (`app.py`) implements:

- **Global State**: Stores the admin address
- **create_title()**: Creates new land title NFTs (admin only)
- **verify_record()**: Returns current owner of an asset (public)
- **Asset Configuration**: NFTs with unit name "ARDHI"

### Contract Security Features

- Admin-only creation of land titles
- Immutable asset parameters after creation
- Built-in ownership verification
- Integration with Algorand's native asset transfer mechanics

## IPFS Integration with Nodely

ArdhiChain uses Nodely IPFS for:

- **Document Storage**: Official land registry documents
- **Metadata Storage**: JSON files containing property details
- **Decentralized Access**: Documents remain accessible without central servers
- **Enhanced Performance**: Optimized gateway for faster retrieval

### Nodely Features Used

- **File Upload API**: Secure document uploads
- **JSON Upload API**: Structured metadata storage
- **Global Gateway**: Fast content delivery
- **Authentication**: API key-based security

### Error Handling

The application includes comprehensive error handling for:
- Invalid API credentials
- File size limitations
- Rate limiting
- Network timeouts
- Content not found errors

## Development

### Building for Production

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Testing the Smart Contract

The smart contract can be tested on Algorand TestNet. Make sure to:

1. Fund your admin account with TestNet ALGOs
2. Deploy the contract using the deployment script
3. Test all functionality through the frontend

## Troubleshooting

### Common Issues

1. **IPFS Upload Failures**:
   - Check Nodely API credentials
   - Verify file size limits
   - Ensure stable internet connection

2. **Content Retrieval Issues**:
   - Verify CID format
   - Check gateway availability
   - Try alternative IPFS gateways

3. **Authentication Errors**:
   - Confirm API key is correct
   - Check project ID matches
   - Verify account has sufficient credits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:

1. Check the existing GitHub issues
2. Create a new issue with detailed description
3. Include environment details and error messages

## Roadmap

- [ ] Multi-signature support for high-value transfers
- [ ] Integration with additional IPFS providers
- [ ] Mobile-first responsive design improvements
- [ ] Batch operations for administrators
- [ ] Advanced search and filtering
- [ ] Analytics dashboard
- [ ] Integration with real estate marketplaces

---

**ArdhiChain** - Securing land ownership through blockchain technology.