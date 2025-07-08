import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { apiService } from '../services/apiService';

export function DataSyncIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        setServerStatus('checking');
        await apiService.healthCheck();
        setServerStatus('online');
        setLastSync(new Date());
      } catch (error) {
        setServerStatus('offline');
      }
    };

    // Verificar status inicial
    checkServerStatus();

    // Verificar a cada 30 segundos
    const interval = setInterval(checkServerStatus, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-400';
    if (serverStatus === 'offline') return 'text-yellow-400';
    if (serverStatus === 'checking') return 'text-blue-400';
    return 'text-green-400';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (serverStatus === 'offline') return <CloudOff className="h-4 w-4" />;
    if (serverStatus === 'checking') return <RefreshCw className="h-4 w-4 animate-spin" />;
    return <Cloud className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (serverStatus === 'offline') return 'Servidor offline';
    if (serverStatus === 'checking') return 'Verificando...';
    return 'Online';
  };

  return (
    <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className={`${getStatusColor()} transition-colors`}>
        {getStatusIcon()}
      </div>
      <div className="text-xs">
        <div className={`font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
        {lastSync && serverStatus === 'online' && (
          <div className="text-gray-400">
            Sync: {lastSync.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}