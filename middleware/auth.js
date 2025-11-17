const jwt = require('jsonwebtoken');
const { User } = require('../models/user');

async function isAuthenticated(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ message: 'Token não fornecido.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido.' });
    }

    try {
      const user = await User.findById(decoded.id);
      if (!user || user.status === 'inactive') {
        return res.status(403).json({ message: 'Usuário não encontrado ou inativo.' });
      }
      req.user = user;
      next();
    } catch (dbError) {
      res.status(500).json({ message: 'Erro no servidor ao validar usuário.' });
    }
  });
}

function isAdmin(req, res, next) {
  if (req.user && req.user.type === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador.' });
  }
}

function isTeacherOrAdmin(req, res, next) {
  if (req.user && (req.user.type === 'admin' || req.user.type === 'teacher')) {
    next();
  } else {
    res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador ou professor.' });
  }
}

function isStudent(req, res, next) {
  if (req.user && req.user.type === 'student') {
    next();
  } else {
    res.status(403).json({ message: 'Acesso negado. Ação permitida apenas para alunos.' });
  }
}

module.exports = { isAuthenticated, isAdmin, isTeacherOrAdmin, isStudent };