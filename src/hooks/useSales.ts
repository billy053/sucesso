import { useState, useEffect } from 'react';
import { Sale } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDataPersistence } from './useDataPersistence';

// Função para converter dados do servidor para formato local
const parseSaleFromServer = (serverSale: any): Sale => ({
  id: serverSale.id,
  items: Array.isArray(serverSale.items) ? serverSale.items : [],
  total: parseFloat(serverSale.total) || 0,
  date: new Date(serverSale.created_at || serverSale.date || Date.now()),
  paymentMethod: serverSale.payment_method || serverSale.paymentMethod || 'dinheiro'
});

export function useSales() {
  const { user } = useAuth();
  const { loadData, saveData } = useDataPersistence();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const loadSales = async () => {
      try {
        setIsLoading(true);
        console.log('💰 Carregando vendas...');
        
        const serverSales = await loadData('sales');
        
        if (serverSales && serverSales.length > 0) {
          console.log(`✅ ${serverSales.length} vendas carregadas`);
          const parsedSales = serverSales.map(parseSaleFromServer);
          setSales(parsedSales);
        } else {
          console.log('💰 Nenhuma venda encontrada');
          setSales([]);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar vendas:', error);
        setSales([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSales();
  }, [user, loadData]);

  const addSale = async (sale: Omit<Sale, 'id' | 'date'>) => {
    try {
      const newSale: Sale = {
        ...sale,
        id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: new Date(),
      };
      
      // Atualizar estado local imediatamente
      const updatedSales = [...sales, newSale];
      setSales(updatedSales);
      
      // Salvar com persistência offline
      await saveData('sales', 'create', newSale, newSale.id);
      
      console.log('✅ Venda adicionada:', newSale.id, 'Total:', newSale.total);
      return newSale;
    } catch (error) {
      console.error('❌ Erro ao adicionar venda:', error);
      throw error;
    }
  };

  const getSalesByDateRange = (startDate: Date, endDate: Date) => {
    return sales.filter(
      (sale) => sale.date >= startDate && sale.date <= endDate
    );
  };

  const getDailyRevenue = (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return getSalesByDateRange(startOfDay, endOfDay).reduce(
      (total, sale) => total + sale.total,
      0
    );
  };

  const getMonthlyRevenue = (date: Date) => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    return getSalesByDateRange(startOfMonth, endOfMonth).reduce(
      (total, sale) => total + sale.total,
      0
    );
  };

  const getYearlyRevenue = (date: Date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const endOfYear = new Date(date.getFullYear(), 11, 31);
    
    return getSalesByDateRange(startOfYear, endOfYear).reduce(
      (total, sale) => total + sale.total,
      0
    );
  };

  // Função para recarregar vendas do servidor
  const refreshSales = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const serverSales = await loadData('sales');
      
      if (serverSales && serverSales.length > 0) {
        const parsedSales = serverSales.map(parseSaleFromServer);
        setSales(parsedSales);
        console.log('🔄 Vendas recarregadas do servidor');
      }
    } catch (error) {
      console.error('❌ Erro ao recarregar vendas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Estatísticas calculadas
  const getStats = () => {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisYear = new Date(today.getFullYear(), 0, 1);

    return {
      dailyRevenue: getDailyRevenue(today),
      monthlyRevenue: getMonthlyRevenue(today),
      yearlyRevenue: getYearlyRevenue(today),
      totalSales: sales.length,
      averageSale: sales.length > 0 ? sales.reduce((sum, sale) => sum + sale.total, 0) / sales.length : 0
    };
  };

  return {
    sales,
    isLoading,
    addSale,
    getSalesByDateRange,
    getDailyRevenue,
    getMonthlyRevenue,
    getYearlyRevenue,
    refreshSales,
    getStats,
  };
}