# Nodely IPFS Integration Guide

## Overview

ArdhiChain has been migrated from Pinata to Nodely for IPFS storage services. This document outlines the integration details, configuration requirements, and usage patterns.

## Nodely Service Details

### API Endpoints

| Endpoint | Method | Purpose | Authentication |
|----------|--------|---------|----------------|
| `/v1/upload` | POST | File uploads | Bearer Token + Project ID |
| `/v1/upload/json` | POST | JSON metadata uploads | Bearer Token + Project ID |
| `/v1/health` | GET | Service health check | Bearer Token + Project ID |

### Gateway Access
- **Primary Gateway**: `https://ipfs.nodely.dev/ipfs/{cid}`
- **Content Retrieval**: Direct CID access via gateway
- **Performance**: Optimized for global content delivery

## Configuration Requirements

### Environment Variables

```env
# Nodely IPFS Configuration
VITE_IPFS_GATEWAY_URL=https://ipfs.nodely.dev/ipfs/
VITE_NODELY_API_URL=https://api.nodely.dev
VITE_NODELY_API_KEY=your_api_key_here
VITE_NODELY_PROJECT_ID=your_project_id_here
```

### Authentication Headers

```typescript
{
  'Authorization': `Bearer ${API_KEY}`,
  'X-Project-ID': PROJECT_ID,
  'Content-Type': 'multipart/form-data' // for file uploads
}
```

## API Usage Patterns

### File Upload

```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('name', file.name);
formData.append('description', `ArdhiChain document: ${file.name}`);

const response = await axios.post(`${API_URL}/v1/upload`, formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
    'Authorization': `Bearer ${API_KEY}`,
    'X-Project-ID': PROJECT_ID
  }
});
```

### JSON Metadata Upload

```typescript
const response = await axios.post(`${API_URL}/v1/upload/json`, {
  name: `ArdhiChain-${landId}-metadata.json`,
  description: `Metadata for land title: ${landId}`,
  content: metadata
}, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'X-Project-ID': PROJECT_ID
  }
});
```

### Content Retrieval

```typescript
const url = `https://ipfs.nodely.dev/ipfs/${cid}`;
const response = await axios.get(url, {
  headers: {
    'Accept': 'application/json'
  }
});
```

## Error Handling

### Common Error Codes

| Status Code | Error Type | Description | Resolution |
|-------------|------------|-------------|------------|
| 401 | Unauthorized | Invalid API credentials | Check API key and project ID |
| 413 | Payload Too Large | File exceeds size limit | Reduce file size |
| 422 | Unprocessable Entity | Invalid data format | Validate input data |
| 429 | Too Many Requests | Rate limit exceeded | Implement retry logic |
| 404 | Not Found | Content not available | Verify CID exists |

### Error Handling Implementation

```typescript
try {
  const response = await uploadFile(file);
  return response.data.hash;
} catch (error) {
  if (axios.isAxiosError(error)) {
    switch (error.response?.status) {
      case 401:
        throw new Error('Invalid Nodely API credentials');
      case 413:
        throw new Error('File too large');
      case 429:
        throw new Error('Rate limit exceeded');
      default:
        throw new Error('Upload failed');
    }
  }
  throw error;
}
```

## Security Considerations

### API Key Management
- Store API keys in environment variables
- Never commit credentials to version control
- Use different keys for development/production
- Rotate keys regularly

### Content Security
- Validate file types before upload
- Implement file size limits
- Sanitize metadata inputs
- Use HTTPS for all API calls

### Access Control
- Project-based isolation
- Rate limiting protection
- Authentication required for uploads
- Public gateway access for retrieval

## Performance Optimization

### Upload Optimization
- Compress files before upload when possible
- Implement retry logic for failed uploads
- Use appropriate timeout values
- Show upload progress to users

### Retrieval Optimization
- Cache frequently accessed content
- Use CDN-optimized gateway
- Implement fallback gateways
- Preload critical metadata

## Monitoring and Debugging

### Health Checks
```typescript
static async healthCheck(): Promise<boolean> {
  try {
    const response = await axios.get(`${API_URL}/v1/health`, {
      headers: authHeaders,
      timeout: 5000
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}
```

### Logging
- Log all API interactions
- Track upload/retrieval metrics
- Monitor error rates
- Alert on service degradation

## Migration Notes

### Changes from Pinata
- Different API endpoint structure
- Updated authentication method
- New error response format
- Enhanced metadata handling

### Backward Compatibility
- Existing CIDs remain accessible
- Gateway URLs updated
- No changes to smart contract
- Metadata format unchanged

## Cost Considerations

### Pricing Model
- Pay-per-use for uploads
- Bandwidth charges for retrieval
- Storage costs for pinned content
- API request limits by tier

### Optimization Strategies
- Minimize redundant uploads
- Optimize file sizes
- Use efficient metadata structures
- Monitor usage patterns

## Support and Resources

### Documentation
- [Nodely API Documentation](https://docs.nodely.dev)
- [IPFS Best Practices](https://docs.ipfs.io/concepts/best-practices/)

### Support Channels
- Nodely Support Portal
- Community Discord
- GitHub Issues

### Useful Tools
- CID Inspector: Validate CID format
- IPFS Desktop: Local IPFS node
- Gateway Checker: Test gateway availability