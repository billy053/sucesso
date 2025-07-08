import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { offlineStorage } from '../services/offlineStorage';

interface SyncStatus {
  isOnline: boolean;
  queueLength: number;
  lastSync: string | null;
  isSyncing: boolean;
}

export function useDataPersistence() {
  const { user, connectionStatus } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: connectionStatus === 'online',
    queueLength: 0,
    lastSync: localStorage.getItem('last-sync-time'),
    isSyncing: false
  });

  useEffect(() => {
    if (!user) return;

    // Atualizar status periodicamente
    const interval = setInterval(() => {
      setSyncStatus({
        isOnline: offlineStorage.getConnectionStatus() === 'online',
        queueLength: offlineStorage.getPendingCount(),
        lastSync: localStorage.getItem('last-sync-time'),
        isSyncing: false // TODO: implementar flag de sincronização
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [user, connectionStatus]);

  const forcSync = async (): Promise<boolean> => {
    if (!user) return false;
    
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    
    try {
      const result = await offlineStorage.syncAll();
      
      if (result.success && result.synced > 0) {
        const now = new Date().toISOString();
        localStorage.setItem('last-sync-time', now);
        
        setSyncStatus(prev => ({
          ...prev,
          lastSync: now,
          queueLength: offlineStorage.getPendingCount(),
          isSyncing: false
        }));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro na sincronização forçada:', error);
      return false;
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const clearLocalData = () => {
    if (!user) return;
    
    offlineStorage.clearAllData(user.businessId);
    setSyncStatus(prev => ({
      ...prev,
      queueLength: 0,
      lastSync: null
    }));
    
    localStorage.removeItem('last-sync-time');
  };

  // Salvar dados com persistência offline
  const saveData = async (
    type: 'products' | 'sales' | 'settings' | 'movements',
    action: 'create' | 'update' | 'delete',
    data: any,
    id?: string
  ): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');
    
    return await offlineStorage.saveData(type, action, data, user.businessId, id);
  };

  // Carregar dados com fallback automático
  const loadData = async (type: 'products' | 'sales' | 'settings' | 'movements'): Promise<any[]> => {
    if (!user) return [];
    
    return await offlineStorage.loadData(type, user.businessId);
  };

  return {
    syncStatus,
    forcSync,
    clearLocalData,
    saveData,
    loadData
  };
}