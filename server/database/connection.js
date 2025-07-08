import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar caminho do banco para Railway
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'vitana.db');
const dbDir = path.dirname(dbPath);

console.log('💾 Configurando banco de dados...');
console.log('📁 Diretório do banco:', dbDir);
console.log('📄 Arquivo do banco:', dbPath);

// Garantir que o diretório do banco existe
if (!fs.existsSync(dbDir)) {
  console.log('📁 Criando diretório do banco:', dbDir);
  fs.mkdirSync(dbDir, { recursive: true });
} else {
  console.log('✅ Diretório do banco já existe');
}

// Verificar se o arquivo do banco existe
if (fs.existsSync(dbPath)) {
  console.log('✅ Arquivo do banco já existe');
  const stats = fs.statSync(dbPath);
  console.log('📊 Tamanho do banco:', (stats.size / 1024).toFixed(2), 'KB');
} else {
  console.log('📄 Arquivo do banco será criado');
}

// Configurar SQLite para modo verbose em desenvolvimento
const sqlite = process.env.NODE_ENV === 'development' ? sqlite3.verbose() : sqlite3;

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ Erro ao conectar com o banco:', err.message);
          reject(err);
        } else {
          console.log('✅ Conectado ao banco SQLite:', dbPath);
          
          // Criar tabelas básicas se não existirem
          this.db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            business_name TEXT NOT NULL,
            business_description TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`, (err) => {
            if (err) {
              console.warn('⚠️ Erro ao criar tabela users:', err.message);
            }
          });
          
          // Configurar WAL mode para melhor performance
          this.db.run('PRAGMA journal_mode = WAL;');
          this.db.run('PRAGMA synchronous = NORMAL;');
          this.db.run('PRAGMA cache_size = 1000;');
          this.db.run('PRAGMA foreign_keys = ON;');
          
          resolve();
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('🔒 Conexão com banco fechada');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Erro SQL:', err.message);
          if (process.env.NODE_ENV === 'development') {
            console.error('📝 Query:', sql.substring(0, 100) + '...');
            console.error('📋 Params:', params);
          }
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('❌ Erro SQL:', err.message);
          if (process.env.NODE_ENV === 'development') {
            console.error('📝 Query:', sql.substring(0, 100) + '...');
            console.error('📋 Params:', params);
          }
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Erro SQL:', err.message);
          if (process.env.NODE_ENV === 'development') {
            console.error('📝 Query:', sql.substring(0, 100) + '...');
            console.error('📋 Params:', params);
          }
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Método para executar transações
  async transaction(operations) {
    await this.run('BEGIN TRANSACTION');
    try {
      const results = [];
      for (const operation of operations) {
        const result = await this.run(operation.sql, operation.params);
        results.push(result);
      }
      await this.run('COMMIT');
      return results;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }
}

// Instância singleton
const database = new Database();

export default database;