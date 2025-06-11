import axios from 'axios';
import { IPFSProvider, UploadOptions } from './IPFSProvider';

export class PinataProvider implements IPFSProvider {
  private readonly apiUrl = 'https://api.pinata.cloud';
  private readonly gatewayUrl: string;
  private readonly apiKey: string;
  private readonly secretKey: string;

  constructor() {
    this.gatewayUrl = import.meta.env.VITE_IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/';
    this.apiKey = import.meta.env.VITE_PINATA_API_KEY;
    this.secretKey = import.meta.env.VITE_PINATA_SECRET_KEY;

    if (!this.apiKey || !this.secretKey) {
      throw new Error('Pinata API credentials not configured');
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/data/testAuthentication`, {
        headers: this.getHeaders()
      });
      return response.status === 200;
    } catch (error) {
      console.error('Pinata connection validation failed:', error);
      return false;
    }
  }

  async uploadFile(file: File, options?: UploadOptions): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        type: 'document',
        ...options?.metadata
      }
    });
    formData.append('pinataMetadata', metadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 1
    });
    formData.append('pinataOptions', pinataOptions);

    try {
      const response = await axios.post(
        `${this.apiUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            if (options?.onProgress && progressEvent.total) {
              options.onProgress({
                loaded: progressEvent.loaded,
                total: progressEvent.total,
                percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
              });
            }
          }
        }
      );

      return response.data.IpfsHash;
    } catch (error) {
      console.error('Error uploading file to Pinata:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  async uploadJSON(data: any, options?: UploadOptions): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/pinning/pinJSONToIPFS`,
        data,
        {
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.IpfsHash;
    } catch (error) {
      console.error('Error uploading JSON to Pinata:', error);
      throw new Error('Failed to upload JSON to IPFS');
    }
  }

  async fetchJSON(cid: string): Promise<any> {
    try {
      const url = this.getFileUrl(cid);
      const response = await axios.get(url, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching JSON from Pinata:', error);
      throw new Error('Failed to fetch JSON from IPFS');
    }
  }

  getFileUrl(cid: string): string {
    return `${this.gatewayUrl}${cid}`;
  }

  private getHeaders() {
    return {
      'pinata_api_key': this.apiKey,
      'pinata_secret_api_key': this.secretKey
    };
  }
}