import axios from 'axios';
import { PropertyMetadata } from '../types';

export class IPFSService {
  private static readonly PINATA_API_URL = 'https://api.pinata.cloud';
  private static readonly GATEWAY_URL = import.meta.env.VITE_IPFS_GATEWAY_URL;

  static async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        type: 'document'
      }
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 1
    });
    formData.append('pinataOptions', options);

    try {
      const response = await axios.post(
        `${this.PINATA_API_URL}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY,
            'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_KEY
          }
        }
      );

      return response.data.IpfsHash;
    } catch (error) {
      console.error('Error uploading file to IPFS:', error);
      throw error;
    }
  }

  static async uploadJSON(metadata: PropertyMetadata): Promise<string> {
    try {
      const response = await axios.post(
        `${this.PINATA_API_URL}/pinning/pinJSONToIPFS`,
        metadata,
        {
          headers: {
            'Content-Type': 'application/json',
            'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY,
            'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_KEY
          }
        }
      );

      return response.data.IpfsHash;
    } catch (error) {
      console.error('Error uploading JSON to IPFS:', error);
      throw error;
    }
  }

  static async fetchJSON(cid: string): Promise<PropertyMetadata> {
    try {
      const url = `${this.GATEWAY_URL}${cid}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching JSON from IPFS:', error);
      throw error;
    }
  }

  static getFileUrl(cid: string): string {
    return `${this.GATEWAY_URL}${cid}`;
  }
}