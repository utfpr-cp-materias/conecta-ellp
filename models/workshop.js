const mongoose = require('mongoose');
const { Schema } = mongoose;

const workshopStatusEnum = ['scheduled', 'ongoing', 'completed', 'cancelled'];

const attendanceSchema = new Schema({
  date: {
    type: Date,
    default: Date.now
  },
  takenBy: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  presentStudents: [{
    type: Schema.Types.ObjectId,
    ref: 'user'
  }]
});

const workshopSchema = new Schema({
  name: {
    type: String,
    required: [true, 'O nome da oficina é obrigatório.'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'A descrição da oficina é obrigatória.']
  },
  status: {
    type: String,
    enum: workshopStatusEnum,
    default: 'scheduled'
  },
  startDate: {
    type: Date,
    required: [true, 'A data e hora de início são obrigatórias.']
  },
  vacancies: {
    total: {
      type: Number,
      required: [true, 'O número total de vagas é obrigatório.'],
      min: 1
    },
    filled: {
      type: Number,
      default: 0
    }
  },
  teachers: [{
    type: Schema.Types.ObjectId,
    ref: 'user'
  }],
  tutors: [{
    type: Schema.Types.ObjectId,
    ref: 'user'
  }],
  enrolledStudents: [{
    type: Schema.Types.ObjectId,
    ref: 'user'
  }],
  attendance: [attendanceSchema]
}, {
  timestamps: true
});

const Workshop = mongoose.model('workshop', workshopSchema);

module.exports = { Workshop };