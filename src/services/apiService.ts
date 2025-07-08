const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD 
    ? `${window.location.origin}/api`
    : `${window.location.origin}/api`
);

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth-token');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 API Service inicializado:', API_BASE_URL);
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
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      
      // Se for erro de rede, tentar fallback local
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('NETWORK_ERROR');
      }
      
      throw error;
    }
  }

  // Métodos de autenticação
  async superAdminLogin(password: string) {
    const response = await this.request('/auth/super-admin', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async requestAccess(data: {
    fullName: string;
    email: string;
    businessName: string;
    businessDescription: string;
  }) {
    return this.request('/auth/request-access', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async setupPasswords(data: {
    email: string;
    adminCredentials: { username: string; password: string };
    operatorCredentials: { username: string; password: string };
  }) {
    return this.request('/auth/setup-passwords', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, username: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async checkUserStatus(email: string) {
    try {
      return await this.request('/auth/check-status', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        throw error;
      }
      throw error;
    }
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  async getAccessRequests() {
    try {
      return await this.request('/auth/requests');
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        // Fallback para dados locais
        const requests = localStorage.getItem('access-requests');
        return requests ? JSON.parse(requests) : [];
      }
      throw error;
    }
  }

  async approveAccess(userId: string) {
    return this.request(`/auth/approve/${userId}`, {
      method: 'POST',
    });
  }

  async rejectAccess(userId: string, reason: string) {
    return this.request(`/auth/reject/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Métodos de produtos
  async getProducts() {
    try {
      return await this.request('/products');
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        const products = localStorage.getItem('business-default-products');
        return products ? JSON.parse(products) : [];
      }
      throw error;
    }
  }

  async getProductByBarcode(barcode: string) {
    try {
      return await this.request(`/products/barcode/${barcode}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        // Fallback para busca local
        const products = localStorage.getItem('business-default-products');
        if (products) {
          const parsedProducts = JSON.parse(products);
          const product = parsedProducts.find((p: any) => p.barcode === barcode);
          if (product) {
            return product;
          }
        }
        throw new Error('Produto não encontrado');
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
        return null; // Será tratado no hook
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
        return null;
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
        return { success: true };
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
        return { success: true };
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
        const sales = localStorage.getItem('business-default-sales');
        return sales ? JSON.parse(sales) : [];
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
        return null;
      }
      throw error;
    }
  }

  async getSalesStats() {
    try {
      return await this.request('/sales/stats');
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        // Calcular estatísticas básicas dos dados locais
        const sales = localStorage.getItem('business-default-sales');
        if (sales) {
          const parsedSales = JSON.parse(sales);
          const today = new Date().toISOString().split('T')[0];
          const thisMonth = new Date().toISOString().substring(0, 7);
          const thisYear = new Date().getFullYear();
          
          const dailyRevenue = parsedSales
            .filter((s: any) => s.date?.startsWith(today))
            .reduce((total: number, s: any) => total + (s.total || 0), 0);
            
          const monthlyRevenue = parsedSales
            .filter((s: any) => s.date?.startsWith(thisMonth))
            .reduce((total: number, s: any) => total + (s.total || 0), 0);
            
          const yearlyRevenue = parsedSales
            .filter((s: any) => s.date?.startsWith(thisYear.toString()))
            .reduce((total: number, s: any) => total + (s.total || 0), 0);
          
          return {
            dailyRevenue,
            monthlyRevenue,
            yearlyRevenue,
            paymentMethods: []
          };
        }
        return {
          dailyRevenue: 0,
          monthlyRevenue: 0,
          yearlyRevenue: 0,
          paymentMethods: []
        };
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
    return this.request(`/stock/movements${query ? `?${query}` : ''}`);
  }

  async addStockMovement(movement: any) {
    return this.request('/stock/movements', {
      method: 'POST',
      body: JSON.stringify(movement),
    });
  }

  async getLowStockProducts() {
    return this.request('/stock/low-stock');
  }

  // Métodos de relatórios
  async getSalesReport(params?: { startDate?: string; endDate?: string; groupBy?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.groupBy) queryParams.append('groupBy', params.groupBy);
    
    const query = queryParams.toString();
    return this.request(`/reports/sales${query ? `?${query}` : ''}`);
  }

  async getTopProducts(params?: { startDate?: string; endDate?: string; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return this.request(`/reports/top-products${query ? `?${query}` : ''}`);
  }

  async getInventoryReport() {
    return this.request('/reports/inventory');
  }

  async getDashboardStats() {
    return this.request('/reports/dashboard');
  }

  // Métodos de estabelecimento
  async getBusinessSettings() {
    try {
      return await this.request('/business/settings');
    } catch (error) {
      if (error instanceof Error && error.message === 'NETWORK_ERROR') {
        return null;
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
        return { success: true };
      }
      throw error;
    }
  }

  // Métodos de NFCe
  async getNFCes(limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request(`/nfce${query}`);
  }

  async createNFCe(nfce: any) {
    return this.request('/nfce', {
      method: 'POST',
      body: JSON.stringify(nfce),
    });
  }

  async updateNFCeStatus(id: string, status: any) {
    return this.request(`/nfce/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(status),
    });
  }

  // Health check
  async healthCheck() {
    try {
      return await this.request('/health');
    } catch (error) {
      return { status: 'offline', timestamp: new Date().toISOString() };
    }
  }
}

export const apiService = new ApiService();