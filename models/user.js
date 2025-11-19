const mongoose = require('mongoose');
const { Schema } = mongoose;

const USER_TYPES = ['admin', 'teacher', 'student', 'tutor'];
const USER_STATUS = ['active', 'inactive'];

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, 'O campo "name" é obrigatório.']
  },
  email: {
    type: String,
    required: [true, 'O campo "email" é obrigatório.'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Por favor, insira um e-mail válido.']
  },
  password: {
    type: String,
    required: [true, 'O campo "password" é obrigatório.'],
    minlength: [4, 'A senha deve ter no mínimo 4 caracteres.']
  },
  age: {
    type: Number,
    required: [true, 'O campo "age" é obrigatório.'],
  },
  type: {
    type: String,
    enum: {
      values: USER_TYPES,
      message: '{VALUE} não é um tipo de usuário válido.'
    },
    required: [true, 'O campo "type" é obrigatório.'],
    default: 'student'
  },
  status: {
    type: String,
    enum: {
      values: USER_STATUS,
      message: '{VALUE} não é um tipo de status válido.'
    },
    default: 'active',
    required: [true, 'O campo "status" é obrigatório.'],
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  volunteerData: {
    birthDate: { type: Date, required: false },
    cpf: { type: String, required: false },
    nationality: { type: String, required: false },
    isStudentUTFPR: { type: Boolean, required: false },
    course: { type: String, required: false },
    semester: { type: String, required: false },
    ra: { type: String, required: false },
    address: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    phone: { type: String, required: false },
  }
});

userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
}

const User = mongoose.model('user', userSchema);

module.exports = { User, USER_TYPES };