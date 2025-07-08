import { useState, useEffect } from 'react';
import { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDataPersistence } from './useDataPersistence';

const initialProducts: Product[] = [
  {
    id: '1',
    name: 'Coca-Cola 2L',
    barcode: '7894900011517',
    category: 'Refrigerante',
    brand: 'Coca-Cola',
    price: 8.50,
    cost: 5.20,
    stock: 48,
    minStock: 10,
    unit: 'unidade',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Cerveja Skol Lata 350ml',
    barcode: '7891991010924',
    category: 'Cerveja',
    brand: 'Skol',
    price: 3.20,
    cost: 2.10,
    stock: 120,
    minStock: 24,
    unit: 'unidade',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '3',
    name: 'Água Crystal 500ml',
    barcode: '7891910000147',
    category: 'Água',
    brand: 'Crystal',
    price: 2.00,
    cost: 1.20,
    stock: 8,
    minStock: 20,
    unit: 'unidade',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '4',
    name: 'Guaraná Antarctica 2L',
    barcode: '7891991010931',
    category: 'Refrigerante',
    brand: 'Antarctica',
    price: 7.80,
    cost: 4.90,
    stock: 32,
    minStock: 15,
    unit: 'unidade',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '5',
    name: 'Cerveja Brahma Long Neck',
    barcode: '7891991010948',
    category: 'Cerveja',
    brand: 'Brahma',
    price: 4.50,
    cost: 2.80,
    stock: 96,
    minStock: 30,
    unit: 'unidade',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
];

// Função para converter dados do servidor para formato local
const parseProductFromServer = (serverProduct: any): Product => ({
  id: serverProduct.id,
  name: serverProduct.name,
  barcode: serverProduct.barcode || '',
  category: serverProduct.category || '',
  brand: serverProduct.brand || '',
  price: parseFloat(serverProduct.price) || 0,
  cost: parseFloat(serverProduct.cost) || 0,
  stock: parseInt(serverProduct.stock) || 0,
  minStock: parseInt(serverProduct.min_stock || serverProduct.minStock) || 0,
  unit: serverProduct.unit || 'unidade',
  createdAt: new Date(serverProduct.created_at || serverProduct.createdAt || Date.now()),
  updatedAt: new Date(serverProduct.updated_at || serverProduct.updatedAt || Date.now()),
});

export function useProducts() {
  const { user } = useAuth();
  const { loadData, saveData } = useDataPersistence();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        console.log('📦 Carregando produtos...');
        
        const serverProducts = await loadData('products');
        
        if (serverProducts && serverProducts.length > 0) {
          console.log(`✅ ${serverProducts.length} produtos carregados do servidor`);
          const parsedProducts = serverProducts.map(parseProductFromServer);
          setProducts(parsedProducts);
        } else {
          console.log('📦 Usando produtos iniciais');
          setProducts(initialProducts);
          
          // Salvar produtos iniciais
          for (const product of initialProducts) {
            await saveData('products', 'create', product, product.id);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        // Fallback para produtos iniciais
        setProducts(initialProducts);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [user, loadData, saveData]);

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProduct: Product = {
        ...product,
        id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Atualizar estado local imediatamente
      const updatedProducts = [...products, newProduct];
      setProducts(updatedProducts);
      
      // Salvar com persistência offline
      await saveData('products', 'create', newProduct, newProduct.id);
      
      console.log('✅ Produto adicionado:', newProduct.name);
    } catch (error) {
      console.error('❌ Erro ao adicionar produto:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const updatedProducts = products.map((product) =>
        product.id === id
          ? { ...product, ...updates, updatedAt: new Date() }
          : product
      );
      
      // Atualizar estado local imediatamente
      setProducts(updatedProducts);
      
      // Encontrar produto atualizado
      const updatedProduct = updatedProducts.find(p => p.id === id);
      if (updatedProduct) {
        // Salvar com persistência offline
        await saveData('products', 'update', updatedProduct, id);
        console.log('✅ Produto atualizado:', updatedProduct.name);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar produto:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const productToDelete = products.find(p => p.id === id);
      if (!productToDelete) {
        throw new Error('Produto não encontrado');
      }
      
      // Atualizar estado local imediatamente
      const updatedProducts = products.filter((product) => product.id !== id);
      setProducts(updatedProducts);
      
      // Salvar com persistência offline
      await saveData('products', 'delete', { id }, id);
      
      console.log('✅ Produto deletado:', productToDelete.name);
    } catch (error) {
      console.error('❌ Erro ao deletar produto:', error);
      throw error;
    }
  };

  const updateStock = async (productId: string, quantity: number) => {
    try {
      await updateProduct(productId, { stock: quantity });
    } catch (error) {
      console.error('❌ Erro ao atualizar estoque:', error);
      throw error;
    }
  };

  const findByBarcode = (barcode: string) => {
    return products.find((product) => product.barcode === barcode);
  };

  // Função para recarregar produtos do servidor
  const refreshProducts = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const serverProducts = await loadData('products');
      
      if (serverProducts && serverProducts.length > 0) {
        const parsedProducts = serverProducts.map(parseProductFromServer);
        setProducts(parsedProducts);
        console.log('🔄 Produtos recarregados do servidor');
      }
    } catch (error) {
      console.error('❌ Erro ao recarregar produtos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    products,
    isLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    findByBarcode,
    refreshProducts,
  };
}