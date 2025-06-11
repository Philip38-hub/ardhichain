import axios from 'axios';
import { IPFSProvider, UploadOptions } from './IPFSProvider';

export class NodelyProvider implements IPFSProvider {
  private readonly apiUrl: string;
  private readonly gatewayUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_NODELY_API_URL || 'https://api.nodely.io';
    this.gatewayUrl = import.meta.env.VITE_NODELY_GATEWAY_URL || 'https://gateway.nodely.io/ipfs/';
    this.apiKey = import.meta.env.VITE_NODELY_API_KEY;

    if (!this.apiKey) {
      throw new Error('Nodely API key not configured');
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/v1/auth/test`, {
        headers: this.getHeaders()
      });
      return response.status === 200;
    } catch (error) {
      console.error('Nodely connection validation failed:', error);
      return false;
    }
  }

  async uploadFile(file: File, options?: UploadOptions): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata if provided
    if (options?.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/api/v1/upload`,
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

      return response.data.cid || response.data.hash;
    } catch (error) {
      console.error('Error uploading file to Nodely:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  async uploadJSON(data: any, options?: UploadOptions): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/api/v1/upload/json`,
        data,
        {
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.cid || response.data.hash;
    } catch (error) {
      console.error('Error uploading JSON to Nodely:', error);
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
      console.error('Error fetching JSON from Nodely:', error);
      throw new Error('Failed to fetch JSON from IPFS');
    }
  }

  getFileUrl(cid: string): string {
    return `${this.gatewayUrl}${cid}`;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-API-Key': this.apiKey
    };
  }
}