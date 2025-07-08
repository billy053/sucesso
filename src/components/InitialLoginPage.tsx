import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Settings, 
  ArrowLeft, 
  Mail, 
  User, 
  Building, 
  FileText, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  Lock,
  Key
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type CurrentView = 'main' | 'request' | 'login' | 'admin' | 'setup' | 'status';

export function InitialLoginPage() {
  const { 
    requestAccess, 
    superAdminLogin, 
    login, 
    setupDualPasswords,
    checkUserPasswordStatusAsync,
    isLoading 
  } = useAuth();
  
  const [currentView, setCurrentView] = useState<CurrentView>('main');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userStatus, setUserStatus] = useState<'not_found' | 'needs_setup' | 'ready' | null>(null);

  // Estados dos formulários
  const [requestForm, setRequestForm] = useState({
    fullName: '',
    email: '',
    businessName: '',
    businessDescription: ''
  });

  const [loginForm, setLoginForm] = useState({
    email: '',
    username: '',
    password: ''
  });

  const [adminForm, setAdminForm] = useState({
    password: ''
  });

  const [passwordSetupForm, setPasswordSetupForm] = useState({
    email: '',
    adminCredentials: { username: '', password: '' },
    operatorCredentials: { username: '', password: '' }
  });

  const [statusCheckForm, setStatusCheckForm] = useState({
    email: ''
  });

  const resetForms = () => {
    setRequestForm({ fullName: '', email: '', businessName: '', businessDescription: '' });
    setLoginForm({ email: '', username: '', password: '' });
    setAdminForm({ password: '' });
    setPasswordSetupForm({
      email: '',
      adminCredentials: { username: '', password: '' },
      operatorCredentials: { username: '', password: '' }
    });
    setStatusCheckForm({ email: '' });
    setError('');
    setSuccess('');
    setUserStatus(null);
  };

  const handleBackToMain = () => {
    setCurrentView('main');
    resetForms();
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await requestAccess(requestForm);
      setSuccess('Solicitação enviada com sucesso! Aguarde a aprovação do administrador.');
      setTimeout(() => {
        handleBackToMain();
      }, 3000);
    } catch (error) {
      setError('Erro ao enviar solicitação. Tente novamente.');
    }
  };

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const success = await superAdminLogin(adminForm.password);
    if (!success) {
      setError('Senha incorreta');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const success = await login(loginForm.email, loginForm.username, loginForm.password);
    if (!success) {
      setError('Credenciais inválidas');
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (passwordSetupForm.adminCredentials.password.length < 6) {
      setError('Senha do administrador deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (passwordSetupForm.operatorCredentials.password.length < 6) {
      setError('Senha do operador deve ter pelo menos 6 caracteres');
      return;
    }
    
    const success = await setupDualPasswords(
      passwordSetupForm.email,
      { ...passwordSetupForm.adminCredentials, role: 'admin' },
      { ...passwordSetupForm.operatorCredentials, role: 'operator' }
    );
    
    if (!success) {
      setError('Erro ao configurar senhas. Tente novamente.');
    }
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const status = await checkUserPasswordStatusAsync(statusCheckForm.email);
      setUserStatus(status);
      
      if (status === 'needs_setup') {
        setPasswordSetupForm(prev => ({ ...prev, email: statusCheckForm.email }));
        setCurrentView('setup');
      } else if (status === 'ready') {
        setLoginForm(prev => ({ ...prev, email: statusCheckForm.email }));
        setCurrentView('login');
      }
    } catch (error) {
      setError('Erro ao verificar status. Tente novamente.');
    }
  };

  // Tela principal com três opções
  if (currentView === 'main') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 safe-area-top safe-area-bottom">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/25">
              <Shield className="h-10 w-10 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Sistema de Gestão</h1>
            <p className="text-gray-400">Acesso controlado para estabelecimentos autorizados</p>
          </div>

          {/* Opções principais */}
          <div className="space-y-4">
            {/* Solicitar Acesso */}
            <button
              onClick={() => setCurrentView('request')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-blue-500/25 touch-manipulation"
            >
              <Users className="h-6 w-6" />
              <span className="text-lg font-medium">Solicitar Acesso</span>
            </button>

            {/* Acessar Sistema */}
            <button
              onClick={() => setCurrentView('status')}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-black p-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-yellow-500/25 touch-manipulation"
            >
              <Key className="h-6 w-6" />
              <span className="text-lg font-medium">Acessar Sistema</span>
            </button>

            {/* Painel Administrativo */}
            <button
              onClick={() => setCurrentView('admin')}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg touch-manipulation"
            >
              <Settings className="h-6 w-6" />
              <span className="text-lg font-medium">Painel Administrativo</span>
            </button>
          </div>

          {/* Aviso */}
          <div className="mt-8 p-4 bg-gray-900 rounded-xl border border-gray-700">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-300">
                  <strong className="text-yellow-400">Acesso restrito</strong> a usuários autorizados pelo administrador.
                </p>
              </div>
            </div>
          </div>

          {/* Versão */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">Sistema v2.0</p>
          </div>
        </div>
      </div>
    );
  }

  // Tela de solicitação de acesso
  if (currentView === 'request') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 safe-area-top safe-area-bottom">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-xl">
            {/* Header */}
            <div className="flex items-center mb-6">
              <button
                onClick={handleBackToMain}
                className="mr-3 p-2 text-gray-400 hover:text-yellow-400 transition-colors touch-manipulation"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">Solicitar Acesso</h2>
                <p className="text-sm text-gray-400">Preencha os dados para solicitar autorização</p>
              </div>
            </div>

            {success ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <p className="text-green-400 font-medium">{success}</p>
              </div>
            ) : (
              <form onSubmit={handleRequestAccess} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={requestForm.fullName}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, fullName: e.target.value }))}
                      className="mobile-input pl-10"
                      placeholder="Seu nome completo"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={requestForm.email}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, email: e.target.value }))}
                      className="mobile-input pl-10"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome do Estabelecimento
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={requestForm.businessName}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, businessName: e.target.value }))}
                      className="mobile-input pl-10"
                      placeholder="Nome do seu negócio"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição do Negócio
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <textarea
                      required
                      value={requestForm.businessDescription}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, businessDescription: e.target.value }))}
                      className="mobile-input pl-10 min-h-[80px] resize-none"
                      placeholder="Descreva brevemente seu estabelecimento"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-red-400 text-sm">
                    <XCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mobile-btn-primary w-full"
                >
                  {isLoading ? 'Enviando...' : 'Enviar Solicitação'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tela de verificação de status
  if (currentView === 'status') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 safe-area-top safe-area-bottom">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-xl">
            <div className="flex items-center mb-6">
              <button
                onClick={handleBackToMain}
                className="mr-3 p-2 text-gray-400 hover:text-yellow-400 transition-colors touch-manipulation"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">Verificar Acesso</h2>
                <p className="text-sm text-gray-400">Digite seu e-mail para verificar o status</p>
              </div>
            </div>

            <form onSubmit={handleCheckStatus} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={statusCheckForm.email}
                    onChange={(e) => setStatusCheckForm(prev => ({ ...prev, email: e.target.value }))}
                    className="mobile-input pl-10"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-400 text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {userStatus === 'not_found' && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 text-red-400">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">E-mail não encontrado</span>
                  </div>
                  <p className="text-sm text-red-300 mt-1">
                    Este e-mail não possui acesso autorizado. Solicite acesso primeiro.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mobile-btn-primary w-full"
              >
                {isLoading ? 'Verificando...' : 'Verificar Status'}
              </button>
            </form>

            {/* Contas demo */}
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h3 className="text-sm font-medium text-blue-400 mb-2">Contas Demo Disponíveis:</h3>
              <div className="space-y-1 text-xs text-blue-300">
                <p><strong>E-mail:</strong> admin@vitana.com</p>
                <p><strong>Admin:</strong> admin / admin123</p>
                <p><strong>Operador:</strong> operador / operador123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela de login
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 safe-area-top safe-area-bottom">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-xl">
            <div className="flex items-center mb-6">
              <button
                onClick={handleBackToMain}
                className="mr-3 p-2 text-gray-400 hover:text-yellow-400 transition-colors touch-manipulation"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">Entrar no Sistema</h2>
                <p className="text-sm text-gray-400">Use suas credenciais para acessar</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    className="mobile-input pl-10"
                    placeholder="seu@email.com"
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
                    required
                    value={loginForm.username}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                    className="mobile-input pl-10"
                    placeholder="Nome de usuário"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="mobile-input pl-10 pr-10"
                    placeholder="Sua senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-400 text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mobile-btn-primary w-full"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Tela de configuração de senhas duplas
  if (currentView === 'setup') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 safe-area-top safe-area-bottom">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-xl">
            <div className="flex items-center mb-6">
              <button
                onClick={handleBackToMain}
                className="mr-3 p-2 text-gray-400 hover:text-yellow-400 transition-colors touch-manipulation"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">Configurar Senhas</h2>
                <p className="text-sm text-gray-400">Configure as credenciais de acesso</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSetup} className="space-y-6">
              {/* Credenciais do Administrador */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-400 mb-3">👑 Administrador</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Nome de usuário
                    </label>
                    <input
                      type="text"
                      required
                      value={passwordSetupForm.adminCredentials.username}
                      onChange={(e) => setPasswordSetupForm(prev => ({
                        ...prev,
                        adminCredentials: { ...prev.adminCredentials, username: e.target.value }
                      }))}
                      className="mobile-input text-sm"
                      placeholder="admin"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Senha
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordSetupForm.adminCredentials.password}
                      onChange={(e) => setPasswordSetupForm(prev => ({
                        ...prev,
                        adminCredentials: { ...prev.adminCredentials, password: e.target.value }
                      }))}
                      className="mobile-input text-sm"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>
              </div>

              {/* Credenciais do Operador */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h3 className="text-sm font-medium text-blue-400 mb-3">👨‍💼 Operador</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Nome de usuário
                    </label>
                    <input
                      type="text"
                      required
                      value={passwordSetupForm.operatorCredentials.username}
                      onChange={(e) => setPasswordSetupForm(prev => ({
                        ...prev,
                        operatorCredentials: { ...prev.operatorCredentials, username: e.target.value }
                      }))}
                      className="mobile-input text-sm"
                      placeholder="operador"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Senha
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordSetupForm.operatorCredentials.password}
                      onChange={(e) => setPasswordSetupForm(prev => ({
                        ...prev,
                        operatorCredentials: { ...prev.operatorCredentials, password: e.target.value }
                      }))}
                      className="mobile-input text-sm"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-400 text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mobile-btn-primary w-full"
              >
                {isLoading ? 'Configurando...' : 'Configurar e Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Tela de login do super admin
  if (currentView === 'admin') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 safe-area-top safe-area-bottom">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-xl">
            <div className="flex items-center mb-6">
              <button
                onClick={handleBackToMain}
                className="mr-3 p-2 text-gray-400 hover:text-yellow-400 transition-colors touch-manipulation"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">Painel Administrativo</h2>
                <p className="text-sm text-gray-400">Acesso restrito ao super administrador</p>
              </div>
            </div>

            <form onSubmit={handleSuperAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Senha do Super Administrador
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={adminForm.password}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                    className="mobile-input pl-10 pr-10"
                    placeholder="Digite a senha master"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-400 text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mobile-btn-primary w-full"
              >
                {isLoading ? 'Verificando...' : 'Acessar Painel'}
              </button>
            </form>

            {/* Aviso de segurança */}
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-300">
                    <strong>Área Restrita:</strong> Apenas o super administrador pode acessar esta seção.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}