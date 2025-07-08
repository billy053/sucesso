// Serviço de sincronização de dados para garantir persistência
import { apiService } from './apiService';

interface SyncData {
  key: string;
  data: any;
  lastModified: Date;
  businessId: string;
}

class DataSyncService {
  private syncQueue: SyncData[] = [];
  private isOnline = navigator.onLine;
  private syncInterval: number | null = null;

  constructor() {
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Sincronizar antes de fechar a página
    window.addEventListener('beforeunload', () => {
      if (this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    });
  }

  private startPeriodicSync() {
    // Sincronizar a cada 30 segundos se online
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, 30000);
  }

  // Adicionar dados à fila de sincronização
  queueSync(key: string, data: any, businessId: string) {
    const syncData: SyncData = {
      key,
      data,
      lastModified: new Date(),
      businessId
    };

    // Remover item anterior com a mesma chave
    this.syncQueue = this.syncQueue.filter(item => item.key !== key);
    
    // Adicionar novo item
    this.syncQueue.push(syncData);

    // Salvar localmente imediatamente
    localStorage.setItem(key, JSON.stringify({
      data,
      lastModified: syncData.lastModified,
      businessId
    }));

    // Tentar sincronizar imediatamente se online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  // Processar fila de sincronização
  private async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const itemsToSync = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of itemsToSync) {
      try {
        await this.syncToServer(item);
      } catch (error) {
        console.warn('Erro na sincronização, recolocando na fila:', error);
        // Recolocar na fila se falhar
        this.syncQueue.push(item);
      }
    }
  }

  // Sincronizar item específico com servidor
  private async syncToServer(item: SyncData) {
    try {
      // Determinar o endpoint baseado na chave
      if (item.key.includes('-products')) {
        // Sincronizar produtos
        for (const product of item.data) {
          if (product.id && !product.id.toString().startsWith('temp-')) {
            await apiService.updateProduct(product.id, product);
          } else {
            await apiService.createProduct(product);
          }
        }
      } else if (item.key.includes('-sales')) {
        // Sincronizar vendas
        for (const sale of item.data) {
          if (sale.id && !sale.id.toString().startsWith('temp-')) {
            // Venda já existe, não precisa sincronizar novamente
            continue;
          } else {
            await apiService.createSale(sale);
          }
        }
      } else if (item.key.includes('-settings')) {
        // Sincronizar configurações
        await apiService.updateBusinessSettings(item.data);
      }
      
      console.log(`✅ Sincronizado: ${item.key}`);
    } catch (error) {
      console.error(`❌ Erro ao sincronizar ${item.key}:`, error);
      throw error;
    }
  }

  // Carregar dados com fallback
  async loadData(key: string, businessId: string): Promise<any> {
    try {
      // Tentar carregar do servidor primeiro
      if (this.isOnline) {
        let serverData = null;
        
        if (key.includes('-products')) {
          serverData = await apiService.getProducts();
        } else if (key.includes('-sales')) {
          serverData = await apiService.getSales();
        } else if (key.includes('-settings')) {
          serverData = await apiService.getBusinessSettings();
        }

        if (serverData) {
          // Salvar localmente como backup
          localStorage.setItem(key, JSON.stringify({
            data: serverData,
            lastModified: new Date(),
            businessId
          }));
          return serverData;
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar do servidor, usando dados locais:', error);
    }

    // Fallback para dados locais
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.data;
    }

    return null;
  }

  // Forçar sincronização manual
  async forcSync(): Promise<boolean> {
    if (!this.isOnline) {
      return false;
    }

    try {
      await this.processSyncQueue();
      return true;
    } catch (error) {
      console.error('Erro na sincronização forçada:', error);
      return false;
    }
  }

  // Verificar status da sincronização
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      lastSync: localStorage.getItem('last-sync-time')
    };
  }

  // Limpar dados locais (usar com cuidado)
  clearLocalData(businessId: string) {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(`business-${businessId}-`)
    );
    
    keys.forEach(key => localStorage.removeItem(key));
  }

  // Destruir serviço
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Instância singleton
export const dataSyncService = new DataSyncService();