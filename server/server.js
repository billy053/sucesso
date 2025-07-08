import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar variáveis de ambiente padrão
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

console.log('🚀 Iniciando Sistema Vitana v2.0.0');
console.log('📍 Porta:', PORT);
console.log('🌍 Ambiente:', process.env.NODE_ENV || 'development');

// Health check PRIMEIRO - antes de qualquer middleware
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    port: PORT,
    pid: process.pid,
    memory: process.memoryUsage()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    api: 'active',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS otimizado
app.use(cors({
  origin: function(origin, callback) {
    // Em desenvolvimento, permitir qualquer origem
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Permitir requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Lista de origens permitidas
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Business-ID', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Limite de requisições
  message: { error: 'Muitas requisições, tente novamente em 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitar CSP para desenvolvimento
  crossOriginEmbedderPolicy: false
}));

// Middleware de logging
app.use((req, res, next) => {
  if (!req.path.includes('/health')) {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.path} - ${req.ip}`);
  }
  next();
});

// Servir arquivos estáticos do front-end
const staticPath = path.join(__dirname, '../dist');
console.log('📂 Servindo arquivos estáticos de:', staticPath);

if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true
  }));
  console.log('✅ Arquivos estáticos configurados');
} else {
  console.warn('⚠️ Diretório de arquivos estáticos não encontrado:', staticPath);
}

// Inicializar banco de dados
let dbInitialized = false;

const initializeDatabase = async () => {
  if (dbInitialized) return true;
  
  try {
    console.log('🔧 Inicializando banco de dados...');
    
    // Verificar se o arquivo de inicialização existe
    const initPath = path.join(__dirname, 'scripts', 'init-database.js');
    if (!fs.existsSync(initPath)) {
      console.warn('⚠️ Script de inicialização não encontrado:', initPath);
      return false;
    }
    
    const { default: initDatabase } = await import('./scripts/init-database.js');
    await initDatabase();
    dbInitialized = true;
    console.log('✅ Banco de dados inicializado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error.message);
    return false;
  }
};

// Middleware para garantir que o banco está inicializado
const ensureDatabase = async (req, res, next) => {
  if (!dbInitialized) {
    const success = await initializeDatabase();
    if (!success) {
      return res.status(503).json({ 
        error: 'Serviço temporariamente indisponível',
        message: 'Banco de dados não está pronto. Tente novamente em alguns segundos.',
        retry: true
      });
    }
  }
  next();
};

// Aplicar middleware de banco apenas nas rotas da API
app.use('/api', ensureDatabase);

// Carregar rotas da API
const loadRoutes = async () => {
  try {
    console.log('📋 Carregando rotas da API...');
    
    // Verificar se os arquivos de rota existem
    const routeFiles = [
      'auth.js',
      'business.js', 
      'products.js',
      'sales.js',
      'stock.js',
      'reports.js',
      'nfce.js'
    ];
    
    const routesPath = path.join(__dirname, 'routes');
    const existingRoutes = [];
    
    for (const file of routeFiles) {
      const filePath = path.join(routesPath, file);
      if (fs.existsSync(filePath)) {
        existingRoutes.push(file);
      } else {
        console.warn(`⚠️ Arquivo de rota não encontrado: ${file}`);
      }
    }
    
    // Carregar apenas as rotas que existem
    for (const routeFile of existingRoutes) {
      try {
        const routeModule = await import(`./routes/${routeFile}`);
        const routeName = routeFile.replace('.js', '');
        app.use(`/api/${routeName}`, routeModule.default);
        console.log(`✅ Rota carregada: /api/${routeName}`);
      } catch (error) {
        console.error(`❌ Erro ao carregar rota ${routeFile}:`, error.message);
      }
    }
    
    console.log(`✅ ${existingRoutes.length} rotas carregadas com sucesso`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao carregar rotas:', error.message);
    return false;
  }
};

// Rota de fallback para APIs não encontradas
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint não encontrado',
    path: req.path,
    method: req.method,
    available: [
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/products',
      'GET /api/sales'
    ]
  });
});

// Rota catch-all para SPA (deve vir por último)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <html>
        <head><title>Sistema Vitana</title></head>
        <body>
          <h1>Sistema Vitana</h1>
          <p>Aplicação não encontrada. Execute o build primeiro:</p>
          <pre>npm run build</pre>
          <p><a href="/health">Health Check</a></p>
        </body>
      </html>
    `);
  }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('❌ Erro no servidor:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'Acesso negado pelo CORS' });
  }
  
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado',
    timestamp: new Date().toISOString()
  });
});

// Inicializar servidor
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('🎉 SERVIDOR INICIADO COM SUCESSO!');
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`💾 Banco: ${process.env.DATABASE_PATH}`);
  
  // Inicializar banco de dados
  await initializeDatabase();
  
  // Carregar rotas após banco inicializado
  await loadRoutes();
  
  console.log('📋 Sistema pronto para receber requisições');
  console.log('🔗 Acesse: http://localhost:' + PORT);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`🛑 Recebido ${signal}, encerrando servidor graciosamente...`);
  
  server.close(async () => {
    console.log('🔒 Servidor HTTP fechado');
    
    try {
      // Fechar conexão com banco se existir
      const database = await import('./database/connection.js');
      if (database.default) {
        await database.default.close();
        console.log('🔒 Banco de dados fechado');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao fechar banco:', error.message);
    }
    
    console.log('✅ Shutdown completo');
    process.exit(0);
  });
  
  // Forçar saída após 10 segundos
  setTimeout(() => {
    console.error('❌ Forçando saída após timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  if (process.env.NODE_ENV === 'production') {
    console.error('🔄 Reiniciando processo...');
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
  console.error('📍 Promise:', promise);
  if (process.env.NODE_ENV === 'production') {
    console.error('🔄 Reiniciando processo...');
    process.exit(1);
  }
});

console.log('📋 Servidor configurado e aguardando conexões...');