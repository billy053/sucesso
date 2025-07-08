import { useState, useEffect } from 'react';
import { Sale } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

const getStorageKey = (businessId: string) => `business-${businessId}-sales`;

export function useSales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const loadSales = async () => {
      try {
        const serverSales = await apiService.getSales();
        if (serverSales && serverSales.length > 0) {
          const parsedSales = serverSales.map((s: any) => ({
            ...s,
            date: new Date(s.created_at || s.date),
            items: s.items || []
          }));
          setSales(parsedSales);
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar vendas do servidor:', error);
      }
      
      // Fallback para dados locais
      const storageKey = getStorageKey(user.businessId);
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsedSales = JSON.parse(stored).map((s: any) => ({
          ...s,
          date: new Date(s.date),
        }));
        setSales(parsedSales);
      }
        const stored = localStorage.getItem(storageKey);
    };

    loadSales();
  }, [user]);

  const saveSales = async (updatedSales: Sale[]) => {
    if (!user) return;
    
    setSales(updatedSales);
    
    // Backup local
    const storageKey = getStorageKey(user.businessId);
    localStorage.setItem(storageKey, JSON.stringify(updatedSales));
  };

  const addSale = async (sale: Omit<Sale, 'id' | 'date'>) => {
    try {
      const serverSale = await apiService.createSale(sale);
      if (serverSale) {
        const newSale: Sale = {
          ...serverSale,
          date: new Date(serverSale.created_at || serverSale.date),
          items: serverSale.items || sale.items
        };
        const updatedSales = [...sales, newSale];
        setSales(updatedSales);
        
        // Backup local
        const storageKey = getStorageKey(user.businessId);
        localStorage.setItem(storageKey, JSON.stringify(updatedSales));
        return;
      }
    } catch (error) {
      console.error('Erro ao criar venda no servidor:', error);
    }
    
    // Fallback para criação local
    const newSale: Sale = {
      ...sale,
      id: Date.now().toString(),
      date: new Date(),
    };
    const updatedSales = [...sales, newSale];
    await saveSales(updatedSales);
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

  return {
    sales,
    addSale,
    getSalesByDateRange,
    getDailyRevenue,
    getMonthlyRevenue,
    getYearlyRevenue,
  };
}