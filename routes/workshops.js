const express = require('express');
const router = express.Router();
const { Workshop } = require('../models/workshop');
const { isAuthenticated, isAdmin, isTeacherOrAdmin, isStudent } = require('../middleware/auth');

router.post('/', [isAuthenticated, isTeacherOrAdmin], async (req, res) => {
  const { name, description, startDate, vacancies, teachers, tutors } = req.body;
  try {
    const workshop = new Workshop({
      name,
      description,
      startDate,
      vacancies: { total: vacancies.total },
      teachers,
      tutors
    });
    await workshop.save();
    res.status(201).json(workshop);
  } catch (err) {
    res.status(400).json({ message: 'Erro ao criar oficina.', error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const workshops = await Workshop.find({}).populate('teachers', 'name').populate('tutors', 'name');
    res.json(workshops);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar oficinas.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id)
      .populate('teachers', 'name email')
      .populate('tutors', 'name email')
      .populate('enrolledStudents', 'name email');
    if (!workshop) {
      return res.status(404).json({ message: 'Oficina não encontrada.' });
    }
    res.json(workshop);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar oficina.' });
  }
});

router.post('/:id/enroll', [isAuthenticated, isStudent], async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) {
      return res.status(404).json({ message: 'Oficina não encontrada.' });
    }
    if (workshop.status !== 'scheduled' || new Date(workshop.startDate) < new Date()) {
      return res.status(400).json({ message: 'Inscrições para esta oficina estão encerradas.' });
    }
    if (workshop.vacancies.filled >= workshop.vacancies.total) {
      return res.status(400).json({ message: 'Não há mais vagas disponíveis.' });
    }
    if (workshop.enrolledStudents.includes(req.user._id)) {
      return res.status(400).json({ message: 'Você já está inscrito nesta oficina.' });
    }

    workshop.enrolledStudents.push(req.user._id);
    workshop.vacancies.filled += 1;
    await workshop.save();
    res.json(workshop);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao se inscrever na oficina.' });
  }
});

router.post('/:id/attendance', isAuthenticated, async (req, res) => {
  const { presentStudentIds } = req.body;
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) {
      return res.status(404).json({ message: 'Oficina não encontrada.' });
    }

    const isAuthorized = workshop.teachers.includes(req.user._id) || workshop.tutors.includes(req.user._id) || req.user.type === 'admin';
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Você não tem permissão para registrar chamada para esta oficina.' });
    }

    const newAttendance = {
      takenBy: req.user._id,
      presentStudents: presentStudentIds
    };

    workshop.attendance.push(newAttendance);
    await workshop.save();
    res.status(201).json(workshop);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao registrar chamada.' });
  }
});

module.exports = router;