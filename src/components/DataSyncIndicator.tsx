import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDataPersistence } from '../hooks/useDataPersistence';

export function DataSyncIndicator() {
  const { connectionStatus, checkConnection } = useAuth();
  const { syncStatus, forcSync } = useDataPersistence();
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    // Atualizar último tempo de sincronização
    if (syncStatus.lastSync) {
      const date = new Date(syncStatus.lastSync);
      setLastSyncTime(date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      }));
    }
  }, [syncStatus.lastSync]);

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    try {
      await checkConnection();
      if (connectionStatus === 'online') {
        await forcSync();
      }
    } catch (error) {
      console.error('Erro ao tentar reconectar:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusIcon = () => {
    if (isRetrying) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }

    switch (connectionStatus) {
      case 'online':
        return syncStatus.queueLength > 0 
          ? <Clock className="h-4 w-4 text-yellow-400" />
          : <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-400" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (isRetrying) return 'Reconectando...';
    
    switch (connectionStatus) {
      case 'online':
        if (syncStatus.queueLength > 0) {
          return `Sincronizando (${syncStatus.queueLength})`;
        }
        return lastSyncTime ? `Sincronizado ${lastSyncTime}` : 'Online';
      case 'offline':
        return 'Modo Offline';
      case 'checking':
        return 'Verificando...';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'online':
        return syncStatus.queueLength > 0 
          ? 'border-yellow-500/30 bg-yellow-500/10'
          : 'border-green-500/30 bg-green-500/10';
      case 'offline':
        return 'border-red-500/30 bg-red-500/10';
      case 'checking':
        return 'border-blue-500/30 bg-blue-500/10';
      default:
        return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${getStatusColor()} transition-all duration-200`}>
      {getStatusIcon()}
      <span className="text-xs font-medium text-gray-300">
        {getStatusText()}
      </span>
      
      {connectionStatus === 'offline' && (
        <button
          onClick={handleRetryConnection}
          disabled={isRetrying}
          className="ml-2 p-1 rounded hover:bg-gray-700/50 transition-colors disabled:opacity-50"
          title="Tentar reconectar"
        >
          <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}