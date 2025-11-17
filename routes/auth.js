const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');

router.post('/register', async (req, res) => {
  const { name, email, password, age } = req.body;

  try {
    const user = new User({
      name,
      email,
      password,
      age,
      type: 'student'
    });

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

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor, forneça e-mail e senha.' });
  }

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Usuário inativo.' });
    }

    const payload = {
      id: user._id,
      type: user.type
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '14d' }
    );

    res.json({ token, user: user.toJSON() });

  } catch (err) {
    res.status(500).json({ message: 'Erro inesperado no servidor.' });
  }
});

module.exports = router;