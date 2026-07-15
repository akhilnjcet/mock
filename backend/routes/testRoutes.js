const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const testController = require('../controllers/testController');

// Multer storage configuration for temporary PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    // Ensure dir exists
    const fs = require('fs');
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

// Routes configuration
router.post('/upload', upload.single('pdf'), testController.uploadPDF);
router.post('/generate', testController.generateDynamicTest);
router.get('/admin/submissions', testController.adminGetSubmissions);
router.get('/admin/questions', testController.adminGetQuestions);
router.get('/student/:username/progress', testController.studentGetProgress);
router.post('/', testController.saveTest);
router.get('/', testController.getTests);
router.get('/:id', testController.getTestById);
router.post('/:id/submit', testController.submitTest);
router.delete('/:id', testController.deleteTest);

module.exports = router;
