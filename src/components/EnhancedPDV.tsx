import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart,
  Scan,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  DollarSign,
  Smartphone,
  X,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Coffee
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useSales } from '../hooks/useSales';
import { useStockMovements } from '../hooks/useStockMovements';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { BarcodeScanner } from './BarcodeScanner';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

type PaymentMethod = 'dinheiro' | 'pix' | 'cartão' | 'débito';

const STANDBY_TIMEOUT = 2 * 60 * 1000; // 2 minutos

export function EnhancedPDV(): JSX.Element {
  const { user } = useAuth();
  const { products, updateStock } = useProducts();
  const { addSale } = useSales();
  const { addMovement } = useStockMovements();
  const { showNotification } = useNotifications();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [isStandby, setIsStandby] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isProcessing, setIsProcessing] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const standbyTimeoutRef = useRef<NodeJS.Timeout>();

  // Resetar timer de inatividade
  const resetActivityTimer = () => {
    setLastActivity(Date.now());
    setIsStandby(false);
    
    if (standbyTimeoutRef.current) {
      clearTimeout(standbyTimeoutRef.current);
    }
    
    standbyTimeoutRef.current = setTimeout(() => {
      setIsStandby(true);
    }, STANDBY_TIMEOUT);
  };

  // Configurar timer de inatividade
  useEffect(() => {
    resetActivityTimer();
    
    const handleActivity = () => resetActivityTimer();
    
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    
    return () => {
      if (standbyTimeoutRef.current) {
        clearTimeout(standbyTimeoutRef.current);
      }
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, []);

  // Focar no input de código de barras
  useEffect(() => {
    if (!isStandby && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [isStandby, cart]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isStandby) return;
      
      switch (e.key) {
        case 'F1':
          e.preventDefault();
          clearCart();
          break;
        case 'F2':
          e.preventDefault();
          if (cart.length > 0) {
            handleFinalizeSale();
          }
          break;
        case 'F3':
          e.preventDefault();
          setIsStandby(true);
          break;
        case 'F4':
          e.preventDefault();
          setShowScanner(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart, isStandby]);

  const addToCart = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    
    if (!product) {
      showNotification({
        type: 'error',
        title: 'Produto não encontrado',
        message: `Código de barras: ${barcode}`
      });
      return;
    }

    if (product.stock <= 0) {
      showNotification({
        type: 'warning',
        title: 'Produto sem estoque',
        message: `${product.name} não possui estoque disponível`
      });
      return;
    }

    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        showNotification({
          type: 'warning',
          title: 'Estoque insuficiente',
          message: `Apenas ${product.stock} unidades disponíveis`
        });
        return;
      }
      
      updateCartItem(product.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        total: product.price
      };
      setCart([...cart, newItem]);
    }

    showNotification({
      type: 'success',
      title: 'Produto adicionado',
      message: `${product.name} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}`,
      duration: 2000
    });

    setBarcodeInput('');
    resetActivityTimer();
  };

  const updateCartItem = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity > product.stock) {
      showNotification({
        type: 'warning',
        title: 'Estoque insuficiente',
        message: `Apenas ${product.stock} unidades disponíveis`
      });
      return;
    }

    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, quantity: newQuantity, total: newQuantity * item.unitPrice }
        : item
    ));
    resetActivityTimer();
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
    resetActivityTimer();
  };

  const clearCart = () => {
    setCart([]);
    setBarcodeInput('');
    resetActivityTimer();
    
    showNotification({
      type: 'info',
      title: 'Carrinho limpo',
      message: 'Todos os itens foram removidos'
    });
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      addToCart(barcodeInput.trim());
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    addToCart(barcode);
    setShowScanner(false);
  };

  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      showNotification({
        type: 'warning',
        title: 'Carrinho vazio',
        message: 'Adicione produtos antes de finalizar a venda'
      });
      return;
    }

    setIsProcessing(true);

    try {
      const total = cart.reduce((sum, item) => sum + item.total, 0);

      // Criar venda
      await addSale({
        items: cart,
        total,
        paymentMethod
      });

      // Atualizar estoque dos produtos
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await updateStock(item.productId, product.stock - item.quantity);
          
          // Registrar movimentação de estoque
          addMovement({
            productId: item.productId,
            type: 'saída',
            quantity: item.quantity,
            reason: 'Venda no PDV'
          });
        }
      }

      showNotification({
        type: 'sale',
        title: '🎉 Venda finalizada!',
        message: `Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)} - ${getPaymentMethodName(paymentMethod)}`,
        duration: 4000
      });

      // Limpar carrinho
      setCart([]);
      setBarcodeInput('');
      setPaymentMethod('dinheiro');
      
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro na venda',
        message: 'Não foi possível finalizar a venda. Tente novamente.'
      });
    } finally {
      setIsProcessing(false);
      resetActivityTimer();
    }
  };

  const getPaymentMethodName = (method: PaymentMethod) => {
    const names = {
      'dinheiro': 'Dinheiro',
      'pix': 'PIX',
      'cartão': 'Cartão de Crédito',
      'débito': 'Cartão de Débito'
    };
    return names[method];
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'dinheiro': return <DollarSign className="h-4 w-4" />;
      case 'pix': return <Smartphone className="h-4 w-4" />;
      case 'cartão': return <CreditCard className="h-4 w-4" />;
      case 'débito': return <CreditCard className="h-4 w-4" />;
    }
  };

  const total = cart.reduce((sum, item) => sum + item.total, 0);

  // Modo Stand-by
  if (isStandby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-md w-full">
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-yellow-500/25 animate-pulse">
              <Coffee className="h-16 w-16 text-black" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white">Sistema Vitana</h1>
            <p className="text-xl text-gray-300">Depósito de Bebidas</p>
            
            <div className="flex items-center justify-center space-x-2 text-gray-400">
              <Clock className="h-5 w-5" />
              <span className="text-lg">
                {new Date().toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
            
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 text-green-400">
                <Zap className="h-5 w-5" />
                <span className="font-medium">Sistema Ativo</span>
              </div>
              <p className="text-sm text-gray-500">Frente de Caixa em Stand By</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-gray-400">Toque na tela para continuar</p>
            
            <button
              onClick={() => setIsStandby(false)}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold py-4 px-8 rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200 shadow-lg shadow-yellow-500/25 touch-manipulation"
            >
              <div className="flex items-center justify-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Ativar Caixa</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-black rounded-xl border border-yellow-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/25">
              <ShoppingCart className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Frente de Caixa</h1>
              <p className="text-gray-400">
                {cart.length} {cart.length === 1 ? 'item' : 'itens'} • 
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-sm text-gray-400">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'short', 
                  day: '2-digit', 
                  month: 'short' 
                })}
              </p>
              <p className="text-lg font-bold text-yellow-400">
                {new Date().toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
            
            <button
              onClick={() => setIsStandby(true)}
              className="p-2 text-gray-400 hover:text-yellow-400 transition-colors rounded-lg hover:bg-gray-800/50"
              title="Modo Stand By (F3)"
            >
              <Clock className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner e Input */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scanner de Código de Barras */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Scan className="h-5 w-5 mr-2 text-yellow-400" />
              Scanner de Código de Barras
            </h2>
            
            <form onSubmit={handleBarcodeSubmit} className="space-y-4">
              <div className="flex space-x-3">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Escaneie ou digite o código de barras..."
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-medium rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200 shadow-lg shadow-yellow-500/25"
                  title="Abrir Scanner (F4)"
                >
                  <Scan className="h-5 w-5" />
                </button>
              </div>
              
              <button
                type="submit"
                disabled={!barcodeInput.trim()}
                className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200"
              >
                Adicionar Produto
              </button>
            </form>
          </div>

          {/* Carrinho */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-yellow-400" />
                Carrinho de Compras
              </h2>
              
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="px-3 py-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 text-sm"
                  title="Limpar Carrinho (F1)"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Carrinho vazio</p>
                <p className="text-sm">Escaneie um produto para começar</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{item.productName}</h3>
                      <p className="text-sm text-gray-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)} cada
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartItem(item.productId, item.quantity - 1)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        
                        <span className="w-8 text-center text-white font-medium">
                          {item.quantity}
                        </span>
                        
                        <button
                          onClick={() => updateCartItem(item.productId, item.quantity + 1)}
                          className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-white">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pagamento */}
        <div className="space-y-6">
          {/* Total */}
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl p-6 text-black">
            <h2 className="text-lg font-semibold mb-2">Total da Venda</h2>
            <p className="text-3xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </p>
            <p className="text-sm opacity-80 mt-1">
              {cart.length} {cart.length === 1 ? 'item' : 'itens'}
            </p>
          </div>

          {/* Forma de Pagamento */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Forma de Pagamento</h2>
            
            <div className="grid grid-cols-2 gap-3">
              {(['dinheiro', 'pix', 'cartão', 'débito'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    paymentMethod === method
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                      : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    {getPaymentMethodIcon(method)}
                    <span className="text-sm font-medium">
                      {getPaymentMethodName(method)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Finalizar Venda */}
          <button
            onClick={handleFinalizeSale}
            disabled={cart.length === 0 || isProcessing}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            title="Finalizar Venda (F2)"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processando...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Finalizar Venda</span>
              </div>
            )}
          </button>

          {/* Atalhos */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Atalhos</h3>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>F1</span>
                <span>Limpar Carrinho</span>
              </div>
              <div className="flex justify-between">
                <span>F2</span>
                <span>Finalizar Venda</span>
              </div>
              <div className="flex justify-between">
                <span>F3</span>
                <span>Modo Stand By</span>
              </div>
              <div className="flex justify-between">
                <span>F4</span>
                <span>Scanner</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}