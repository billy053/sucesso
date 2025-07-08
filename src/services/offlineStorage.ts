// Sistema robusto de armazenamento offline com sincronização automática
import { apiService } from './apiService';

interface StorageItem {
  id: string;
  data: any;
  timestamp: number;
  businessId: string;
  type: 'products' | 'sales' | 'settings' | 'users' | 'movements';
  action: 'create' | 'update' | 'delete';
  synced: boolean;
  retryCount: number;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

class OfflineStorageService {
  private readonly STORAGE_PREFIX = 'vitana_offline_';
  private readonly QUEUE_KEY = 'sync_queue';
  private readonly MAX_RETRIES = 3;
  private readonly SYNC_INTERVAL = 30000; // 30 segundos
  
  private syncTimer: number | null = null;
  private isOnline = navigator.onLine;
  private isSyncing = false;

  constructor() {
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Conexão restaurada - iniciando sincronização');
      this.isOnline = true;
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Conexão perdida - modo offline ativado');
      this.isOnline = false;
    });

    // Sincronizar antes de fechar
    window.addEventListener('beforeunload', () => {
      if (this.isOnline && this.getPendingCount() > 0) {
        this.syncAll();
      }
    });
  }

  private startPeriodicSync() {
    this.syncTimer = window.setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.getPendingCount() > 0) {
        this.syncAll();
      }
    }, this.SYNC_INTERVAL);
  }

  // Salvar dados localmente e adicionar à fila de sincronização
  async saveData(
    type: StorageItem['type'],
    action: StorageItem['action'],
    data: any,
    businessId: string,
    id?: string
  ): Promise<string> {
    const itemId = id || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const storageItem: StorageItem = {
      id: itemId,
      data: this.sanitizeData(data),
      timestamp: Date.now(),
      businessId,
      type,
      action,
      synced: false,
      retryCount: 0
    };

    // Salvar item individual
    this.setStorageItem(`${type}_${itemId}`, storageItem);
    
    // Adicionar à fila de sincronização
    this.addToSyncQueue(storageItem);
    
    // Tentar sincronizar imediatamente se online
    if (this.isOnline) {
      setTimeout(() => this.syncAll(), 100);
    }

    return itemId;
  }

  // Carregar dados com fallback automático
  async loadData(type: StorageItem['type'], businessId: string): Promise<any[]> {
    try {
      // Tentar carregar do servidor primeiro se online
      if (this.isOnline) {
        const serverData = await this.loadFromServer(type);
        if (serverData) {
          // Salvar como backup local
          this.setStorageItem(`${type}_backup_${businessId}`, {
            data: serverData,
            timestamp: Date.now(),
            businessId
          });
          return serverData;
        }
      }
    } catch (error) {
      console.warn(`Erro ao carregar ${type} do servidor:`, error);
    }

    // Fallback para dados locais
    return this.loadFromLocal(type, businessId);
  }

  private async loadFromServer(type: StorageItem['type']): Promise<any[] | null> {
    try {
      switch (type) {
        case 'products':
          return await apiService.getProducts();
        case 'sales':
          return await apiService.getSales();
        case 'settings':
          const settings = await apiService.getBusinessSettings();
          return settings ? [settings] : [];
        case 'movements':
          return await apiService.getStockMovements();
        default:
          return null;
      }
    } catch (error) {
      throw error;
    }
  }

  private loadFromLocal(type: StorageItem['type'], businessId: string): any[] {
    try {
      // Carregar backup primeiro
      const backup = this.getStorageItem(`${type}_backup_${businessId}`);
      if (backup && backup.data) {
        return backup.data;
      }

      // Carregar itens individuais
      const items: any[] = [];
      const keys = this.getAllStorageKeys();
      
      keys.forEach(key => {
        if (key.startsWith(`${this.STORAGE_PREFIX}${type}_`) && !key.includes('backup')) {
          const item = this.getStorageItem(key.replace(this.STORAGE_PREFIX, ''));
          if (item && item.businessId === businessId && item.action !== 'delete') {
            items.push(item.data);
          }
        }
      });

      return items;
    } catch (error) {
      console.error(`Erro ao carregar ${type} localmente:`, error);
      return [];
    }
  }

  // Sincronizar todos os dados pendentes
  async syncAll(): Promise<SyncResult> {
    if (!this.isOnline || this.isSyncing) {
      return { success: false, synced: 0, failed: 0, errors: ['Offline ou já sincronizando'] };
    }

    this.isSyncing = true;
    const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

    try {
      const queue = this.getSyncQueue();
      console.log(`🔄 Sincronizando ${queue.length} itens...`);

      for (const item of queue) {
        try {
          const success = await this.syncItem(item);
          if (success) {
            this.markAsSynced(item.id);
            result.synced++;
          } else {
            this.incrementRetryCount(item.id);
            result.failed++;
          }
        } catch (error) {
          console.error(`Erro ao sincronizar item ${item.id}:`, error);
          this.incrementRetryCount(item.id);
          result.failed++;
          result.errors.push(`${item.type}:${item.id} - ${error}`);
        }
      }

      // Limpar itens sincronizados da fila
      this.cleanupSyncQueue();
      
      console.log(`✅ Sincronização completa: ${result.synced} sucesso, ${result.failed} falhas`);
      
    } catch (error) {
      console.error('Erro na sincronização geral:', error);
      result.success = false;
      result.errors.push(`Erro geral: ${error}`);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  private async syncItem(item: StorageItem): Promise<boolean> {
    try {
      switch (item.type) {
        case 'products':
          return await this.syncProduct(item);
        case 'sales':
          return await this.syncSale(item);
        case 'settings':
          return await this.syncSettings(item);
        case 'movements':
          return await this.syncMovement(item);
        default:
          console.warn(`Tipo não suportado para sincronização: ${item.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Erro ao sincronizar ${item.type}:`, error);
      return false;
    }
  }

  private async syncProduct(item: StorageItem): Promise<boolean> {
    try {
      switch (item.action) {
        case 'create':
          await apiService.createProduct(item.data);
          break;
        case 'update':
          await apiService.updateProduct(item.data.id, item.data);
          break;
        case 'delete':
          await apiService.deleteProduct(item.data.id);
          break;
      }
      return true;
    } catch (error) {
      console.error('Erro ao sincronizar produto:', error);
      return false;
    }
  }

  private async syncSale(item: StorageItem): Promise<boolean> {
    try {
      if (item.action === 'create') {
        await apiService.createSale(item.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao sincronizar venda:', error);
      return false;
    }
  }

  private async syncSettings(item: StorageItem): Promise<boolean> {
    try {
      if (item.action === 'update') {
        await apiService.updateBusinessSettings(item.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao sincronizar configurações:', error);
      return false;
    }
  }

  private async syncMovement(item: StorageItem): Promise<boolean> {
    try {
      if (item.action === 'create') {
        await apiService.addStockMovement(item.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao sincronizar movimentação:', error);
      return false;
    }
  }

  // Utilitários de armazenamento
  private setStorageItem(key: string, data: any): void {
    try {
      localStorage.setItem(`${this.STORAGE_PREFIX}${key}`, JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
    }
  }

  private getStorageItem(key: string): any {
    try {
      const item = localStorage.getItem(`${this.STORAGE_PREFIX}${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Erro ao carregar do localStorage:', error);
      return null;
    }
  }

  private getAllStorageKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    return keys;
  }

  // Gerenciamento da fila de sincronização
  private addToSyncQueue(item: StorageItem): void {
    const queue = this.getSyncQueue();
    
    // Remover item anterior com mesmo ID se existir
    const filteredQueue = queue.filter(q => q.id !== item.id);
    filteredQueue.push(item);
    
    this.setStorageItem(this.QUEUE_KEY, filteredQueue);
  }

  private getSyncQueue(): StorageItem[] {
    const queue = this.getStorageItem(this.QUEUE_KEY);
    return Array.isArray(queue) ? queue : [];
  }

  private markAsSynced(itemId: string): void {
    const queue = this.getSyncQueue();
    const updatedQueue = queue.map(item => 
      item.id === itemId ? { ...item, synced: true } : item
    );
    this.setStorageItem(this.QUEUE_KEY, updatedQueue);
  }

  private incrementRetryCount(itemId: string): void {
    const queue = this.getSyncQueue();
    const updatedQueue = queue.map(item => 
      item.id === itemId ? { ...item, retryCount: item.retryCount + 1 } : item
    );
    this.setStorageItem(this.QUEUE_KEY, updatedQueue);
  }

  private cleanupSyncQueue(): void {
    const queue = this.getSyncQueue();
    const cleanQueue = queue.filter(item => 
      !item.synced && item.retryCount < this.MAX_RETRIES
    );
    this.setStorageItem(this.QUEUE_KEY, cleanQueue);
  }

  // Utilitários públicos
  getPendingCount(): number {
    return this.getSyncQueue().filter(item => !item.synced).length;
  }

  getConnectionStatus(): 'online' | 'offline' {
    return this.isOnline ? 'online' : 'offline';
  }

  clearAllData(businessId: string): void {
    const keys = this.getAllStorageKeys();
    keys.forEach(key => {
      const item = this.getStorageItem(key.replace(this.STORAGE_PREFIX, ''));
      if (item && item.businessId === businessId) {
        localStorage.removeItem(key);
      }
    });
    
    // Limpar fila de sincronização
    const queue = this.getSyncQueue();
    const filteredQueue = queue.filter(item => item.businessId !== businessId);
    this.setStorageItem(this.QUEUE_KEY, filteredQueue);
  }

  // Sanitizar dados para evitar problemas de serialização
  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (data instanceof Date) {
      return data.toISOString();
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }

    return data;
  }

  // Destruir serviço
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
  }
}

// Instância singleton
export const offlineStorage = new OfflineStorageService();