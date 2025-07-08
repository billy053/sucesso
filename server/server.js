import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar variáveis de ambiente padrão se não existirem
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'vitana-jwt-secret-key-2024';
}

if (!process.env.SUPER_ADMIN_PASSWORD) {
  process.env.SUPER_ADMIN_PASSWORD = 'SuperAdmin2024!';
}

// Configurar DATABASE_PATH
if (!process.env.DATABASE_PATH) {
  process.env.DATABASE_PATH = path.join(__dirname, 'database', 'vitana.db');
}

console.log('🚀 Iniciando servidor na porta', PORT);

// Health check PRIMEIRO - antes de qualquer middleware
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    port: PORT,
    pid: process.pid
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    port: PORT,
    pid: process.pid
  });
});

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configurado
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Business-ID']
}));

// Middleware de logging
app.use((req, res, next) => {
  if (!req.path.includes('/health')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

// Servir arquivos estáticos do front-end
const staticPath = path.join(__dirname, '../dist');
app.use(express.static(staticPath));

// Importar e usar rotas
let routesLoaded = false;

const loadRoutes = async () => {
  try {
    console.log('📋 Carregando rotas...');
    
    const authRoutes = await import('./routes/auth.js');
    const businessRoutes = await import('./routes/business.js');
    const productRoutes = await import('./routes/products.js');
    const salesRoutes = await import('./routes/sales.js');
    const stockRoutes = await import('./routes/stock.js');
    const reportsRoutes = await import('./routes/reports.js');
    const nfceRoutes = await import('./routes/nfce.js');

    // Rotas da API
    app.use('/api/auth', authRoutes.default);
    app.use('/api/business', businessRoutes.default);
    app.use('/api/products', productRoutes.default);
    app.use('/api/sales', salesRoutes.default);
    app.use('/api/stock', stockRoutes.default);
    app.use('/api/reports', reportsRoutes.default);
    app.use('/api/nfce', nfceRoutes.default);
    
    console.log('✅ Rotas carregadas com sucesso');
    routesLoaded = true;
  } catch (error) {
    console.error('❌ Erro ao carregar rotas:', error);
    // Continuar mesmo com erro nas rotas
  }
};

// Rota catch-all para SPA (deve vir por último)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Erro ao servir index.html:', err);
      res.status(500).send('Erro interno do servidor');
    }
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('❌ Erro no servidor:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Inicializar servidor
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('🎉 SERVIDOR INICIADO COM SUCESSO!');
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  
  // Carregar rotas após servidor estar rodando
  await loadRoutes();
  
  // Inicializar banco após rotas carregadas
  setTimeout(async () => {
    try {
      console.log('🔧 Inicializando banco de dados...');
      const { default: initDatabase } = await import('./scripts/init-database.js');
      await initDatabase();
      console.log('✅ Banco de dados inicializado');
    } catch (error) {
      console.warn('⚠️ Erro ao inicializar banco:', error.message);
    }
  }, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Encerrando servidor...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Encerrando servidor...');
  server.close(() => {
    process.exit(0);
  });
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada:', reason);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

console.log('📋 Servidor configurado e aguardando conexões...');