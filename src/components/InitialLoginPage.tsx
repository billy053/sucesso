import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  UserPlus, 
  Settings, 
  Mail, 
  User, 
  Building, 
  FileText, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff,
  ArrowLeft,
  Clock,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Step = 'initial' | 'request' | 'login' | 'setup' | 'success';

export function InitialLoginPage() {
  const { 
    requestAccess, 
    checkUserPasswordStatusAsync, 
    login, 
    setupDualPasswords, 
    isLoading 
  } = useAuth();
  
  const [step, setStep] = useState<Step>('initial');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showOperatorPassword, setShowOperatorPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para solicitação de acesso
  const [accessForm, setAccessForm] = useState({
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

  // Estados para configuração de senhas
  const [passwordForm, setPasswordForm] = useState({
    email: '',
    adminUsername: '',
    adminPassword: '',
    operatorUsername: '',
    operatorPassword: ''
  });

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await requestAccess({
        fullName: accessForm.fullName,
        email: accessForm.email,
        businessName: accessForm.businessName,
        businessDescription: accessForm.businessDescription
      });
      
      setSuccess('Solicitação enviada com sucesso! Aguarde a aprovação do administrador.');
      setTimeout(() => {
        setStep('initial');
        setAccessForm({ fullName: '', email: '', businessName: '', businessDescription: '' });
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

  const handleSetupPasswords = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (passwordForm.adminPassword.length < 6) {
      setError('Senha do administrador deve ter pelo menos 6 caracteres.');
      setIsSubmitting(false);
      return;
    }

    if (passwordForm.operatorPassword.length < 6) {
      setError('Senha do operador deve ter pelo menos 6 caracteres.');
      setIsSubmitting(false);
      return;
    }

    try {
      const success = await setupDualPasswords(
        passwordForm.email,
        {
          username: passwordForm.adminUsername,
          password: passwordForm.adminPassword,
          role: 'admin'
        },
        {
          username: passwordForm.operatorUsername,
          password: passwordForm.operatorPassword,
          role: 'operator'
        }
      );

      if (success) {
        setStep('success');
      } else {
        setError('Erro ao configurar senhas. Tente novamente.');
      }
    } catch (error) {
      setError('Erro ao configurar senhas. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkEmailStatus = async () => {
    if (!email || !email.includes('@')) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const status = await checkUserPasswordStatusAsync(email);
      
      switch (status) {
        case 'not_found':
          setError('Email não encontrado. Solicite acesso primeiro.');
          break;
        case 'needs_setup':
          setPasswordForm(prev => ({ ...prev, email }));
          setStep('setup');
          break;
        case 'ready':
          setLoginForm(prev => ({ ...prev, email }));
          setStep('login');
          break;
      }
    } catch (error) {
      setError('Erro ao verificar status. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInitialStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-500/25">
          <Shield className="h-10 w-10 text-black" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Sistema de Gestão</h1>
        <p className="text-gray-400">Acesso controlado para estabelecimentos autorizados</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white text-center mb-6">Escolha uma Opção</h2>
        
        <button
          onClick={() => setStep('request')}
          className="w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors group"
        >
          <div className="flex items-center">
            <UserPlus className="h-6 w-6 text-white mr-3" />
            <div className="text-left">
              <div className="text-white font-medium">Solicitar Acesso</div>
              <div className="text-blue-200 text-sm">Primeira vez? Peça autorização</div>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-white group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => {
            setStep('login');
          }}
          className="w-full flex items-center justify-between p-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors group"
        >
          <div className="flex items-center">
            <Settings className="h-6 w-6 text-black mr-3" />
            <div className="text-left">
              <div className="text-black font-medium">Acessar Sistema</div>
              <div className="text-yellow-800 text-sm">Já tenho autorização</div>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-black group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="text-center pt-6 border-t border-gray-700">
        <p className="text-gray-400 text-sm mb-2">Painel Administrativo</p>
        <p className="text-gray-500 text-xs">🛡️ Sistema de Gestão v2.0</p>
        <p className="text-yellow-500 text-xs mt-1">⚠️ Acesso restrito a usuários autorizados pelo administrador</p>
      </div>
    </div>
  );

  const renderRequestStep = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => setStep('initial')}
          className="mr-4 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Solicitar Acesso</h2>
          <p className="text-gray-400">Preencha os dados para solicitar autorização</p>
        </div>
      </div>

      {success && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
          <span className="text-green-400">{success}</span>
        </div>
      )}

      <form onSubmit={handleRequestAccess} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <User className="h-4 w-4 inline mr-2" />
            Nome Completo
          </label>
          <input
            type="text"
            required
            value={accessForm.fullName}
            onChange={(e) => setAccessForm(prev => ({ ...prev, fullName: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
            placeholder="Seu nome completo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Mail className="h-4 w-4 inline mr-2" />
            Email
          </label>
          <input
            type="email"
            required
            value={accessForm.email}
            onChange={(e) => setAccessForm(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Building className="h-4 w-4 inline mr-2" />
            Nome do Estabelecimento
          </label>
          <input
            type="text"
            required
            value={accessForm.businessName}
            onChange={(e) => setAccessForm(prev => ({ ...prev, businessName: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
            placeholder="Nome do seu negócio"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <FileText className="h-4 w-4 inline mr-2" />
            Descrição do Negócio
          </label>
          <textarea
            required
            value={accessForm.businessDescription}
            onChange={(e) => setAccessForm(prev => ({ ...prev, businessDescription: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
            placeholder="Descreva brevemente seu estabelecimento"
            rows={3}
          />
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5 mr-2" />
              Solicitar Acesso
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderLoginStep = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => setStep('initial')}
          className="mr-4 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Acessar Sistema</h2>
          <p className="text-gray-400">Entre com suas credenciais</p>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Mail className="h-4 w-4 inline mr-2" />
            Email
          </label>
          <input
            type="email"
            required
            value={loginForm.email}
            onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
            onBlur={checkEmailStatus}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <User className="h-4 w-4 inline mr-2" />
            Usuário
          </label>
          <input
            type="text"
            required
            value={loginForm.username}
            onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
            placeholder="Nome de usuário"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Senha
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 pr-12"
              placeholder="Sua senha"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 text-black py-3 px-4 rounded-lg font-medium hover:from-yellow-700 hover:to-yellow-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Entrando...
            </>
          ) : (
            <>
              <Settings className="h-5 w-5 mr-2" />
              Entrar
            </>
          )}
        </button>
      </form>

      <div className="text-center">
        <p className="text-gray-400 text-sm">
          Não tem acesso ainda?{' '}
          <button
            onClick={() => setStep('request')}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Solicite aqui
          </button>
        </p>
      </div>
    </div>
  );

  const renderSetupStep = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => setStep('initial')}
          className="mr-4 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Configurar Senhas</h2>
          <p className="text-gray-400">Configure as credenciais de acesso</p>
        </div>
      </div>

      <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-blue-400 mr-3" />
          <div>
            <p className="text-blue-400 font-medium">Acesso Aprovado!</p>
            <p className="text-blue-300 text-sm">Configure suas credenciais para começar a usar o sistema</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSetupPasswords} className="space-y-6">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4">👑 Credenciais do Administrador</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome de Usuário (Admin)
              </label>
              <input
                type="text"
                required
                value={passwordForm.adminUsername}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, adminUsername: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Senha (Admin)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordForm.adminPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, adminPassword: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 pr-12"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4">👨‍💼 Credenciais do Operador</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome de Usuário (Operador)
              </label>
              <input
                type="text"
                required
                value={passwordForm.operatorUsername}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, operatorUsername: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                placeholder="operador"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Senha (Operador)
              </label>
              <div className="relative">
                <input
                  type={showOperatorPassword ? 'text' : 'password'}
                  required
                  value={passwordForm.operatorPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, operatorPassword: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 pr-12"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowOperatorPassword(!showOperatorPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showOperatorPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Configurando...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              Finalizar Configuração
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-green-500/25">
        <CheckCircle className="h-10 w-10 text-white" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Configuração Concluída!</h2>
        <p className="text-gray-400">Suas credenciais foram configuradas com sucesso.</p>
      </div>

      <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
        <p className="text-green-400">
          Você será redirecionado automaticamente para o sistema...
        </p>
      </div>

      <div className="flex items-center justify-center">
        <Clock className="h-5 w-5 text-gray-400 mr-2" />
        <span className="text-gray-400">Aguarde alguns segundos</span>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 shadow-2xl">
          {step === 'initial' && renderInitialStep()}
          {step === 'request' && renderRequestStep()}
          {step === 'login' && renderLoginStep()}
          {step === 'setup' && renderSetupStep()}
          {step === 'success' && renderSuccessStep()}
        </div>
      </div>
    </div>
  );
}