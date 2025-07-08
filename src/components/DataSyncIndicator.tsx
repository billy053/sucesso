import React from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useDataPersistence } from '../hooks/useDataPersistence';

export function DataSyncIndicator() {
  const { syncStatus, forcSync } = useDataPersistence();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleForceSync = async () => {
    setIsSyncing(true);
    await forcSync();
    setIsSyncing(false);
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'text-red-400';
    if (syncStatus.queueLength > 0) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.queueLength > 0) return `${syncStatus.queueLength} pendente(s)`;
    return 'Sincronizado';
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        {syncStatus.isOnline ? (
          syncStatus.queueLength > 0 ? (
            <Cloud className="h-4 w-4" />
          ) : (
            <Wifi className="h-4 w-4" />
          )
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <span>{getStatusText()}</span>
      </div>

      {syncStatus.isOnline && syncStatus.queueLength > 0 && (
        <button
          onClick={handleForceSync}
          disabled={isSyncing}
          className="p-1 text-gray-400 hover:text-yellow-400 transition-colors disabled:opacity-50"
          title="Forçar sincronização"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      )}

      {syncStatus.lastSync && (
        <span className="text-xs text-gray-500">
          Última sync: {new Date(syncStatus.lastSync).toLocaleTimeString('pt-BR')}
        </span>
      )}
    </div>
  );
}