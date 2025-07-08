import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import database from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Super Admin Login
router.post('/super-admin', async (req, res) => {
  try {
    const { password } = req.body;

    if (password !== process.env.SUPER_ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const token = jwt.sign(
      { isSuperAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, 
      token,
      user: { isSuperAdmin: true }
    });
  } catch (error) {
    console.error('Erro no login super admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Solicitar acesso
router.post('/request-access', async (req, res) => {
  try {
    console.log('📥 Recebendo solicitação de acesso...');
    console.log('📦 Body:', req.body);
    
    const { fullName, email, businessName, businessDescription } = req.body;

    // Validar dados obrigatórios
    if (!fullName || !email || !businessName) {
      console.log('❌ Dados obrigatórios faltando');
      return res.status(400).json({ error: 'Nome completo, email e nome do estabelecimento são obrigatórios' });
    }

    console.log('📝 Nova solicitação válida:', { fullName, email, businessName });

    // Conectar ao banco se necessário
    if (!database.db) {
      await database.connect();
    }

    // Verificar se já existe solicitação
    const existing = await database.get(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existing) {
      console.log('⚠️ Solicitação já existe para:', email);
      return res.status(400).json({ error: 'Já existe uma solicitação para este email' });
    }

    const userId = uuidv4();
    await database.run(`
      INSERT INTO users (id, email, full_name, business_name, business_description, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `, [userId, email.toLowerCase(), fullName, businessName, businessDescription]);

    console.log('✅ Solicitação criada com ID:', userId);
    res.json({ success: true, message: 'Solicitação enviada com sucesso' });
  } catch (error) {
    console.error('Erro ao solicitar acesso:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
});

// Configurar senhas duplas
router.post('/setup-passwords', async (req, res) => {
  try {
    console.log('🔧 Configurando senhas duplas...');
    const { email, adminCredentials, operatorCredentials } = req.body;

    console.log('🔧 Configurando senhas duplas para:', email);

    // Conectar ao banco se necessário
    if (!database.db) {
      await database.connect();
    }

    // Verificar se usuário está aprovado
    const user = await database.get(
      'SELECT * FROM users WHERE email = ? AND status = ?',
      [email.toLowerCase(), 'approved']
    );

    if (!user) {
      console.log('❌ Usuário não encontrado ou não aprovado:', email);
      return res.status(404).json({ error: 'Usuário não encontrado ou não aprovado' });
    }

    // Verificar se já tem credenciais
    const existingCredentials = await database.get(
      'SELECT id FROM user_credentials WHERE user_id = ?',
      [user.id]
    );

    if (existingCredentials) {
      console.log('⚠️ Credenciais já existem para:', email);
      return res.status(400).json({ error: 'Credenciais já configuradas' });
    }

    // Hash das senhas
    const adminPasswordHash = await bcrypt.hash(adminCredentials.password, 12);
    const operatorPasswordHash = await bcrypt.hash(operatorCredentials.password, 12);

    console.log('🔐 Criando credenciais admin e operador...');

    // Inserir credenciais
    await database.transaction([
      {
        sql: `INSERT INTO user_credentials (id, user_id, username, password_hash, role)
              VALUES (?, ?, ?, ?, 'admin')`,
        params: [uuidv4(), user.id, adminCredentials.username, adminPasswordHash]
      },
      {
        sql: `INSERT INTO user_credentials (id, user_id, username, password_hash, role)
              VALUES (?, ?, ?, ?, 'operator')`,
        params: [uuidv4(), user.id, operatorCredentials.username, operatorPasswordHash]
      }
    ]);

    console.log('✅ Senhas duplas configuradas com sucesso para:', email);

    res.json({ success: true, message: 'Credenciais configuradas com sucesso' });
  } catch (error) {
    console.error('Erro ao configurar senhas:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    console.log('🔐 Tentativa de login:', { email, username, role: 'detectando...' });

    // Conectar ao banco se necessário
    if (!database.db) {
      await database.connect();
    }

    // Buscar usuário e credenciais
    const userWithCredentials = await database.get(`
      SELECT u.*, uc.id as credential_id, uc.username, uc.password_hash, uc.role
      FROM users u
      JOIN user_credentials uc ON u.id = uc.user_id
      WHERE u.email = ? AND uc.username = ? AND u.status = 'approved'
    `, [email.toLowerCase(), username]);

    if (!userWithCredentials) {
      console.log('❌ Credenciais não encontradas para:', email, username);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    console.log('👤 Usuário encontrado:', userWithCredentials.full_name, 'Role:', userWithCredentials.role);

    // Verificar senha
    const passwordValid = await bcrypt.compare(password, userWithCredentials.password_hash);
    if (!passwordValid) {
      console.log('❌ Senha inválida para:', email);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Atualizar último login
    await database.run(
      'UPDATE user_credentials SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [userWithCredentials.credential_id]
    );

    // Gerar token
    const token = jwt.sign(
      {
        userId: userWithCredentials.id,
        credentialId: userWithCredentials.credential_id,
        role: userWithCredentials.role,
        businessId: 'default-business'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Login realizado com sucesso:', userWithCredentials.full_name);

    res.json({
      success: true,
      token,
      user: {
        id: userWithCredentials.id,
        email: userWithCredentials.email,
        name: userWithCredentials.full_name,
        username: userWithCredentials.username,
        role: userWithCredentials.role,
        businessId: 'default-business'
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
});

// Verificar status do usuário
router.post('/check-status', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔍 Verificando status para email:', email);

    // Conectar ao banco se necessário
    if (!database.db) {
      await database.connect();
    }

    const user = await database.get(
      'SELECT status FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      console.log('❌ Usuário não encontrado:', email);
      return res.json({ status: 'not_found' });
    }

    console.log('✅ Status do usuário:', user.status);

    if (user.status === 'approved') {
      // Verificar se já tem credenciais
      const hasCredentials = await database.get(
        'SELECT id FROM user_credentials WHERE user_id = (SELECT id FROM users WHERE email = ?)',
        [email.toLowerCase()]
      );

      console.log('🔑 Tem credenciais:', !!hasCredentials);

      return res.json({ 
        status: hasCredentials ? 'ready' : 'needs_setup'
      });
    }

    res.json({ status: user.status });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
});

// Verificar token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

// Listar solicitações (Super Admin)
router.get('/requests', async (req, res) => {
  try {
    // Conectar ao banco se necessário
    if (!database.db) {
      await database.connect();
    }

    const requests = await database.all(`
      SELECT id, email, full_name, business_name, business_description, 
             status, rejection_reason, created_at
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json(requests);
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
});

// Aprovar acesso (Super Admin)
router.post('/approve/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Conectar ao banco se necessário
    if (!database.db) {
      await database.connect();
    }

    await database.run(`
      UPDATE users 
      SET status = 'approved', approved_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [userId]);

    res.json({ success: true, message: 'Acesso aprovado' });
  } catch (error) {
    console.error('Erro ao aprovar acesso:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
});

// Rejeitar acesso (Super Admin)
router.post('/reject/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    // Conectar ao banco se necessário
    if (!database.db) {
      await database.connect();
    }

    await database.run(`
      UPDATE users 
      SET status = 'rejected', rejection_reason = ? 
      WHERE id = ?
    `, [reason, userId]);

    res.json({ success: true, message: 'Acesso rejeitado' });
  } catch (error) {
    console.error('Erro ao rejeitar acesso:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
});

export default router;