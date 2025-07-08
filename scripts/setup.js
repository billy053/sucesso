#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔧 Configurando Sistema Vitana...');

// Verificar Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error('❌ Node.js 18+ é necessário. Versão atual:', nodeVersion);
  process.exit(1);
}

console.log('✅ Node.js version:', nodeVersion);

// Criar diretórios necessários
const directories = [
  'server',
  'server/database',
  'server/routes',
  'server/middleware',
  'server/scripts',
  'dist',
  'logs'
];

directories.forEach(dir => {
  const fullPath = path.join(rootDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log('📁 Criado diretório:', dir);
  }
});

// Verificar arquivos essenciais
const essentialFiles = [
  'package.json',
  'server/package.json',
  'server/server.js',
  'vite.config.ts',
  'tsconfig.json'
];

const missingFiles = essentialFiles.filter(file => 
  !fs.existsSync(path.join(rootDir, file))
);

if (missingFiles.length > 0) {
  console.error('❌ Arquivos essenciais faltando:', missingFiles);
  process.exit(1);
}

console.log('✅ Todos os arquivos essenciais estão presentes');

// Instalar dependências
try {
  console.log('📦 Instalando dependências do projeto principal...');
  execSync('npm install', { 
    cwd: rootDir, 
    stdio: 'inherit',
    timeout: 300000 // 5 minutos
  });
  
  console.log('📦 Instalando dependências do servidor...');
  execSync('npm install', { 
    cwd: path.join(rootDir, 'server'), 
    stdio: 'inherit',
    timeout: 300000 // 5 minutos
  });
  
  console.log('✅ Todas as dependências instaladas com sucesso');
} catch (error) {
  console.error('❌ Erro ao instalar dependências:', error.message);
  process.exit(1);
}

// Verificar se o build funciona
try {
  console.log('🔨 Testando build...');
  execSync('npm run typecheck', { 
    cwd: rootDir, 
    stdio: 'inherit',
    timeout: 120000 // 2 minutos
  });
  
  console.log('✅ TypeScript check passou');
} catch (error) {
  console.warn('⚠️ Aviso no TypeScript check:', error.message);
}

// Criar arquivo de status
const statusFile = path.join(rootDir, '.setup-complete');
fs.writeFileSync(statusFile, JSON.stringify({
  setupDate: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch
}, null, 2));

console.log('🎉 Setup completo!');
console.log('');
console.log('📋 Próximos passos:');
console.log('  1. npm run dev:full    # Iniciar desenvolvimento completo');
console.log('  2. npm run build       # Fazer build para produção');
console.log('  3. npm start           # Iniciar servidor de produção');
console.log('');
console.log('🔗 URLs:');
console.log('  Frontend: http://localhost:3000');
console.log('  Backend:  http://localhost:3001');
console.log('  Health:   http://localhost:3001/health');