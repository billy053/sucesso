import React, { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  DollarSign,
  ShoppingCart,
  Calendar,
  Users,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useSales } from '../hooks/useSales';
import { useNotifications } from '../contexts/NotificationContext';

interface DashboardStats {
  totalProducts: number;
  lowStockItems: number;
  dailyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  dailySales: number;
  monthlySales: number;
}

export function Dashboard() {
  const { products } = useProducts();
  const { sales, getDailyRevenue, getMonthlyRevenue, getYearlyRevenue } = useSales();
  const { showNotification } = useNotifications();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockItems: 0,
    dailyRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    dailySales: 0,
    monthlySales: 0
  });

  useEffect(() => {
    console.log('📊 Carregando dashboard...');
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Calcular estatísticas
    const lowStockProducts = products.filter(p => p.stock <= p.minStock && p.minStock > 0);
    const dailySales = sales.filter(s => 
      s.date.toDateString() === today.toDateString()
    ).length;
    const monthlySales = sales.filter(s => 
      s.date >= startOfMonth && s.date <= endOfMonth
    ).length;

    const newStats: DashboardStats = {
      totalProducts: products.length,
      lowStockItems: lowStockProducts.length,
      dailyRevenue: getDailyRevenue(today),
      monthlyRevenue: getMonthlyRevenue(today),
      yearlyRevenue: getYearlyRevenue(today),
      dailySales,
      monthlySales
    };

    setStats(newStats);

    // Notificar sobre produtos com estoque baixo
    if (lowStockProducts.length > 0) {
      showNotification({
        type: 'warning',
        title: 'Estoque Baixo',
        message: `${lowStockProducts.length} produto(s) com estoque baixo`,
        data: { products: lowStockProducts }
      });
    }

    console.log('✅ Dashboard carregado:', newStats);
  }, [products, sales, getDailyRevenue, getMonthlyRevenue, getYearlyRevenue, showNotification]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    subtitle 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType; 
    color: string;
    subtitle?: string;
  }) => (
    <div className="mobile-card hover-only">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color.includes('yellow') ? 'bg-yellow-500/20' : 
          color.includes('green') ? 'bg-green-500/20' : 
          color.includes('red') ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  const lowStockProducts = products.filter(p => p.stock <= p.minStock && p.minStock > 0);
  const recentSales = sales
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  return (
    <div className="space-responsive">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">
            {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex items-center space-x-2 text-gray-400">
          <Calendar className="h-5 w-5" />
          <span className="text-sm">
            {new Date().toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="cards-grid mb-8">
        <StatCard
          title="Produtos Cadastrados"
          value={stats.totalProducts}
          icon={Package}
          color="text-blue-400"
          subtitle="Total no sistema"
        />
        
        <StatCard
          title="Estoque Baixo"
          value={stats.lowStockItems}
          icon={AlertTriangle}
          color="text-red-400"
          subtitle="Requer atenção"
        />
        
        <StatCard
          title="Vendas Hoje"
          value={formatCurrency(stats.dailyRevenue)}
          icon={DollarSign}
          color="text-green-400"
          subtitle={`${stats.dailySales} vendas`}
        />
        
        <StatCard
          title="Vendas do Mês"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={TrendingUp}
          color="text-yellow-400"
          subtitle={`${stats.monthlySales} vendas`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produtos com Estoque Baixo */}
        <div className="mobile-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              Estoque Baixo
            </h2>
            <span className="text-sm text-gray-400">
              {lowStockProducts.length} itens
            </span>
          </div>
          
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Todos os produtos com estoque adequado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{product.name}</p>
                    <p className="text-gray-400 text-sm">{product.brand} • {product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-bold">{product.stock} unid.</p>
                    <p className="text-gray-500 text-xs">Mín: {product.minStock}</p>
                  </div>
                </div>
              ))}
              
              {lowStockProducts.length > 5 && (
                <p className="text-center text-gray-400 text-sm pt-2">
                  +{lowStockProducts.length - 5} produtos com estoque baixo
                </p>
              )}
            </div>
          )}
        </div>

        {/* Últimas Vendas */}
        <div className="mobile-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <ShoppingCart className="h-5 w-5 text-green-400 mr-2" />
              Últimas Vendas
            </h2>
            <span className="text-sm text-gray-400">
              {recentSales.length} vendas
            </span>
          </div>
          
          {recentSales.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nenhuma venda registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">
                      {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {sale.date.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })} • {sale.paymentMethod.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">{formatCurrency(sale.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="mobile-card mt-6">
        <h2 className="text-lg font-semibold text-white flex items-center mb-4">
          <BarChart3 className="h-5 w-5 text-yellow-400 mr-2" />
          Resumo Financeiro
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <p className="text-gray-400 text-sm">Hoje</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.dailyRevenue)}</p>
            <p className="text-gray-500 text-xs">{stats.dailySales} vendas</p>
          </div>
          
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <p className="text-gray-400 text-sm">Este Mês</p>
            <p className="text-2xl font-bold text-yellow-400">{formatCurrency(stats.monthlyRevenue)}</p>
            <p className="text-gray-500 text-xs">{stats.monthlySales} vendas</p>
          </div>
          
          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
            <p className="text-gray-400 text-sm">Este Ano</p>
            <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.yearlyRevenue)}</p>
            <p className="text-gray-500 text-xs">Total acumulado</p>
          </div>
        </div>
      </div>
    </div>
  );
}