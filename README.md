# ArdhiChain - Decentralized Land Registry

ArdhiChain is a decentralized land registry application built on the Algorand blockchain. It enables secure, transparent, and immutable land title management using NFTs (Non-Fungible Tokens).

## Features

- **Blockchain Security**: Land titles are secured by Algorand's blockchain technology
- **NFT-Based Titles**: Each land title is represented as a unique NFT
- **IPFS Storage**: Official documents are stored on IPFS for decentralized access
- **Multi-Provider Support**: Supports both Pinata and Nodely IPFS providers
- **Public Verification**: Anyone can verify land ownership using Asset IDs
- **Instant Transfers**: Transfer land ownership through atomic blockchain transactions
- **Admin Dashboard**: Authorized administrators can create new land title NFTs
- **Migration Tools**: Built-in tools for migrating between IPFS providers

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

### Blockchain
- Algorand TestNet
- Pera Wallet for user authentication
- AlgoNode API for blockchain access

### IPFS Providers
- **Pinata**: Legacy provider with full support
- **Nodely**: New provider with enhanced features
- **Dual Support**: Seamless switching between providers

## Project Structure

```
/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   │   └── admin/         # Admin-specific components
│   ├── context/           # React context providers
│   ├── services/          # API and blockchain services
│   │   └── ipfs/          # IPFS provider architecture
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
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
4. **IPFS Provider Account** (Pinata or Nodely)

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
   # Basic Configuration
   VITE_ADMIN_ADDRESS=your_admin_wallet_address
   VITE_APP_ID=your_deployed_contract_app_id
   VITE_ALGOD_NODE_URL=https://testnet-api.algonode.cloud
   VITE_INDEXER_URL=https://testnet-idx.algonode.cloud

   # IPFS Provider Selection
   VITE_IPFS_PROVIDER=pinata  # or 'nodely'

   # Pinata Configuration (if using Pinata)
   VITE_IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/
   VITE_PINATA_API_KEY=your_pinata_api_key
   VITE_PINATA_SECRET_KEY=your_pinata_secret_key

   # Nodely Configuration (if using Nodely)
   VITE_NODELY_API_URL=https://api.nodely.io
   VITE_NODELY_GATEWAY_URL=https://gateway.nodely.io/ipfs/
   VITE_NODELY_API_KEY=your_nodely_api_key
   ```

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

## IPFS Provider Migration

ArdhiChain supports seamless migration between IPFS providers. The application includes built-in tools for migrating content from Pinata to Nodely or vice versa.

### Migration Features

- **Dual Provider Support**: Run both providers simultaneously during migration
- **Batch Migration**: Process large numbers of files in manageable batches
- **Progress Tracking**: Monitor migration progress with detailed reporting
- **Validation**: Verify content integrity after migration
- **Rollback Support**: Revert to previous provider if issues occur

### Using the Migration Dashboard

1. **Access Admin Dashboard**: Connect with admin wallet and navigate to Admin → Migration
2. **Configure Migration**: Select source and target providers
3. **Add CIDs**: Enter the CIDs you want to migrate (one per line)
4. **Start Migration**: Click "Start Migration" to begin the process
5. **Monitor Progress**: View real-time progress and validation results

### Programmatic Migration

For large-scale migrations, use the programmatic interface:

```typescript
import { ContentMigrator } from './src/services/ipfs';

const migrator = new ContentMigrator('pinata', 'nodely');
const report = await migrator.migrateAllContent(['QmExample1...', 'QmExample2...']);
console.log(`Migration completed: ${report.successCount}/${report.totalItems} successful`);
```

### Provider Health Monitoring

The Admin Dashboard includes a health check feature that monitors:
- Provider connectivity
- Response times
- Error rates
- Service availability

## Usage Guide

### For Administrators

1. **Connect Pera Wallet** with the admin address
2. **Navigate to Admin Dashboard**
3. **Create Land Titles**:
   - Fill out the land title form
   - Upload official document
   - Submit to create NFT
4. **Manage IPFS Infrastructure**:
   - Monitor provider health
   - Migrate content between providers
   - Validate data integrity

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

## IPFS Integration

ArdhiChain uses IPFS for:

- **Document Storage**: Official land registry documents
- **Metadata Storage**: JSON files containing property details
- **Decentralized Access**: Documents remain accessible without central servers
- **Provider Flexibility**: Support for multiple IPFS providers

### Supported Providers

#### Pinata
- Established IPFS provider
- Reliable gateway network
- Comprehensive API

#### Nodely
- Modern IPFS provider
- Enhanced performance
- Cost-effective pricing

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

## Migration Best Practices

1. **Test First**: Always test migration with a small subset of content
2. **Backup Data**: Ensure all content is backed up before migration
3. **Monitor Progress**: Use the built-in monitoring tools
4. **Validate Results**: Verify content integrity after migration
5. **Gradual Rollout**: Switch providers gradually to minimize risk

## Troubleshooting

### Common Issues

1. **Provider Connection Errors**: Check API keys and network connectivity
2. **Migration Failures**: Verify source content accessibility
3. **Upload Errors**: Check file size limits and formats
4. **Wallet Connection**: Ensure Pera Wallet is properly configured

### Error Recovery

1. **Use Health Check**: Monitor provider status regularly
2. **Check Logs**: Review browser console for detailed error messages
3. **Retry Operations**: Most operations can be safely retried
4. **Contact Support**: Reach out to provider support if issues persist

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

- [x] Multi-provider IPFS support
- [x] Migration tools and dashboard
- [x] Health monitoring
- [ ] Multi-signature support for high-value transfers
- [ ] Integration with additional IPFS providers
- [ ] Mobile-first responsive design improvements
- [ ] Batch operations for administrators
- [ ] Advanced search and filtering
- [ ] Analytics dashboard
- [ ] Integration with real estate marketplaces

---

**ArdhiChain** - Securing land ownership through blockchain technology with flexible IPFS infrastructure.