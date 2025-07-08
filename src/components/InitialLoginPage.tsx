import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  LogIn, 
  Shield, 
  ArrowRight, 
  Mail, 
  User, 
  Building, 
  FileText, 
  Lock, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  ArrowLeft,
  Package
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type CurrentView = 'main' | 'request' | 'login' | 'setup' | 'super-admin';

export function InitialLoginPage() {
  const { 
    requestAccess, 
    login, 
    setupDualPasswords, 
    checkUserPasswordStatusAsync,
    superAdminLogin,
    isLoading 
  } = useAuth();

  const [currentView, setCurrentView] = useState<CurrentView>('main');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showOperatorPassword, setShowOperatorPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para formulários
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

  const [passwordSetupForm, setPasswordSetupForm] = useState({
    email: '',
    adminCredentials: { username: '', password: '' },
    operatorCredentials: { username: '', password: '' }
  });

  const [superAdminForm, setSuperAdminForm] = useState({
    password: ''
  });

  // Verificar status do usuário quando email for inserido
  useEffect(() => {
    const checkStatus = async () => {
      if (loginForm.email && loginForm.email.includes('@')) {
        try {
          const status = await checkUserPasswordStatusAsync(loginForm.email);
          if (status === 'needs_setup') {
            setPasswordSetupForm(prev => ({ ...prev, email: loginForm.email }));
            setCurrentView('setup');
          }
        } catch (error) {
          // Ignorar erros de verificação
        }
      }
    };

    const timeoutId = setTimeout(checkStatus, 1000);
    return () => clearTimeout(timeoutId);
  }, [loginForm.email, checkUserPasswordStatusAsync]);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await requestAccess(requestForm);
      setSuccess('Solicitação enviada com sucesso! Aguarde a aprovação do administrador.');
      setRequestForm({ fullName: '', email: '', businessName: '', businessDescription: '' });
      
      setTimeout(() => {
        setCurrentView('main');
        setSuccess('');
      }, 3000);
    } catch (error) {
      setError('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const success = await login(loginForm.email, loginForm.username, loginForm.password);
      if (!success) {
        setError('Credenciais inválidas. Verifique email, usuário e senha.');
      }
    } catch (error) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (passwordSetupForm.adminCredentials.password.length < 6) {
      setError('Senha do administrador deve ter pelo menos 6 caracteres.');
      setIsSubmitting(false);
      return;
    }

    if (passwordSetupForm.operatorCredentials.password.length < 6) {
      setError('Senha do operador deve ter pelo menos 6 caracteres.');
      setIsSubmitting(false);
      return;
    }

    try {
      const success = await setupDualPasswords(
        passwordSetupForm.email,
        { ...passwordSetupForm.adminCredentials, role: 'admin' },
        { ...passwordSetupForm.operatorCredentials, role: 'operator' }
      );

      if (!success) {
        setError('Erro ao configurar senhas. Tente novamente.');
      }
    } catch (error) {
      setError('Erro ao configurar senhas. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const success = await superAdminLogin(superAdminForm.password);
      if (!success) {
        setError('Senha incorreta.');
      }
    } catch (error) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMainView = () => (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/25">
            <Package className="h-10 w-10 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Sistema de Gestão</h1>
          <p className="text-gray-400">Acesso controlado para estabelecimentos autorizados</p>
        </div>

        {/* Opções Principais */}
        <div className="space-y-4 mb-8">
          {/* Solicitar Acesso */}
          <button
            onClick={() => setCurrentView('request')}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-4 rounded-xl transition-all duration-200 flex items-center justify-between group shadow-lg shadow-blue-500/25"
          >
            <div className="flex items-center">
              <UserPlus className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Solicitar Acesso</div>
                <div className="text-sm text-blue-100">Primeira vez? Peça autorização</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Acessar Sistema */}
          <button
            onClick={() => setCurrentView('login')}
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black p-4 rounded-xl transition-all duration-200 flex items-center justify-between group shadow-lg shadow-yellow-500/25"
          >
            <div className="flex items-center">
              <LogIn className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Acessar Sistema</div>
                <div className="text-sm text-yellow-800">Já tenho autorização</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Painel Administrativo */}
        <div className="border-t border-gray-700 pt-6">
          <button
            onClick={() => setCurrentView('super-admin')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white p-3 rounded-lg transition-all duration-200 flex items-center justify-center text-sm border border-gray-600"
          >
            <Shield className="h-4 w-4 mr-2" />
            Painel Administrativo
          </button>
        </div>

        {/* Rodapé */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <div className="flex items-center justify-center mb-2">
            <Shield className="h-4 w-4 mr-1" />
            Sistema de Gestão v2.0
          </div>
          <p>⚠️ Acesso restrito a usuários autorizados pelo administrador</p>
        </div>
      </div>
    </div>
  );

  const renderRequestView = () => (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('main')}
              className="mr-3 p-2 text-gray-400 hover:text-yellow-400 transition-colors rounded-lg hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">Solicitar Acesso</h2>
              <p className="text-gray-400 text-sm">Preencha os dados para solicitar autorização</p>
            </div>
          </div>

          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center text-green-400">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center text-red-400">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleRequestAccess} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={requestForm.fullName}
                onChange={(e) => setRequestForm(prev => ({ ...prev, fullName: e.target.value }))}
                className="mobile-input"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Mail className="h-4 w-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                required
                value={requestForm.email}
                onChange={(e) => setRequestForm(prev => ({ ...prev, email: e.target.value }))}
                className="mobile-input"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Building className="h-4 w-4 inline mr-1" />
                Nome do Estabelecimento
              </label>
              <input
                type="text"
                required
                value={requestForm.businessName}
                onChange={(e) => setRequestForm(prev => ({ ...prev, businessName: e.target.value }))}
                className="mobile-input"
                placeholder="Nome do seu negócio"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FileText className="h-4 w-4 inline mr-1" />
                Descrição do Negócio
              </label>
              <textarea
                required
                value={requestForm.businessDescription}
                onChange={(e) => setRequestForm(prev => ({ ...prev, businessDescription: e.target.value }))}
                className="mobile-input resize-none"
                rows={3}
                placeholder="Descreva brevemente seu estabelecimento"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mobile-btn-primary w-full"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando...
                </div>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  Solicitar Acesso
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderLoginView = () => (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('main')}
              className="mr-3 p-2 text-gray-400 hover:text-yellow-400 transition-colors rounded-lg hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">Acessar Sistema</h2>
              <p className="text-gray-400 text-sm">Entre com suas credenciais</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center text-red-400">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Mail className="h-4 w-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                className="mobile-input"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Usuário
              </label>
              <input
                type="text"
                required
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                className="mobile-input"
                placeholder="Nome de usuário"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Lock className="h-4 w-4 inline mr-1" />
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="mobile-input pr-12"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="mobile-btn-primary w-full"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                  Entrando...
                </div>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Entrar
                </>
              )}
            </button>
          </form>

          {/* Contas Demo */}
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
            <h3 className="text-sm font-medium text-gray-300 mb-2">📝 Contas Demo:</h3>
            <div className="text-xs text-gray-400 space-y-1">
              <div>👨‍💼 <strong>Admin:</strong> admin@vitana.com / admin / admin123</div>
              <div>👩‍💼 <strong>Operador:</strong> admin@vitana.com / operador / operador123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPasswordSetupView = () => (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('login')}
              className="mr-3 p-2 text-gray-400 hover:text-yellow-400 transition-colors rounded-lg hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">Configurar Senhas</h2>
              <p className="text-gray-400 text-sm">Configure as credenciais de acesso</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center text-red-400">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSetup} className="space-y-6">
            {/* Credenciais do Administrador */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-400 mb-3">👑 Administrador</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Usuário</label>
                  <input
                    type="text"
                    required
                    value={passwordSetupForm.adminCredentials.username}
                    onChange={(e) => setPasswordSetupForm(prev => ({
                      ...prev,
                      adminCredentials: { ...prev.adminCredentials, username: e.target.value }
                    }))}
                    className="mobile-input"
                    placeholder="admin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      value={passwordSetupForm.adminCredentials.password}
                      onChange={(e) => setPasswordSetupForm(prev => ({
                        ...prev,
                        adminCredentials: { ...prev.adminCredentials, password: e.target.value }
                      }))}
                      className="mobile-input pr-12"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors"
                    >
                      {showAdminPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Credenciais do Operador */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">👨‍💼 Operador</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Usuário</label>
                  <input
                    type="text"
                    required
                    value={passwordSetupForm.operatorCredentials.username}
                    onChange={(e) => setPasswordSetupForm(prev => ({
                      ...prev,
                      operatorCredentials: { ...prev.operatorCredentials, username: e.target.value }
                    }))}
                    className="mobile-input"
                    placeholder="operador"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
                  <div className="relative">
                    <input
                      type={showOperatorPassword ? 'text' : 'password'}
                      required
                      value={passwordSetupForm.operatorCredentials.password}
                      onChange={(e) => setPasswordSetupForm(prev => ({
                        ...prev,
                        operatorCredentials: { ...prev.operatorCredentials, password: e.target.value }
                      }))}
                      className="mobile-input pr-12"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOperatorPassword(!showOperatorPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors"
                    >
                      {showOperatorPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mobile-btn-primary w-full"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                  Configurando...
                </div>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Configurar e Entrar
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderSuperAdminView = () => (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('main')}
              className="mr-3 p-2 text-gray-400 hover:text-yellow-400 transition-colors rounded-lg hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                <Shield className="h-6 w-6 mr-2 text-yellow-400" />
                Super Administrador
              </h2>
              <p className="text-gray-400 text-sm">Acesso restrito ao sistema</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center text-red-400">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSuperAdminLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Lock className="h-4 w-4 inline mr-1" />
                Senha do Super Administrador
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={superAdminForm.password}
                  onChange={(e) => setSuperAdminForm(prev => ({ ...prev, password: e.target.value }))}
                  className="mobile-input pr-12"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="mobile-btn-primary w-full"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                  Verificando...
                </div>
              ) : (
                <>
                  <Shield className="h-5 w-5 mr-2" />
                  Acessar Painel
                </>
              )}
            </button>
          </form>

          {/* Informações de Segurança */}
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center text-red-400 mb-2">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Área Restrita</span>
            </div>
            <p className="text-xs text-red-300">
              Este painel é destinado apenas ao super administrador do sistema. 
              Acesso não autorizado é monitorado e registrado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center safe-area-top safe-area-bottom">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg shadow-yellow-500/25">
            <Package className="h-8 w-8 text-black" />
          </div>
          <p className="text-white text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  switch (currentView) {
    case 'request':
      return renderRequestView();
    case 'login':
      return renderLoginView();
    case 'setup':
      return renderPasswordSetupView();
    case 'super-admin':
      return renderSuperAdminView();
    default:
      return renderMainView();
  }
}