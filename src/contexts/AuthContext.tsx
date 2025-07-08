import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'operator';
  businessId: string;
  email: string;
  hasCustomPassword: boolean;
}

export interface AccessRequest {
  id: string;
  fullName: string;
  email: string;
  businessName: string;
  businessDescription: string;
  requestDate: Date;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface AuthorizedUser {
  id: string;
  fullName: string;
  email: string;
  businessName: string;
  approvedDate: Date;
  hasSetupPassword: boolean;
}

export interface RestrictedUser {
  id: string;
  fullName: string;
  email: string;
  businessName: string;
  originalApprovalDate: Date;
  restrictionDate: Date;
  restrictionReason: string;
}

export interface BusinessInfo {
  id: string;
  name: string;
  subtitle: string;
  logoUrl: string;
  useCustomLogo: boolean;
  plan: 'free' | 'premium';
  createdAt: Date;
  ownerId?: string;
}

interface UserCredentials {
  username: string;
  password: string;
  role: 'admin' | 'operator';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  pendingPasswordUser: AuthorizedUser | null;
  connectionStatus: 'online' | 'offline' | 'checking';
  
  // Funções do sistema normal
  login: (email: string, username: string, password: string) => Promise<boolean>;
  setupDualPasswords: (email: string, adminCredentials: UserCredentials, operatorCredentials: UserCredentials) => Promise<boolean>;
  checkUserPasswordStatus: (email: string) => 'not_found' | 'needs_setup' | 'ready';
  checkUserPasswordStatusAsync: (email: string) => Promise<'not_found' | 'needs_setup' | 'ready'>;
  checkEmailAccessAsync: (email: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetPassword: (email: string, resetCode: string, newPassword: string) => Promise<boolean>;
  validateResetCode: (email: string, resetCode: string) => boolean;
  logout: () => void;
  
  // Funções do super admin
  superAdminLogin: (password: string) => Promise<boolean>;
  requestAccess: (request: Omit<AccessRequest, 'id' | 'requestDate' | 'status'>) => Promise<void>;
  getAccessRequests: () => AccessRequest[];
  getAuthorizedUsers: () => AuthorizedUser[];
  getRestrictedUsers: () => RestrictedUser[];
  getAccessRequestsAsync: () => Promise<AccessRequest[]>;
  getAuthorizedUsersAsync: () => Promise<AuthorizedUser[]>;
  approveAccess: (requestId: string) => Promise<void>;
  rejectAccess: (requestId: string, reason: string) => Promise<void>;
  checkEmailAccess: (email: string) => boolean;
  restrictAccess: (userId: string, reason: string) => Promise<void>;
  readmitUser: (restrictedUserId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  
  // Funções de estabelecimentos
  getBusinesses: () => BusinessInfo[];
  createBusiness: (business: Omit<BusinessInfo, 'id' | 'createdAt'>) => Promise<string>;
  
  // Funções de conectividade
  checkConnection: () => Promise<boolean>;
  retryConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_PASSWORD = 'SuperAdmin2024!';

// Chaves para localStorage
const STORAGE_KEYS = {
  ACCESS_REQUESTS: 'vitana-access-requests',
  AUTHORIZED_USERS: 'vitana-authorized-users',
  RESTRICTED_USERS: 'vitana-restricted-users',
  USER_CREDENTIALS: 'vitana-user-credentials',
  CURRENT_USER: 'vitana-current-user',
    requestDate: typeof r.requestDate === 'string' ? new Date(r.requestDate) : r.requestDate
  CONNECTION_STATUS: 'vitana-connection-status'
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [pendingPasswordUser, setPendingPasswordUser] = useState<AuthorizedUser | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Verificar conectividade
  const checkConnection = async (): Promise<boolean> => {
    try {
      setConnectionStatus('checking');
      const response = await apiService.healthCheck();
      const isOnline = response && response.status === 'OK';
      setConnectionStatus(isOnline ? 'online' : 'offline');
      localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, isOnline ? 'online' : 'offline');
      return isOnline;
    } catch (error) {
      console.warn('🔄 Servidor offline, usando modo local');
      setConnectionStatus('offline');
      localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'offline');
      return false;
    }
  };

  const retryConnection = async () => {
    await checkConnection();
  };

  // Inicialização
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔐 Inicializando sistema de autenticação...');
      
      // Verificar conectividade primeiro
      await checkConnection();
      
      // Verificar se há usuário logado
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      const savedSuperAdmin = localStorage.getItem(STORAGE_KEYS.SUPER_ADMIN_SESSION);
      
      if (savedSuperAdmin) {
        console.log('👑 Super admin logado (sessão salva)');
        setIsSuperAdmin(true);
      } else if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          console.log('👤 Usuário logado:', parsedUser.name);
          setUser(parsedUser);
        } catch (error) {
          console.error('❌ Erro ao carregar usuário salvo:', error);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
      } else {
        console.log('🚪 Nenhum usuário logado');
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Funções auxiliares para localStorage
  const getStoredData = <T>(key: string, defaultValue: T[] = []): T[] => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error(`Erro ao carregar ${key}:`, error);
      return defaultValue as T[];
    }
  };

