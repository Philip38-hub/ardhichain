import axios from 'axios';
import { PropertyMetadata } from '../types';

export class IPFSService {
  private static readonly NODELY_API_URL = import.meta.env.VITE_NODELY_API_URL;
  private static readonly GATEWAY_URL = import.meta.env.VITE_IPFS_GATEWAY_URL;
  private static readonly API_KEY = import.meta.env.VITE_NODELY_API_KEY;
  private static readonly PROJECT_ID = import.meta.env.VITE_NODELY_PROJECT_ID;

  private static getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.API_KEY}`,
      'X-Project-ID': this.PROJECT_ID,
    };
  }

  static async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    formData.append('description', `ArdhiChain document: ${file.name}`);

    try {
      const response = await axios.post(
        `${this.NODELY_API_URL}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...this.getAuthHeaders()
          },
          timeout: 30000 // 30 second timeout for large files
        }
      );

      // Nodely typically returns the hash in response.data.hash or response.data.cid
      return response.data.hash || response.data.cid || response.data.ipfsHash;
    } catch (error) {
      console.error('Error uploading file to Nodely IPFS:', error);
      
      // Enhanced error handling
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid Nodely API credentials. Please check your API key.');
        } else if (error.response?.status === 413) {
          throw new Error('File too large. Please reduce file size and try again.');
        } else if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please wait and try again.');
        }
      }
      
      throw new Error('Failed to upload file to IPFS. Please try again.');
    }
  }

  static async uploadJSON(metadata: PropertyMetadata): Promise<string> {
    try {
      const response = await axios.post(
        `${this.NODELY_API_URL}/upload/json`,
        {
          name: `ArdhiChain-${metadata.land_id}-metadata.json`,
          description: `Metadata for land title: ${metadata.land_id}`,
          content: metadata
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders()
          },
          timeout: 15000 // 15 second timeout for JSON uploads
        }
      );

      return response.data.hash || response.data.cid || response.data.ipfsHash;
    } catch (error) {
      console.error('Error uploading JSON to Nodely IPFS:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid Nodely API credentials. Please check your API key.');
        } else if (error.response?.status === 422) {
          throw new Error('Invalid metadata format. Please check your data.');
        }
      }
      
      throw new Error('Failed to upload metadata to IPFS. Please try again.');
    }
  }

  static async fetchJSON(cid: string): Promise<PropertyMetadata> {
    try {
      const url = `${this.GATEWAY_URL}${cid}`;
      const response = await axios.get(url, {
        timeout: 10000, // 10 second timeout for retrieval
        headers: {
          'Accept': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching JSON from Nodely IPFS:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Content not found on IPFS. The file may have been removed.');
        } else if (error.response?.status === 429) {
          throw new Error('Too many requests. Please wait and try again.');
        }
      }
      
      throw new Error('Failed to fetch metadata from IPFS. Please try again.');
    }
  }

  static getFileUrl(cid: string): string {
    return `${this.GATEWAY_URL}${cid}`;
  }

  // Utility method to validate CID format
  static isValidCID(cid: string): boolean {
    // Basic CID validation - checks for common CID patterns
    const cidRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58}|z[1-9A-HJ-NP-Za-km-z]{48})$/;
    return cidRegex.test(cid);
  }

  // Health check method to verify Nodely service availability
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.NODELY_API_URL}/health`, {
        headers: this.getAuthHeaders(),
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('Nodely health check failed:', error);
      return false;
    }
  }
}