const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models/user');
const { Workshop } = require('../models/workshop');
const { isAuthenticated, isAdmin, isTeacherOrAdmin } = require('../middleware/auth');

router.post('/', isAuthenticated, async (req, res) => {
  const { name, email, password, age, type, volunteerData } = req.body;
  const requesterType = req.user.type;

  try {
    if (type === 'admin' && requesterType !== 'admin') {
      return res.status(403).json({ message: 'Apenas administradores podem criar outros administradores.' });
    }
    if ((type === 'teacher' || type === 'tutor') && !['admin', 'teacher'].includes(requesterType)) {
      return res.status(403).json({ message: 'Apenas administradores ou professores podem criar tutores e professores.' });
    }

    const user = new User({ name, email, password, age, type, volunteerData });
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

router.patch('/me', isAuthenticated, async (req, res) => {
  const { name, email, age, volunteerData } = req.body;

  try {
    const userToUpdate = await User.findById(req.user._id);
    if (!userToUpdate) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    userToUpdate.name = name || userToUpdate.name;
    userToUpdate.email = email || userToUpdate.email;
    userToUpdate.age = age || userToUpdate.age;

    if (volunteerData) {
      if (!userToUpdate.volunteerData) {
        userToUpdate.volunteerData = {};
      }
      Object.assign(userToUpdate.volunteerData, volunteerData);
      userToUpdate.markModified('volunteerData');
    }

    const savedUser = await userToUpdate.save();
    res.json(savedUser);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Este e-mail já está em uso.' });
    }
    res.status(500).json({ message: 'Erro ao atualizar perfil.' });
  }
});

router.patch('/:id', [isAuthenticated, isTeacherOrAdmin], async (req, res) => {
  const { name, email, age, type, volunteerData } = req.body;

  try {
    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    userToUpdate.name = name || userToUpdate.name;
    userToUpdate.email = email || userToUpdate.email;
    userToUpdate.age = age || userToUpdate.age;
    userToUpdate.type = type || userToUpdate.type;

    if (volunteerData) {
      if (!userToUpdate.volunteerData) {
        userToUpdate.volunteerData = {};
      }
      Object.assign(userToUpdate.volunteerData, volunteerData);
      userToUpdate.markModified('volunteerData');
    }

    const savedUser = await userToUpdate.save();
    res.json(savedUser);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'O e-mail informado já está em uso.' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ message: messages[0] });
    }
    console.error("ERRO AO ATUALIZAR USUÁRIO:", err);
    res.status(500).json({ message: 'Erro ao atualizar usuário.' });
  }
});

router.get('/', [isAuthenticated, isTeacherOrAdmin], async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar usuários.' });
  }
});

router.post('/activate/:id', [isAuthenticated, isTeacherOrAdmin], async (req, res) => {
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

router.post('/deactivate/:id', [isAuthenticated, isTeacherOrAdmin], async (req, res) => {
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

router.delete('/:id', [isAuthenticated, isTeacherOrAdmin], async (req, res) => {
  try {
    const userIdToDelete = req.params.id;

    const user = await User.findByIdAndDelete(userIdToDelete);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    if (user.type === 'student') {
      await Workshop.updateMany(
        { enrolledStudents: userIdToDelete },
        {
          $pull: { enrolledStudents: userIdToDelete },
          $inc: { 'vacancies.filled': -1 }
        }
      );
    }

    if (user.type === 'teacher') {
      await Workshop.updateMany(
        { teachers: userIdToDelete },
        { $pull: { teachers: userIdToDelete } }
      );
    }

    if (user.type === 'tutor') {
      await Workshop.updateMany(
        { tutors: userIdToDelete },
        { $pull: { tutors: userIdToDelete } }
      );
    }

    res.status(200).json({ message: 'Usuário removido e referências atualizadas com sucesso.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover usuário.' });
  }
});

router.post('/change-password', isAuthenticated, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Senha antiga e nova senha são obrigatórias.' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ message: 'A nova senha deve ter no mínimo 4 caracteres.' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'A senha antiga está incorreta.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error("ERRO AO ALTERAR SENHA:", err);
    res.status(500).json({ message: 'Erro ao alterar senha.' });
  }
});

module.exports = router;