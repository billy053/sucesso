import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataSyncService } from '../services/dataSync';

export function useDataPersistence() {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState({
    isOnline: navigator.onLine,
    queueLength: 0,
    lastSync: null as string | null
  });

  useEffect(() => {
    if (!user) return;

    // Atualizar status periodicamente
    const interval = setInterval(() => {
      setSyncStatus(dataSyncService.getSyncStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const forcSync = async () => {
    if (!user) return false;
    
    const success = await dataSyncService.forcSync();
    if (success) {
      localStorage.setItem('last-sync-time', new Date().toISOString());
      setSyncStatus(dataSyncService.getSyncStatus());
    }
    return success;
  };

  const clearLocalData = () => {
    if (!user) return;
    
    dataSyncService.clearLocalData(user.businessId);
    setSyncStatus(dataSyncService.getSyncStatus());
  };

  return {
    syncStatus,
    forcSync,
    clearLocalData
  };
}