import { useState, useEffect } from 'react';
import { StockMovement } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

const getStorageKey = (businessId: string) => `business-${businessId}-movements`;

export function useStockMovements() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const loadMovements = async () => {
      try {
        const serverMovements = await apiService.getStockMovements();
        if (serverMovements && serverMovements.length > 0) {
          const parsedMovements = serverMovements.map((m: any) => ({
            ...m,
            date: new Date(m.created_at || m.date),
          }));
          setMovements(parsedMovements);
          
          // Backup local
          const storageKey = getStorageKey(user.businessId);
          localStorage.setItem(storageKey, JSON.stringify(parsedMovements));
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar movimentações do servidor:', error);
      }
      
      // Fallback para dados locais
      const storageKey = getStorageKey(user.businessId);
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsedMovements = JSON.parse(stored).map((m: any) => ({
          ...m,
          date: new Date(m.date),
        }));
        setMovements(parsedMovements);
      }
    };

    loadMovements();
  }, [user]);

  const saveMovements = async (updatedMovements: StockMovement[]) => {
    if (!user?.businessId) return;
    
    setMovements(updatedMovements);
    
    // Backup local
    const storageKey = getStorageKey(user.businessId);
    localStorage.setItem(storageKey, JSON.stringify(updatedMovements));
  };

  const addMovement = async (movement: Omit<StockMovement, 'id' | 'date'>) => {
    try {
      const serverMovement = await apiService.addStockMovement(movement);
      if (serverMovement) {
        const newMovement: StockMovement = {
          ...serverMovement,
          date: new Date(serverMovement.created_at || serverMovement.date),
        };
        const updatedMovements = [...movements, newMovement];
        setMovements(updatedMovements);
        
        // Backup local
        if (user?.businessId) {
          const storageKey = getStorageKey(user.businessId);
          localStorage.setItem(storageKey, JSON.stringify(updatedMovements));
        }
        return;
      }
    } catch (error) {
      console.error('Erro ao criar movimentação no servidor:', error);
    }
    
    // Fallback para criação local
    const newMovement: StockMovement = {
      ...movement,
      id: Date.now().toString(),
      date: new Date(),
    };
    const updatedMovements = [...movements, newMovement];
    await saveMovements(updatedMovements);
  };

  const getMovementsByProduct = (productId: string) => {
    return movements.filter((movement) => movement.productId === productId);
  };

  const getMovementsByDateRange = (startDate: Date, endDate: Date) => {
    return movements.filter(
      (movement) => movement.date >= startDate && movement.date <= endDate
    );
  };

  return {
    movements,
    addMovement,
    getMovementsByProduct,
    getMovementsByDateRange,
  };
}