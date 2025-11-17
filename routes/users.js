const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models/user');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.post('/', isAuthenticated, async (req, res) => {
  const { name, email, password, age, type } = req.body;
  const requesterType = req.user.type;

  try {
    if (type === 'admin' && requesterType !== 'admin') {
      return res.status(403).json({ message: 'Apenas administradores podem criar outros administradores.' });
    }

    if ((type === 'teacher' || type === 'tutor') && !['admin', 'teacher'].includes(requesterType)) {
      return res.status(403).json({ message: 'Apenas administradores ou professores podem criar tutores e professores.' });
    }

    const user = new User({ name, email, password, age, type });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    const newUser = await user.save();
    res.status(201).json(newUser);

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'O e-mail informado já está em uso.' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ message: messages[0] });
    }
    res.status(500).json({ message: 'Erro inesperado no servidor.' });
  }
});

router.get('/me', isAuthenticated, (req, res) => {
  res.json(req.user);
});

router.get('/', [isAuthenticated, isAdmin], async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar usuários.' });
  }
});

router.post('/activate/:id', [isAuthenticated, isAdmin], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao ativar usuário.' });
  }
});

router.post('/deactivate/:id', [isAuthenticated, isAdmin], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao desativar usuário.' });
  }
});

module.exports = router;