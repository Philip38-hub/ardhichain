import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, Wifi } from 'lucide-react';
import { IPFSServiceFactory } from '../../services/ipfs';

interface ProviderStatus {
  name: string;
  connected: boolean;
  responseTime: number;
  error?: string;
}

export const IPFSHealthCheck: React.FC = () => {
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkProviderHealth = async (providerType: 'pinata' | 'nodely'): Promise<ProviderStatus> => {
    const startTime = Date.now();
    
    try {
      const provider = IPFSServiceFactory.create(providerType);
      const isConnected = await provider.validateConnection();
      const responseTime = Date.now() - startTime;

      return {
        name: providerType.charAt(0).toUpperCase() + providerType.slice(1),
        connected: isConnected,
        responseTime
      };
    } catch (error) {
      return {
        name: providerType.charAt(0).toUpperCase() + providerType.slice(1),
        connected: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runHealthCheck = async () => {
    setIsChecking(true);
    
    try {
      const results = await Promise.all([
        checkProviderHealth('pinata'),
        checkProviderHealth('nodely')
      ]);
      
      setStatuses(results);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wifi className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">IPFS Provider Health</h2>
        </div>
        <button
          onClick={runHealthCheck}
          disabled={isChecking}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {statuses.map((status) => (
          <div
            key={status.name}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              status.connected
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {status.connected ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">{status.name}</h3>
                <p className={`text-sm ${status.connected ? 'text-green-600' : 'text-red-600'}`}>
                  {status.connected ? 'Connected' : 'Disconnected'}
                </p>
                {status.error && (
                  <p className="text-xs text-red-500 mt-1">{status.error}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">
                {status.responseTime}ms
              </div>
              <div className="text-sm text-gray-500">Response Time</div>
            </div>
          </div>
        ))}
      </div>

      {statuses.length === 0 && !isChecking && (
        <div className="text-center py-8 text-gray-500">
          No health check data available
        </div>
      )}

      {isChecking && (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Checking provider health...</p>
        </div>
      )}
    </div>
  );
};