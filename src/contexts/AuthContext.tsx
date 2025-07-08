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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_PASSWORD = 'SuperAdmin2024!';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [pendingPasswordUser, setPendingPasswordUser] = useState<AuthorizedUser | null>(null);

  useEffect(() => {
    // Verificar se há usuário logado no localStorage
    const savedUser = localStorage.getItem('current-user');
    const savedSuperAdmin = localStorage.getItem('super-admin-session');
    
    if (savedSuperAdmin) {
      setIsSuperAdmin(true);
    } else if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      // Usuário não logado
    }
    setIsLoading(false);
  }, []);

  // Funções do Super Admin
  const superAdminLogin = async (password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const response = await apiService.superAdminLogin(password);
      if (response.success) {
        setIsSuperAdmin(true);
        localStorage.setItem('super-admin-session', 'true');
        setIsLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Erro no login super admin:', error);
    }
    
    setIsLoading(false);
    return false;
  };

  const requestAccess = async (requestData: Omit<AccessRequest, 'id' | 'requestDate' | 'status'>): Promise<void> => {
    try {
      await apiService.requestAccess(requestData);
    } catch (error) {
      console.error('Erro ao solicitar acesso:', error);
      throw new Error('Não foi possível solicitar acesso. Verifique sua conexão.');
    }
  };

  const getAccessRequests = (): AccessRequest[] => {
    // Esta função agora será chamada via API no useEffect dos componentes
    return [];
  };

  const getAccessRequestsAsync = async (): Promise<AccessRequest[]> => {
    try {
      const requests = await apiService.getAccessRequests();
      return requests.map((r: any) => ({
        ...r,
        requestDate: new Date(r.created_at || r.requestDate),
        fullName: r.full_name,
        businessName: r.business_name,
        businessDescription: r.business_description,
        rejectionReason: r.rejection_reason
      }));
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      return [];
    }
  };

  const getAuthorizedUsers = (): AuthorizedUser[] => {
    // Esta função agora será chamada via API no useEffect dos componentes
    return [];
  };

  const getAuthorizedUsersAsync = async (): Promise<AuthorizedUser[]> => {
    try {
      const users = await apiService.getAccessRequests();
      return users
        .filter((u: any) => u.status === 'approved')
        .map((u: any) => ({
          id: u.id,
          fullName: u.full_name,
          email: u.email,
          businessName: u.business_name,
          approvedDate: new Date(u.approved_at || u.created_at),
          hasSetupPassword: true // Assumir que já configurou se foi aprovado
        }));
    } catch (error) {
      console.error('Erro ao carregar usuários autorizados:', error);
      return [];
    }
  };

  const getRestrictedUsers = (): RestrictedUser[] => {
    // Esta função agora será chamada via API no useEffect dos componentes
    return [];
  };

  const approveAccess = async (requestId: string): Promise<void> => {
    try {
      await apiService.approveAccess(requestId);
    } catch (error) {
      console.error('Erro ao aprovar acesso:', error);
      throw new Error('Não foi possível aprovar o acesso.');
    }
  };

  const restrictAccess = async (userId: string, reason: string): Promise<void> => {
    try {
      await apiService.rejectAccess(userId, reason);
    } catch (error) {
      console.error('Erro ao restringir acesso:', error);
      throw new Error('Não foi possível restringir o acesso.');
    }
  };

  const readmitUser = async (restrictedUserId: string): Promise<void> => {
    try {
      await apiService.approveAccess(restrictedUserId);
    } catch (error) {
      console.error('Erro ao readmitir usuário:', error);
      throw new Error('Não foi possível readmitir o usuário.');
    }
  };

  const deleteUser = async (userId: string): Promise<void> => {
    try {
      // Implementar endpoint de delete no backend se necessário
      await apiService.rejectAccess(userId, 'Usuário removido pelo administrador');
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw new Error('Não foi possível deletar o usuário.');
    }
  };

  const rejectAccess = async (requestId: string, reason: string): Promise<void> => {
    try {
      await apiService.rejectAccess(requestId, reason);
    } catch (error) {
      console.error('Erro ao rejeitar acesso:', error);
      throw new Error('Não foi possível rejeitar o acesso.');
    }
  };

  const checkEmailAccess = (email: string): boolean => {
    // Esta verificação agora será feita via API
    return false;
  };

  const checkEmailAccessAsync = async (email: string): Promise<boolean> => {
    try {
      const response = await apiService.checkUserStatus(email);
      return response.status !== 'not_found';
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      return false;
    }
  };

  const requestPasswordReset = async (email: string): Promise<boolean> => {
    try {
      // Implementar endpoint de reset de senha no backend
      console.log(`📧 Solicitação de reset para ${email}`);
      return true;
    } catch (error) {
      console.error('Erro ao solicitar reset:', error);
      return false;
    }
  };

  const validateResetCode = (email: string, resetCode: string): boolean => {
    // Implementar validação via backend
    return true;
  };

  const resetPassword = async (email: string, resetCode: string, newPassword: string): Promise<boolean> => {
    try {
      // Implementar endpoint de reset de senha no backend
      console.log(`🔑 Reset de senha para ${email}`);
      return true;
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      return false;
    }
  };

  const checkUserPasswordStatus = (email: string): 'not_found' | 'needs_setup' | 'ready' => {
    // Esta função será substituída pela versão assíncrona
    return 'not_found';
  };

  const checkUserPasswordStatusAsync = async (email: string): Promise<'not_found' | 'needs_setup' | 'ready'> => {
    try {
      const response = await apiService.checkUserStatus(email);
      return response.status;
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return 'not_found';
    }
  };

  // ✅ NOVA FUNÇÃO: Configurar senhas DUPLAS (Admin + Operador)
  const setupDualPasswords = async (
    email: string, 
    adminCredentials: UserCredentials, 
    operatorCredentials: UserCredentials
  ): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const response = await apiService.setupPasswords({
        email,
        adminCredentials,
        operatorCredentials
      });
      
      if (response.success) {
        // Login automático como admin
        const userSession: User = {
          id: Date.now().toString(),
          username: adminCredentials.username,
          name: response.user?.name || 'Usuário',
          role: 'admin',
          businessId: 'default',
          email,
          hasCustomPassword: true
        };
        
        setUser(userSession);
        setPendingPasswordUser(null);
        localStorage.setItem('current-user', JSON.stringify(userSession));
        setIsLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Erro ao configurar senhas:', error);
    }
    
    setIsLoading(false);
    return false;
  };

  // Funções do sistema normal - versão atualizada
  const login = async (email: string, username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const response = await apiService.login(email, username, password);
      
      if (response.success && response.user) {
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
        localStorage.setItem('current-user', JSON.stringify(userSession));
        setIsLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Erro no login:', error);
    }
    
    setIsLoading(false);
    return false;
  };

  // Funções de estabelecimentos
  const getBusinesses = (): BusinessInfo[] => {
    // Esta função será substituída por uma versão assíncrona
    return [];
  };

  const createBusiness = async (businessData: Omit<BusinessInfo, 'id' | 'createdAt'>): Promise<string> => {
    try {
      // Implementar criação de estabelecimento via API
      console.log('Criando estabelecimento:', businessData);
      return Date.now().toString();
    } catch (error) {
      console.error('Erro ao criar estabelecimento:', error);
      throw new Error('Não foi possível criar o estabelecimento.');
    }
  };

  const logout = () => {
    setUser(null);
    setIsSuperAdmin(false);
    setPendingPasswordUser(null);
    localStorage.removeItem('current-user');
    localStorage.removeItem('super-admin-session');
    apiService.clearToken();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      setupDualPasswords, // ✅ Nova função para configurar senhas duplas
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
      createBusiness
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