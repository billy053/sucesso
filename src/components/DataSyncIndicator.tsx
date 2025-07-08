import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function DataSyncIndicator() {
  const { connectionStatus, retryConnection } = useAuth();

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-400" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-400" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 text-yellow-400 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'checking':
        return 'Verificando...';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'online':
        return 'text-green-400';
      case 'offline':
        return 'text-red-400';
      case 'checking':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
      {getStatusIcon()}
      <span className={`text-xs font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      
      {connectionStatus === 'offline' && (
        <button
          onClick={retryConnection}
          className="text-xs text-gray-400 hover:text-yellow-400 transition-colors"
          title="Tentar reconectar"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
      
      {connectionStatus === 'offline' && (
        <div className="text-xs text-gray-500">
          Modo local ativo
        </div>
      )}
    </div>
  );
}