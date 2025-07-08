import jwt from 'jsonwebtoken';
import database from '../database/connection.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Se for super admin, pular verificação de usuário
    if (decoded.isSuperAdmin) {
      req.user = { isSuperAdmin: true };
      return next();
    }
    
    // Conectar ao banco se necessário
    if (!database.db) {
      await database.connect();
    }
    
    // Verificar se o usuário ainda existe e está ativo
    const user = await database.get(`
      SELECT u.*, uc.role, uc.username
      FROM users u
      JOIN user_credentials uc ON u.id = uc.user_id
      WHERE u.id = ? AND u.status = 'approved' AND uc.id = ?
    `, [decoded.userId, decoded.credentialId]);

    if (!user) {
      return res.status(401).json({ error: 'Token inválido ou usuário inativo' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      username: user.username,
      businessId: decoded.businessId || 'default-business'
    };

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(403).json({ error: 'Token inválido' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (req.user.isSuperAdmin) {
      return next(); // Super admin tem acesso a tudo
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireOperator = requireRole(['admin', 'operator']);