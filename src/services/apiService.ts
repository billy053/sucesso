const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD 
    ? `${window.location.origin}/api`
    : `${window.location.origin}/api`
);

class ApiService {
  private token: string | null = null;
  private isOnline: boolean = navigator.onLine;
  private retryCount: number = 0;
  private maxRetries: number = 3;

  constructor() {
    this.token = localStorage.getItem('auth-token');
    
    // Monitorar status de conexão
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.retryCount = 0;
      console.log('🌐 Conexão restaurada');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📴 Conexão perdida');
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 API Service inicializado:', API_BASE_URL);
      console.log('🌐 Status inicial:', this.isOnline ? 'Online' : 'Offline');
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth-token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth-token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Se offline, falhar imediatamente
    if (!this.isOnline) {
      throw new Error('NETWORK_ERROR');
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      timeout: 10000, // 10 segundos
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.retryCount = 0; // Reset retry count on success

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          try {
            const errorText = await response.text();
            if (errorText.trim()) {
              errorMessage = errorText;
            }
          } catch {
            // Keep HTTP status message
          }
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      // Incrementar contador de tentativas
      this.retryCount++;
      
      if (error instanceof Error) {
        // Erros de rede ou timeout
        if (error.name === 'AbortError' || 
            error.message.includes('fetch') || 
            error.message.includes('network') ||
            error.message.includes('timeout')) {
          
          console.warn(`🔄 Tentativa ${this.retryCount}/${this.maxRetries} falhou para ${endpoint}`);
          
          // Se ainda há tentativas, tentar novamente após delay
          if (this.retryCount < this.maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 5000);
            console.log(`⏳ Tentando novamente em ${delay}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.request(endpoint, options);
          }
          
          // Esgotar tentativas
          this.isOnline = false;
          throw new Error('NETWORK_ERROR');
        }
        
        throw error;
      }
      
      throw new Error('NETWORK_ERROR');
    }
  }

  // Health check robusto
  async healthCheck() {
    try {
      const response = await this.request('/health');
      this.isOnline = true;
      return response;
    } catch (error) {
      this.isOnline = false;
      
      // Tentar endpoint alternativo
      try {
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
          method: 'GET',
          timeout: 5000
        });
        
        if (response.ok) {
          this.isOnline = true;
          return await response.json();
        }
      } catch (altError) {
        console.warn('🔄 Endpoint alternativo também falhou');
      }
      
      return { status: 'offline', timestamp: new Date().toISOString() };
    }
  }

  // Métodos de autenticação com retry automático
  async superAdminLogin(password: string) {
    try {
      const response = await this.request('/auth/super-admin', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      
      if (response.token) {
        this.setToken(response.token);
      }
      
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Super admin login offline - usando validação local');
        throw error;
      }
      throw error;
    }
  }

  async requestAccess(data: {
    fullName: string;
    email: string;
    businessName: string;
    businessDescription: string;
  }) {
    try {
      console.log('🌐 Enviando solicitação para:', `${API_BASE_URL}/auth/request-access`);
      console.log('📦 Dados:', data);
      
      return await this.request('/auth/request-access', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Request access offline - salvando localmente');
        throw error;
      }
      throw error;
    }
  }

  async setupPasswords(data: {
    email: string;
    adminCredentials: { username: string; password: string };
    operatorCredentials: { username: string; password: string };
  }) {
    try {
      return await this.request('/auth/setup-passwords', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Setup passwords offline - configurando localmente');
        throw error;
      }
      throw error;
    }
  }

  async login(email: string, username: string, password: string) {
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, username, password }),
      });
      
      if (response.token) {
        this.setToken(response.token);
      }
      
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Login offline - usando autenticação local');
        throw error;
      }
      throw error;
    }
  }

  async checkUserStatus(email: string) {
    try {
      return await this.request('/auth/check-status', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Check status offline - usando dados locais');
        throw error;
      }
      throw error;
    }
  }

  async verifyToken() {
    try {
      return await this.request('/auth/verify');
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  async getAccessRequests() {
    try {
      return await this.request('/auth/requests');
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Get requests offline - usando dados locais');
        throw error;
      }
      throw error;
    }
  }

  async approveAccess(userId: string) {
    try {
      return await this.request(`/auth/approve/${userId}`, {
        method: 'POST',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Approve access offline - salvando localmente');
        throw error;
      }
      throw error;
    }
  }

  async rejectAccess(userId: string, reason: string) {
    try {
      return await this.request(`/auth/reject/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Reject access offline - salvando localmente');
        throw error;
      }
      throw error;
    }
  }

  // Métodos de produtos com fallback
  async getProducts() {
    try {
      return await this.request('/products');
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Get products offline - usando dados locais');
        throw error;
      }
      throw error;
    }
  }

  async getProductByBarcode(barcode: string) {
    try {
      return await this.request(`/products/barcode/${barcode}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Get product by barcode offline - usando dados locais');
        throw error;
      }
      throw error;
    }
  }

  async createProduct(product: any) {
    try {
      return await this.request('/products', {
        method: 'POST',
        body: JSON.stringify(product),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Create product offline - salvando localmente');
        throw error;
      }
      throw error;
    }
  }

  async updateProduct(id: string, product: any) {
    try {
      return await this.request(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(product),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Update product offline - salvando localmente');
        throw error;
      }
      throw error;
    }
  }

  async deleteProduct(id: string) {
    try {
      return await this.request(`/products/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Delete product offline - salvando localmente');
        throw error;
      }
      throw error;
    }
  }

  async updateProductStock(id: string, quantity: number) {
    try {
      return await this.request(`/products/${id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Update stock offline - salvando localmente');
        throw error;
      }
      throw error;
    }
  }

  // Métodos de vendas
  async getSales(params?: { startDate?: string; endDate?: string; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    
    try {
      return await this.request(`/sales${query ? `?${query}` : ''}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Get sales offline - usando dados locais');
        throw error;
      }
      throw error;
    }
  }

  async createSale(sale: any) {
    try {
      return await this.request('/sales', {
        method: 'POST',
        body: JSON.stringify(sale),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Create sale offline - salvando localmente');
        throw error;
      }
      throw error;
    }
  }

  async getSalesStats() {
    try {
      return await this.request('/sales/stats');
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        console.warn('🔄 Get sales stats offline - calculando localmente');
        throw error;
      }
      throw error;
    }
  }

  // Métodos de estoque
  async getStockMovements(params?: { productId?: string; startDate?: string; endDate?: string; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.productId) queryParams.append('productId', params.productId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    
    try {
      return await this.request(`/stock/movements${query ? `?${query}` : ''}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  async addStockMovement(movement: any) {
    try {
      return await this.request('/stock/movements', {
        method: 'POST',
        body: JSON.stringify(movement),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  async getLowStockProducts() {
    try {
      return await this.request('/stock/low-stock');
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  // Métodos de relatórios
  async getSalesReport(params?: { startDate?: string; endDate?: string; groupBy?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.groupBy) queryParams.append('groupBy', params.groupBy);
    
    const query = queryParams.toString();
    
    try {
      return await this.request(`/reports/sales${query ? `?${query}` : ''}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  async getTopProducts(params?: { startDate?: string; endDate?: string; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    
    try {
      return await this.request(`/reports/top-products${query ? `?${query}` : ''}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  async getInventoryReport() {
    try {
      return await this.request('/reports/inventory');
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  async getDashboardStats() {
    try {
      return await this.request('/reports/dashboard');
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  // Métodos de estabelecimento
  async getBusinessSettings() {
    try {
      return await this.request('/business/settings');
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  async updateBusinessSettings(settings: any) {
    try {
      return await this.request('/business/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  // Métodos de NFCe
  async getNFCes(limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    
    try {
      return await this.request(`/nfce${query}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  async createNFCe(nfce: any) {
    try {
      return await this.request('/nfce', {
        method: 'POST',
        body: JSON.stringify(nfce),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  async updateNFCeStatus(id: string, status: any) {
    try {
      return await this.request(`/nfce/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(status),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  // Verificar se está online
  getConnectionStatus() {
    return this.isOnline;
  }

  // Forçar verificação de conectividade
  async checkConnectivity() {
    try {
      const response = await this.healthCheck();
      this.isOnline = response.status === 'OK';
      return this.isOnline;
    } catch (error) {
      this.isOnline = false;
      return false;
    }
  }
}

export const apiService = new ApiService();