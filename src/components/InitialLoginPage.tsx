import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Building, 
  FileText, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  UserPlus,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

type CurrentView = 'initial' | 'request' | 'login' | 'setup';

export function InitialLoginPage() {
  const { 
    requestAccess, 
    checkUserPasswordStatusAsync,
    login, 
    setupDualPasswords, 
    isLoading 
  } = useAuth();
  const { showNotification } = useNotifications();
  
  const [currentView, setCurrentView] = useState<CurrentView>('initial');
  const [email, setEmail] = useState('');
  const [userStatus, setUserStatus] = useState<'not_found' | 'needs_setup' | 'ready' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showOperatorPassword, setShowOperatorPassword] = useState(false);

  // Estados para solicitação de acesso
  const [requestForm, setRequestForm] = useState({
    fullName: '',
    email: '',
    businessName: '',
    businessDescription: ''
  });

  // Estados para login
  const [loginForm, setLoginForm] = useState({
    email: '',
    username: '',
    password: ''
  });

  // Estados para configuração de senhas duplas
  const [passwordSetupForm, setPasswordSetupForm] = useState({
    email: '',
    adminCredentials: {
      username: '',
      password: ''
    },
    operatorCredentials: {
      username: '',
      password: ''
    }
  });

  // Verificar status do usuário quando email for inserido
  useEffect(() => {
    const checkStatus = async () => {
      if (email && email.includes('@')) {
        try {
          const status = await checkUserPasswordStatusAsync(email);
          setUserStatus(status);
          
          if (status === 'ready') {
            setCurrentView('login');
            setLoginForm(prev => ({ ...prev, email }));
          } else if (status === 'needs_setup') {
            setCurrentView('setup');
            setPasswordSetupForm(prev => ({ ...prev, email }));
          } else {
            setCurrentView('request');
            setRequestForm(prev => ({ ...prev, email }));
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
          setUserStatus('not_found');
          setCurrentView('request');
          setRequestForm(prev => ({ ...prev, email }));
        }
      }
    };

    const timeoutId = setTimeout(checkStatus, 500);
    return () => clearTimeout(timeoutId);
  }, [email, checkUserPasswordStatusAsync]);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await requestAccess({
        fullName: requestForm.fullName,
        email: requestForm.email,
        businessName: requestForm.businessName,
        businessDescription: requestForm.businessDescription
      });
      
      showNotification({
        type: 'success',
        title: 'Solicitação Enviada!',
        message: 'Sua solicitação foi enviada para análise. Aguarde a aprovação do administrador.'
      });
      
      setCurrentView('initial');
      setEmail('');
      setRequestForm({
        fullName: '',
        email: '',
        businessName: '',
        businessDescription: ''
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao enviar solicitação. Tente novamente.'
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const success = await login(
        loginForm.email,
        loginForm.username,
        loginForm.password
      );
      
      if (success) {
        showNotification({
          type: 'success',
          title: 'Login realizado!',
          message: 'Bem-vindo ao Sistema de Gestão Vitana'
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Erro no login',
          message: 'Credenciais inválidas. Verifique email, usuário e senha.'
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao fazer login. Tente novamente.'
      });
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordSetupForm.adminCredentials.password.length < 6) {
      showNotification({
        type: 'error',
        title: 'Senha inválida',
        message: 'A senha do administrador deve ter pelo menos 6 caracteres.'
      });
      return;
    }
    
    if (passwordSetupForm.operatorCredentials.password.length < 6) {
      showNotification({
        type: 'error',
        title: 'Senha inválida',
        message: 'A senha do operador deve ter pelo menos 6 caracteres.'
      });
      return;
    }
    
    if (passwordSetupForm.adminCredentials.username === passwordSetupForm.operatorCredentials.username) {
      showNotification({
        type: 'error',
        title: 'Usuários iguais',
        message: 'Os nomes de usuário do administrador e operador devem ser diferentes.'
      });
      return;
    }
    
    try {
      const success = await setupDualPasswords(
        passwordSetupForm.email,
        { ...passwordSetupForm.adminCredentials, role: 'admin' as const },
        { ...passwordSetupForm.operatorCredentials, role: 'operator' as const }
      );
      
      if (success) {
        showNotification({
          type: 'success',
          title: 'Configuração concluída!',
          message: 'Senhas configuradas com sucesso. Você foi logado automaticamente como administrador.'
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Erro na configuração',
          message: 'Erro ao configurar senhas. Tente novamente.'
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao configurar senhas. Tente novamente.'
      });
    }
  };

  const renderInitialView = () => (
    <div className="mobile-card max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/25">
          <Shield className="h-10 w-10 text-black" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Sistema de Gestão</h1>
        <p className="text-gray-400">Acesso controlado para estabelecimentos autorizados</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email do estabelecimento
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="mobile-input pl-10"
              disabled={isLoading}
            />
          </div>
        </div>

        {userStatus && (
          <div className="mt-4">
            {userStatus === 'not_found' && (
              <div className="flex items-center p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <UserPlus className="h-5 w-5 text-blue-400 mr-2" />
                <span className="text-blue-400 text-sm">Email não encontrado. Solicite acesso.</span>
              </div>
            )}
            {userStatus === 'needs_setup' && (
              <div className="flex items-center p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <Settings className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="text-yellow-400 text-sm">Configure suas senhas de acesso.</span>
              </div>
            )}
            {userStatus === 'ready' && (
              <div className="flex items-center p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <span className="text-green-400 text-sm">Pronto para fazer login.</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-700">
        <p className="text-center text-sm text-gray-400 mb-4">
          ⚠️ Acesso restrito a usuários autorizados pelo administrador
        </p>
        <p className="text-center text-xs text-gray-500">
          Sistema de Gestão v2.0
        </p>
      </div>
    </div>
  );

  const renderRequestView = () => (
    <div className="mobile-card max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <UserPlus className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Solicitar Acesso</h2>
        <p className="text-gray-400 text-sm">Primeira vez? Peça autorização</p>
      </div>

      <form onSubmit={handleRequestAccess} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nome completo
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={requestForm.fullName}
              onChange={(e) => setRequestForm(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="Seu nome completo"
              className="mobile-input pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              value={requestForm.email}
              onChange={(e) => setRequestForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="seu@email.com"
              className="mobile-input pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nome do estabelecimento
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={requestForm.businessName}
              onChange={(e) => setRequestForm(prev => ({ ...prev, businessName: e.target.value }))}
              placeholder="Nome do seu negócio"
              className="mobile-input pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Descrição do negócio
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <textarea
              value={requestForm.businessDescription}
              onChange={(e) => setRequestForm(prev => ({ ...prev, businessDescription: e.target.value }))}
              placeholder="Descreva brevemente seu estabelecimento"
              className="mobile-input pl-10 min-h-[80px] resize-none"
              required
            />
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setCurrentView('initial');
              setEmail('');
            }}
            className="mobile-btn-secondary flex-1"
            disabled={isLoading}
          >
            Voltar
          </button>
          <button
            type="submit"
            className="mobile-btn-primary flex-1 flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Solicitar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const renderLoginView = () => (
    <div className="mobile-card max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Fazer Login</h2>
        <p className="text-gray-400 text-sm">Entre com suas credenciais</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="seu@email.com"
              className="mobile-input pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Usuário
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={loginForm.username}
              onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Nome de usuário"
              className="mobile-input pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Senha
          </label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Sua senha"
              className="mobile-input pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-300">
          <p className="font-medium mb-1">📝 Credenciais Demo:</p>
          <p>📧 Email: admin@vitana.com</p>
          <p>👨‍💼 Admin: admin / admin123</p>
          <p>👩‍💼 Operador: operador / operador123</p>
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setCurrentView('initial');
              setEmail('');
            }}
            className="mobile-btn-secondary flex-1"
            disabled={isLoading}
          >
            Voltar
          </button>
          <button
            type="submit"
            className="mobile-btn-primary flex-1 flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Entrar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const renderPasswordSetupView = () => (
    <div className="mobile-card max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Settings className="h-8 w-8 text-black" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Configurar Senhas</h2>
        <p className="text-gray-400 text-sm">Configure senhas para Admin e Operador</p>
      </div>

      <form onSubmit={handlePasswordSetup} className="space-y-6">
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
            <span className="text-yellow-400 font-medium">Importante</span>
          </div>
          <p className="text-yellow-300 text-sm">
            Configure duas senhas diferentes: uma para administrador (acesso total) e outra para operador (vendas).
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <User className="h-5 w-5 mr-2 text-yellow-400" />
            Administrador
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome de usuário (Admin)
            </label>
            <input
              type="text"
              value={passwordSetupForm.adminCredentials.username}
              onChange={(e) => setPasswordSetupForm(prev => ({
                ...prev,
                adminCredentials: { ...prev.adminCredentials, username: e.target.value }
              }))}
              placeholder="admin"
              className="mobile-input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Senha (Admin)
            </label>
            <div className="relative">
              <input
                type={showAdminPassword ? 'text' : 'password'}
                value={passwordSetupForm.adminCredentials.password}
                onChange={(e) => setPasswordSetupForm(prev => ({
                  ...prev,
                  adminCredentials: { ...prev.adminCredentials, password: e.target.value }
                }))}
                placeholder="Mínimo 6 caracteres"
                className="mobile-input pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400"
              >
                {showAdminPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-400" />
            Operador
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome de usuário (Operador)
            </label>
            <input
              type="text"
              value={passwordSetupForm.operatorCredentials.username}
              onChange={(e) => setPasswordSetupForm(prev => ({
                ...prev,
                operatorCredentials: { ...prev.operatorCredentials, username: e.target.value }
              }))}
              placeholder="operador"
              className="mobile-input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Senha (Operador)
            </label>
            <div className="relative">
              <input
                type={showOperatorPassword ? 'text' : 'password'}
                value={passwordSetupForm.operatorCredentials.password}
                onChange={(e) => setPasswordSetupForm(prev => ({
                  ...prev,
                  operatorCredentials: { ...prev.operatorCredentials, password: e.target.value }
                }))}
                placeholder="Mínimo 6 caracteres"
                className="mobile-input pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowOperatorPassword(!showOperatorPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400"
              >
                {showOperatorPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setCurrentView('initial');
              setEmail('');
            }}
            className="mobile-btn-secondary flex-1"
            disabled={isLoading}
          >
            Voltar
          </button>
          <button
            type="submit"
            className="mobile-btn-primary flex-1 flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Configurar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md">
        {currentView === 'initial' && renderInitialView()}
        {currentView === 'request' && renderRequestView()}
        {currentView === 'login' && renderLoginView()}
        {currentView === 'setup' && renderPasswordSetupView()}
      </div>
    </div>
  );
}