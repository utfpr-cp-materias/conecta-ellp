require('dotenv').config();

const http = require('http');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const workshopsRouter = require('./routes/workshops');
const documentsRouter = require('./routes/documents');

const app = express();

const mongoURL = process.env.MONGODB_URL;

mongoose.connect(mongoURL)
  .then(() => {
    console.log('Conexão com o MongoDB Atlas estabelecida com sucesso!');
  })
  .catch((err) => {
    console.error('Erro ao conectar com o MongoDB Atlas:', err);
  });

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/workshops', workshopsRouter);
app.use('/api/documents', documentsRouter);

app.use((req, res, next) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

const PORT = process.env.PORT || 4000;
http.createServer(app).listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;