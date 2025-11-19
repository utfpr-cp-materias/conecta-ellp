const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Docxtemplater = require('docxtemplater');
const jszip = require('jszip');
const PizZip = require('pizzip');
const { User } = require('../models/user');
const { isAuthenticated, isAdmin, isTeacherOrAdmin } = require('../middleware/auth');

router.post('/volunteer-agreements', [isAuthenticated, isTeacherOrAdmin], async (req, res) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'A lista de IDs de usuários é obrigatória.' });
  }

  try {
    const volunteers = await User.find({
      '_id': { $in: userIds },
      'type': { $in: ['teacher', 'tutor'] }
    });

    if (volunteers.length === 0) {
      return res.status(404).json({ message: 'Nenhum voluntário válido encontrado para os IDs fornecidos.' });
    }

    const templatePath = path.resolve(__dirname, '..', 'templates', 'volunteer_agreement_template.docx');
    const templateContent = fs.readFileSync(templatePath);

    const zip = new jszip();

    for (const volunteer of volunteers) {
      const doc = new Docxtemplater(new PizZip(templateContent), {
        paragraphLoop: true,
        linebreaks: true,
      });

      const data = {
        name: volunteer.name,
        email: volunteer.email,
        birth_date: volunteer.volunteerData?.birthDate ? new Date(volunteer.volunteerData.birthDate).toLocaleDateString('pt-BR') : '',
        cpf: volunteer.volunteerData?.cpf || '',
        nationality: volunteer.volunteerData?.nationality || '',
        is_student: volunteer.volunteerData?.isStudentUTFPR || false,
        course: volunteer.volunteerData?.course || '',
        semester: volunteer.volunteerData?.semester || '',
        ra: volunteer.volunteerData?.ra || '',
        address: volunteer.volunteerData?.address || '',
        city: volunteer.volunteerData?.city || '',
        state: volunteer.volunteerData?.state || '',
        phone: volunteer.volunteerData?.phone || '',
        current_date: new Date().toLocaleDateString('pt-BR'),
      };

      doc.render(data);

      const generatedDocBuffer = doc.getZip().generate({ type: 'nodebuffer' });
      const filename = `Termo_Voluntariado_${volunteer.name.replace(/\s+/g, '_')}.docx`;
      zip.file(filename, generatedDocBuffer);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="Termos_de_Voluntariado.zip"',
    });

    res.send(zipBuffer);

  } catch (error) {
    console.error('ERRO DETALHADO AO GERAR DOCUMENTOS:', error);
    res.status(500).json({
      message: 'Ocorreu um erro ao gerar os documentos.',
      error: error.message,
    });
  }
});

module.exports = router;