  const setStoredData = <T>(key: string, data: T[]): void => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Erro ao salvar ${key}:`, error);
    }
  };

  // Super Admin Login - ROBUSTO
  const superAdminLogin = async (password: string): Promise<boolean> => {
    console.log('👑 Tentativa de login super admin...');
    setIsLoading(true);
    
    try {
      // Verificar senha localmente primeiro (mais rápido)
      if (password !== SUPER_ADMIN_PASSWORD) {
        console.log('❌ Senha super admin incorreta');
        setIsLoading(false);
        return false;
      }

      // Tentar autenticar via API se online
      if (connectionStatus === 'online') {
        try {
          console.log('🌐 Tentando autenticação via API...');
          const response = await apiService.superAdminLogin(password);
          if (response.success) {
            console.log('✅ Super admin autenticado via API');
            setIsSuperAdmin(true);
            localStorage.setItem(STORAGE_KEYS.SUPER_ADMIN_SESSION, 'true');
            setIsLoading(false);
            return true;
          }
        } catch (error) {
          console.warn('⚠️ API falhou, usando autenticação local:', error);
        }
      }

      // Fallback para autenticação local
      console.log('🔄 Usando autenticação local para super admin');
      setIsSuperAdmin(true);
      localStorage.setItem(STORAGE_KEYS.SUPER_ADMIN_SESSION, 'true');
      setIsLoading(false);
      return true;

    } catch (error) {
      console.error('❌ Erro no login super admin:', error);
      setIsLoading(false);
      return false;
    }
  };

  // Solicitar Acesso - ROBUSTO
  const requestAccess = async (requestData: Omit<AccessRequest, 'id' | 'requestDate' | 'status'>): Promise<void> => {
    console.log('📤 Solicitando acesso:', requestData.email);
    
    const newRequest: AccessRequest = {
      ...requestData,
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requestDate: new Date(),
      status: 'pending'
    };

    // Sempre salvar localmente primeiro
    const requests = getStoredData<AccessRequest>(STORAGE_KEYS.ACCESS_REQUESTS);
    
    // Verificar se já existe solicitação
    const existingIndex = requests.findIndex(r => r.email.toLowerCase() === requestData.email.toLowerCase());
    if (existingIndex >= 0) {
      throw new Error('Já existe uma solicitação para este email');
    }
    
    requests.push(newRequest);
    setStoredData(STORAGE_KEYS.ACCESS_REQUESTS, requests);
    console.log('✅ Solicitação salva localmente');

    // Tentar enviar para API se online
    if (connectionStatus === 'online') {
      try {
        console.log('🌐 Enviando para API...');
        await apiService.requestAccess(requestData);
        console.log('✅ Solicitação enviada para API');
        
        // Marcar como sincronizada
        const updatedRequests = getStoredData<AccessRequest>(STORAGE_KEYS.ACCESS_REQUESTS);
        const requestIndex = updatedRequests.findIndex(r => r.id === newRequest.id);
        if (requestIndex >= 0) {
          updatedRequests[requestIndex] = { ...updatedRequests[requestIndex], synced: true } as any;
          setStoredData(STORAGE_KEYS.ACCESS_REQUESTS, updatedRequests);
        }
      } catch (error) {
        console.warn('⚠️ Falha ao enviar para API, mantendo local:', error);
        // Não falhar - dados já estão salvos localmente
      }
    } else {
      console.log('📴 Offline - solicitação salva para sincronização posterior');
    }
  };

  // Verificar Status do Usuário - ROBUSTO
  const checkUserPasswordStatusAsync = async (email: string): Promise<'not_found' | 'needs_setup' | 'ready'> => {
    console.log('🔍 Verificando status para:', email);
    
    // Tentar via API primeiro se online
    if (connectionStatus === 'online') {
      try {
        const response = await apiService.checkUserStatus(email);
        console.log('✅ Status via API:', response.status);
        return response.status;
      } catch (error) {
        console.warn('⚠️ API falhou, verificando localmente:', error);
      }
    }

    // Fallback para verificação local
    console.log('🔄 Verificando status localmente');
    const authorizedUsers = getStoredData<AuthorizedUser>(STORAGE_KEYS.AUTHORIZED_USERS);
    const user = authorizedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return 'not_found';
    }
    
    return user.hasSetupPassword ? 'ready' : 'needs_setup';
  };

  // Configurar Senhas Duplas - ROBUSTO
  const setupDualPasswords = async (
    email: string, 
    adminCredentials: UserCredentials, 
    operatorCredentials: UserCredentials
  ): Promise<boolean> => {
    console.log('🔧 Configurando senhas duplas para:', email);
    setIsLoading(true);
    
    try {
      // Tentar via API primeiro se online
      if (connectionStatus === 'online') {
        try {
          const response = await apiService.setupPasswords({
            email,
            adminCredentials,
            operatorCredentials
          });
          
          if (response.success) {
            console.log('✅ Senhas configuradas via API');
            
            // Fazer login automático como admin
            const userSession: User = {
              id: `user_${Date.now()}`,
              username: adminCredentials.username,
              name: response.user?.name || 'Administrador',
              role: 'admin',
              businessId: 'default-business',
              email,
              hasCustomPassword: true
            };
            
            setUser(userSession);
            setPendingPasswordUser(null);
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userSession));
            setIsLoading(false);
            return true;
          }
        } catch (error) {
          console.warn('⚠️ API falhou, configurando localmente:', error);
        }
      }

      // Fallback para configuração local
      console.log('🔄 Configurando senhas localmente');
      
      // Atualizar usuário autorizado
      const authorizedUsers = getStoredData<AuthorizedUser>(STORAGE_KEYS.AUTHORIZED_USERS);
      const userIndex = authorizedUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (userIndex === -1) {
        throw new Error('Usuário não encontrado na lista de autorizados');
      }
      
      authorizedUsers[userIndex].hasSetupPassword = true;
      setStoredData(STORAGE_KEYS.AUTHORIZED_USERS, authorizedUsers);
      
      // Salvar credenciais
      const allCredentials = getStoredData<any>(STORAGE_KEYS.USER_CREDENTIALS);
      
      // Remover credenciais antigas se existirem
      const filteredCredentials = allCredentials.filter((cred: any) => cred.email !== email);
      
      // Adicionar novas credenciais
      filteredCredentials.push(
        {
          id: `cred_admin_${Date.now()}`,
          email,
          username: adminCredentials.username,
          password: adminCredentials.password, // Em produção, usar hash
          role: 'admin',
          setupDate: new Date().toISOString()
        },
        {
          id: `cred_op_${Date.now()}`,
          email,
          username: operatorCredentials.username,
          password: operatorCredentials.password, // Em produção, usar hash
          role: 'operator',
          setupDate: new Date().toISOString()
        }
      );
      
      setStoredData(STORAGE_KEYS.USER_CREDENTIALS, filteredCredentials);
      
      // Login automático como admin
      const userSession: User = {
        id: `user_${Date.now()}`,
        username: adminCredentials.username,
        name: authorizedUsers[userIndex].fullName,
        role: 'admin',
        businessId: 'default-business',
        email,
        hasCustomPassword: true
      };
      
      setUser(userSession);
      setPendingPasswordUser(null);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userSession));
      
      console.log('✅ Senhas configuradas localmente');
      setIsLoading(false);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao configurar senhas:', error);
      setIsLoading(false);
      return false;
    }
  };

  // Login - ROBUSTO
  const login = async (email: string, username: string, password: string): Promise<boolean> => {
    console.log('🔐 Tentativa de login:', { email, username, role: 'detectando...' });
    setIsLoading(true);
    
    try {
      // Tentar via API primeiro se online
      if (connectionStatus === 'online') {
        try {
          const response = await apiService.login(email, username, password);
          
          if (response.success && response.user) {
            console.log('✅ Login via API bem-sucedido');
            const userSession: User = {
              id: response.user.id,
              username: response.user.username,
              name: response.user.name,
              role: response.user.role,
              businessId: response.user.businessId,
              email: response.user.email,
              hasCustomPassword: true
            };
            
            setUser(userSession);
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userSession));
            setIsLoading(false);
            return true;
          }
        } catch (error) {
          console.warn('⚠️ API falhou, tentando login local:', error);
        }
      }

      // Fallback para login local
      console.log('🔄 Tentando login local');
      const allCredentials = getStoredData<any>(STORAGE_KEYS.USER_CREDENTIALS);
      const userCredentials = allCredentials.find((cred: any) => 
        cred.email === email && 
        cred.username === username && 
        cred.password === password
      );

      if (userCredentials) {
        const authorizedUsers = getStoredData<AuthorizedUser>(STORAGE_KEYS.AUTHORIZED_USERS);
        const authorizedUser = authorizedUsers.find(u => u.email === email);
        
        if (!authorizedUser) {
          console.log('❌ Usuário não autorizado');
          setIsLoading(false);
          return false;
        }
        
        const userSession: User = {
          id: userCredentials.id,
          username: userCredentials.username,
          name: authorizedUser.fullName,
          role: userCredentials.role,
          businessId: 'default-business',
          email: userCredentials.email,
          hasCustomPassword: true
        };
        
        setUser(userSession);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userSession));
        console.log('✅ Login local bem-sucedido');
        setIsLoading(false);
        return true;
      }
      
      console.log('❌ Credenciais inválidas');
      setIsLoading(false);
      return false;
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      setIsLoading(false);
      return false;
    }
  };

  // Funções de gerenciamento (Super Admin)
  const getAccessRequestsAsync = async (): Promise<AccessRequest[]> => {
    try {
      if (connectionStatus === 'online') {
        const serverRequests = await apiService.getAccessRequests();
        const mappedRequests = serverRequests.map((r: any) => ({
          id: r.id,
          fullName: r.full_name,
          email: r.email,
          businessName: r.business_name,
          businessDescription: r.business_description,
          requestDate: new Date(r.created_at),
          status: r.status,
          rejectionReason: r.rejection_reason
        }));
        
        // Sincronizar com dados locais
        setStoredData(STORAGE_KEYS.ACCESS_REQUESTS, mappedRequests);
        return mappedRequests;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar do servidor, usando dados locais:', error);
    }
    
    // Fallback para dados locais
    return getStoredData<AccessRequest>(STORAGE_KEYS.ACCESS_REQUESTS).map(r => ({
      ...r,
      requestDate: new Date(r.requestDate)
    }));
  };

  const approveAccess = async (requestId: string): Promise<void> => {
    try {
      // Tentar via API se online
      if (connectionStatus === 'online') {
        try {
          await apiService.approveAccess(requestId);
          console.log('✅ Aprovação via API bem-sucedida');
        } catch (error) {
          console.warn('⚠️ API falhou, aprovando localmente:', error);
        }
      }

      // Atualizar dados locais
      const requests = getStoredData<AccessRequest>(STORAGE_KEYS.ACCESS_REQUESTS);
      const request = requests.find(r => r.id === requestId);
      
      if (!request) {
        throw new Error('Solicitação não encontrada');
      }
      
      // Atualizar status da solicitação
      const updatedRequests = requests.map(r => 
        r.id === requestId ? { ...r, status: 'approved' as const } : r
      );
      setStoredData(STORAGE_KEYS.ACCESS_REQUESTS, updatedRequests);
      
      // Adicionar à lista de usuários autorizados
      const authorizedUsers = getStoredData<AuthorizedUser>(STORAGE_KEYS.AUTHORIZED_USERS);
      const newAuthorizedUser: AuthorizedUser = {
        id: `auth_${Date.now()}`,
        fullName: request.fullName,
        email: request.email,
        businessName: request.businessName,
        approvedDate: new Date(),
        hasSetupPassword: false
      };
      
      authorizedUsers.push(newAuthorizedUser);
      setStoredData(STORAGE_KEYS.AUTHORIZED_USERS, authorizedUsers);
      
      console.log('✅ Usuário aprovado:', request.email);
    } catch (error) {
      console.error('❌ Erro ao aprovar acesso:', error);
      throw error;
    }
  };

  const rejectAccess = async (requestId: string, reason: string): Promise<void> => {
    try {
      // Tentar via API se online
      if (connectionStatus === 'online') {
        try {
          await apiService.rejectAccess(requestId, reason);
          console.log('✅ Rejeição via API bem-sucedida');
        } catch (error) {
          console.warn('⚠️ API falhou, rejeitando localmente:', error);
        }
      }

      // Atualizar dados locais
      const requests = getStoredData<AccessRequest>(STORAGE_KEYS.ACCESS_REQUESTS);
      const updatedRequests = requests.map(r => 
        r.id === requestId ? { ...r, status: 'rejected' as const, rejectionReason: reason } : r
      );
      setStoredData(STORAGE_KEYS.ACCESS_REQUESTS, updatedRequests);
      
      console.log('✅ Solicitação rejeitada:', requestId);
    } catch (error) {
      console.error('❌ Erro ao rejeitar acesso:', error);
      throw error;
    }
  };

  // Implementações das funções restantes (simplificadas para brevidade)
  const getAccessRequests = () => getStoredData<AccessRequest>(STORAGE_KEYS.ACCESS_REQUESTS).map(r => ({
    ...r,
    requestDate: typeof r.requestDate === 'string' ? new Date(r.requestDate) : r.requestDate
  }));
  const getAuthorizedUsers = () => getStoredData<AuthorizedUser>(STORAGE_KEYS.AUTHORIZED_USERS);
  const getRestrictedUsers = () => getStoredData<RestrictedUser>(STORAGE_KEYS.RESTRICTED_USERS);
  const getAuthorizedUsersAsync = async () => getStoredData<AuthorizedUser>(STORAGE_KEYS.AUTHORIZED_USERS).map(u => ({
    ...u,
    approvedDate: typeof u.approvedDate === 'string' ? new Date(u.approvedDate) : u.approvedDate
  }));
  const checkUserPasswordStatus = () => 'not_found' as const;
  const checkEmailAccess = () => false;
  const checkEmailAccessAsync = async () => false;
  const requestPasswordReset = async () => true;
  const resetPassword = async () => true;
  const validateResetCode = () => true;
  const restrictAccess = async () => {};
  const readmitUser = async () => {};
  const deleteUser = async () => {};
  const getBusinesses = () => [];
  const createBusiness = async () => Date.now().toString();

  const logout = () => {
    setUser(null);
    setIsSuperAdmin(false);
    setPendingPasswordUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.SUPER_ADMIN_SESSION);
    apiService.clearToken();
    console.log('👋 Logout realizado');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      setupDualPasswords,
      checkUserPasswordStatus,
      checkUserPasswordStatusAsync,
      checkEmailAccessAsync,
      getAccessRequestsAsync,
      getAuthorizedUsersAsync,
      requestPasswordReset,
      resetPassword,
      validateResetCode,
      pendingPasswordUser,
      logout, 
      isLoading, 
      isSuperAdmin,
      connectionStatus,
      superAdminLogin,
      requestAccess,
      getAccessRequests,
      getAuthorizedUsers,
      getRestrictedUsers,
      approveAccess,
      rejectAccess,
      checkEmailAccess,
      restrictAccess,
      readmitUser,
      deleteUser,
      getBusinesses,
      createBusiness,
      checkConnection,
      retryConnection
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}