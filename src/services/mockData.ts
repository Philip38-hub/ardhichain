import { LandTitle } from '../types';

export const DEMO_TITLES: LandTitle[] = [
  {
    assetId: 999001,
    landId: 'LR/2024/001',
    location: 'Westlands, Plot 123, Nairobi',
    area: '0.5 acres',
    municipality: 'Nairobi City County',
    documentHash: 'QmDemo1Hash123456789',
    metadataUrl: 'ipfs://QmDemo1Metadata123456789',
    owner: 'DEMO_ACCOUNT',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    assetId: 999002,
    landId: 'LR/2024/002',
    location: 'Karen, Plot 456, Nairobi',
    area: '1.2 acres',
    municipality: 'Nairobi City County',
    documentHash: 'QmDemo2Hash987654321',
    metadataUrl: 'ipfs://QmDemo2Metadata987654321',
    owner: 'DEMO_ACCOUNT',
    createdAt: '2024-02-20T14:45:00Z'
  },
  {
    assetId: 999003,
    landId: 'LR/2024/003',
    location: 'Kilimani, Plot 789, Nairobi',
    area: '0.8 acres',
    municipality: 'Nairobi City County',
    documentHash: 'QmDemo3Hash456789123',
    metadataUrl: 'ipfs://QmDemo3Metadata456789123',
    owner: 'DEMO_ACCOUNT',
    createdAt: '2024-03-10T09:15:00Z'
  },
  {
    assetId: 999004,
    landId: 'LR/2024/004',
    location: 'Runda, Plot 321, Nairobi',
    area: '2.1 acres',
    municipality: 'Nairobi City County',
    documentHash: 'QmDemo4Hash789123456',
    metadataUrl: 'ipfs://QmDemo4Metadata789123456',
    owner: 'DEMO_ACCOUNT',
    createdAt: '2024-03-25T16:20:00Z'
  },
  {
    assetId: 999005,
    landId: 'LR/2024/005',
    location: 'Muthaiga, Plot 654, Nairobi',
    area: '1.5 acres',
    municipality: 'Nairobi City County',
    documentHash: 'QmDemo5Hash321654987',
    metadataUrl: 'ipfs://QmDemo5Metadata321654987',
    owner: 'DEMO_ACCOUNT',
    createdAt: '2024-04-05T11:30:00Z'
  }
];

export const isDemoMode = (): boolean => {
  const demoMode = import.meta.env.VITE_DEMO_MODE;
  console.log('Demo mode environment variable:', demoMode);
  console.log('Demo mode type:', typeof demoMode);
  console.log('All environment variables:', import.meta.env);
  
  // Check for various truthy values
  return demoMode === 'true' || demoMode === true || demoMode === '1';
};

export const getDemoTitlesForAccount = (account: string): LandTitle[] => {
  console.log('getDemoTitlesForAccount called with account:', account);
  console.log('isDemoMode():', isDemoMode());
  
  if (!isDemoMode()) {
    console.log('Demo mode is disabled, returning empty array');
    return [];
  }
  
  console.log('Demo mode is enabled, returning demo titles');
  return DEMO_TITLES.map(title => ({
    ...title,
    owner: account
  }));
};