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
    const workshops = await Workshop.find({})
      .populate('teachers', 'name')
      .populate('tutors', 'name')
      .populate('enrolledStudents', '_id');
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

router.patch('/:id', [isAuthenticated, isTeacherOrAdmin], async (req, res) => {
  const { name, description, startDate, vacancies, teachers, tutors } = req.body;
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) {
      return res.status(404).json({ message: 'Oficina não encontrada.' });
    }

    workshop.name = name || workshop.name;
    workshop.description = description || workshop.description;
    workshop.startDate = startDate || workshop.startDate;
    workshop.vacancies.total = vacancies?.total || workshop.vacancies.total;
    workshop.teachers = teachers || workshop.teachers;
    workshop.tutors = tutors || workshop.tutors;

    await workshop.save();

    const updatedWorkshop = await Workshop.findById(workshop._id)
      .populate('teachers', 'name email')
      .populate('tutors', 'name email')
      .populate('enrolledStudents', 'name email');

    res.json(updatedWorkshop);
  } catch (err) {
    res.status(400).json({ message: 'Erro ao atualizar oficina.', error: err.message });
  }
});

router.post('/:id/enroll', isAuthenticated, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) {
      return res.status(404).json({ message: 'Oficina não encontrada.' });
    }

    let studentIdToEnroll;
    const requesterType = req.user.type;

    if (requesterType === 'student') {
      studentIdToEnroll = req.user._id;
    } else if (requesterType === 'admin' || requesterType === 'teacher') {
      const { studentId } = req.body;
      if (!studentId) {
        return res.status(400).json({ message: 'O ID do aluno é obrigatório.' });
      }
      studentIdToEnroll = studentId;
    } else {
      return res.status(403).json({ message: 'Você não tem permissão para inscrever usuários.' });
    }

    if (workshop.status !== 'scheduled' || new Date(workshop.startDate) < new Date()) {
      return res.status(400).json({ message: 'Inscrições para esta oficina estão encerradas.' });
    }
    if (workshop.vacancies.filled >= workshop.vacancies.total) {
      return res.status(400).json({ message: 'Não há mais vagas disponíveis.' });
    }
    if (workshop.enrolledStudents.includes(studentIdToEnroll)) {
      return res.status(400).json({ message: 'Este aluno já está inscrito na oficina.' });
    }

    workshop.enrolledStudents.push(studentIdToEnroll);
    workshop.vacancies.filled += 1;
    await workshop.save();

    const updatedWorkshop = await Workshop.findById(req.params.id)
      .populate('teachers', 'name email')
      .populate('tutors', 'name email')
      .populate('enrolledStudents', 'name email');

    res.json(updatedWorkshop);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao se inscrever na oficina.' });
  }
});

router.post('/:id/unenroll', [isAuthenticated, isStudent], async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      {
        $pull: { enrolledStudents: req.user._id },
        $inc: { 'vacancies.filled': -1 }
      },
      { new: true }
    ).populate('teachers', 'name')
      .populate('tutors', 'name')
      .populate('enrolledStudents', '_id');

    if (!workshop) {
      return res.status(404).json({ message: 'Oficina não encontrada.' });
    }

    res.json(workshop);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao cancelar inscrição.' });
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

router.delete('/:id', [isAuthenticated, isTeacherOrAdmin], async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndDelete(req.params.id);
    if (!workshop) {
      return res.status(404).json({ message: 'Oficina não encontrada.' });
    }
    res.status(200).json({ message: 'Oficina removida com sucesso.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover oficina.' });
  }
});

router.post('/:id/remove-student', [isAuthenticated, isTeacherOrAdmin], async (req, res) => {
  const { studentId } = req.body;
  const workshopId = req.params.id;

  if (!studentId) {
    return res.status(400).json({ message: 'O ID do aluno é obrigatório.' });
  }

  try {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) {
      return res.status(404).json({ message: 'Oficina não encontrada.' });
    }

    const isEnrolled = workshop.enrolledStudents.some(id => id.equals(studentId));
    if (!isEnrolled) {
      return res.status(404).json({ message: 'Aluno não está inscrito nesta oficina.' });
    }

    workshop.enrolledStudents.pull(studentId);
    workshop.vacancies.filled -= 1;
    await workshop.save();

    const updatedWorkshop = await Workshop.findById(workshopId)
      .populate('teachers', 'name email')
      .populate('tutors', 'name email')
      .populate('enrolledStudents', 'name email');

    res.json(updatedWorkshop);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover aluno da oficina.' });
  }
});

module.exports = router;