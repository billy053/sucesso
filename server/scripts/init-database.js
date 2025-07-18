import database from '../database/connection.js';
import bcrypt from 'bcryptjs';

const initDatabase = async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Inicializando banco de dados...');
      console.log('📁 Diretório atual:', process.cwd());
      console.log('💾 Caminho do banco:', process.env.DATABASE_PATH || 'padrão');
    }
    
    await database.connect();

    // Criar tabelas
    if (process.env.NODE_ENV === 'development') {
      console.log('📋 Criando tabelas...');
    }

    // Tabela de usuários e autenticação
    await database.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        business_name TEXT NOT NULL,
        business_description TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'restricted')),
        rejection_reason TEXT,
        restriction_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at DATETIME,
        restricted_at DATETIME
      )
    `);

    // Tabela de credenciais (senhas)
    await database.run(`
      CREATE TABLE IF NOT EXISTS user_credentials (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, username)
      )
    `);

    // Tabela de estabelecimentos
    await database.run(`
      CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subtitle TEXT,
        logo_url TEXT,
        use_custom_logo BOOLEAN DEFAULT FALSE,
        plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
        owner_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users (id)
      )
    `);

    // Tabela de produtos
    await database.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        name TEXT NOT NULL,
        barcode TEXT,
        category TEXT,
        brand TEXT,
        price DECIMAL(10,2) NOT NULL,
        cost DECIMAL(10,2),
        stock INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 0,
        unit TEXT DEFAULT 'unidade',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
      )
    `);

    // Tabela de vendas
    await database.run(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        payment_method TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Tabela de itens de venda
    await database.run(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
    `);

    // Tabela de movimentações de estoque
    await database.run(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
        quantity INTEGER NOT NULL,
        reason TEXT,
        unit_cost DECIMAL(10,2),
        total_cost DECIMAL(10,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
    `);

    // Tabela de NFCe
    await database.run(`
      CREATE TABLE IF NOT EXISTS nfce (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        sale_id TEXT NOT NULL,
        numero INTEGER NOT NULL,
        serie INTEGER NOT NULL,
        chave_acesso TEXT,
        status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'autorizada', 'rejeitada', 'cancelada')),
        protocolo_autorizacao TEXT,
        motivo_rejeicao TEXT,
        xml_gerado TEXT,
        xml_autorizado TEXT,
        valor_total DECIMAL(10,2) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        authorized_at DATETIME,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
        FOREIGN KEY (sale_id) REFERENCES sales (id)
      )
    `);

    // Tabela de configurações
    await database.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
        UNIQUE(business_id, key)
      )
    `);

    // Criar índices para performance
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Criando índices...');
    }
    
    await database.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_users_status ON users (status)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON user_credentials (user_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_products_business_id ON products (business_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_sales_business_id ON sales (business_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements (product_id)');

    // Inserir dados iniciais
    if (process.env.NODE_ENV === 'development') {
      console.log('📦 Inserindo dados iniciais...');
    }

    // Verificar se já existe um estabelecimento padrão
    const existingBusiness = await database.get('SELECT id FROM businesses LIMIT 1');
    
    if (!existingBusiness) {
      // Criar estabelecimento padrão
      const businessId = 'default-business';
      await database.run(`
        INSERT INTO businesses (id, name, subtitle, plan)
        VALUES (?, ?, ?, ?)
      `, [businessId, 'Sistema de Gestão', 'Depósito de Bebidas', 'free']);

      // Inserir produtos iniciais
      const initialProducts = [
        {
          id: 'prod-1',
          name: 'Coca-Cola 2L',
          barcode: '7894900011517',
          category: 'Refrigerante',
          brand: 'Coca-Cola',
          price: 8.50,
          cost: 5.20,
          stock: 48,
          minStock: 10
        },
        {
          id: 'prod-2',
          name: 'Cerveja Skol Lata 350ml',
          barcode: '7891991010924',
          category: 'Cerveja',
          brand: 'Skol',
          price: 3.20,
          cost: 2.10,
          stock: 120,
          minStock: 24
        },
        {
          id: 'prod-3',
          name: 'Água Crystal 500ml',
          barcode: '7891910000147',
          category: 'Água',
          brand: 'Crystal',
          price: 2.00,
          cost: 1.20,
          stock: 8,
          minStock: 20
        },
        {
          id: 'prod-4',
          name: 'Guaraná Antarctica 2L',
          barcode: '7891991010931',
          category: 'Refrigerante',
          brand: 'Antarctica',
          price: 7.80,
          cost: 4.90,
          stock: 32,
          minStock: 15
        },
        {
          id: 'prod-5',
          name: 'Cerveja Brahma Long Neck',
          barcode: '7891991010948',
          category: 'Cerveja',
          brand: 'Brahma',
          price: 4.50,
          cost: 2.80,
          stock: 96,
          minStock: 30
        }
      ];

      for (const product of initialProducts) {
        await database.run(`
          INSERT INTO products (id, business_id, name, barcode, category, brand, price, cost, stock, min_stock, unit)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          product.id,
          businessId,
          product.name,
          product.barcode,
          product.category,
          product.brand,
          product.price,
          product.cost,
          product.stock,
          product.minStock,
          'unidade'
        ]);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Produtos iniciais inseridos');
      }
      
      // Inserir usuário demo para testes
      const demoUserId = 'demo-user-1';
      
      if (process.env.NODE_ENV === 'development') {
        console.log('👤 Criando usuário demo...');
      }
      await database.run(`
        INSERT OR IGNORE INTO users (id, email, full_name, business_name, business_description, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [demoUserId, 'admin@vitana.com', 'Administrador Demo', 'Vitana Demo', 'Estabelecimento de demonstração', 'approved']);
      
      // Inserir credenciais demo
      const bcrypt = await import('bcryptjs');
      await database.run(`
        INSERT OR IGNORE INTO user_credentials (id, user_id, username, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
      `, ['cred-admin-1', demoUserId, 'admin', await bcrypt.hash('admin123', 12), 'admin']);
      
      await database.run(`
        INSERT OR IGNORE INTO user_credentials (id, user_id, username, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
      `, ['cred-op-1', demoUserId, 'operador', await bcrypt.hash('operador123', 12), 'operator']);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Usuário demo criado');
        console.log('📧 Email: admin@vitana.com');
        console.log('👤 Admin: admin / admin123');
        console.log('👨‍💼 Operador: operador / operador123');
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🎉 Banco de dados inicializado com sucesso!');
    }
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Erro ao inicializar banco:', error);
      console.warn('⚠️ Continuando sem banco inicializado...');
    }
  } finally {
    try {
      await database.close();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Erro ao fechar banco:', error);
      }
    }
  }
};

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase().catch(console.error);
}

export default initDatabase;