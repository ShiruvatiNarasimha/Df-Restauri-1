import { Router } from 'express';
import { serviceManager } from '../services/service.service';
import { requireAuth } from '../middleware/auth';
import { validateRequest, createServiceSchema, updateServiceSchema, idParamSchema } from '../middleware/validation';
import { handleError } from '../utils/error-handler';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'public', 'uploads'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/', async (_req, res) => {
  try {
    const services = await serviceManager.findAll();
    res.json({
      success: true,
      data: services,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/',
  requireAuth,
  upload.single('image'),
  validateRequest(createServiceSchema),
  async (req, res) => {
    try {
      const { name, description, category, features } = req.body;
      const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
      
      const newService = await serviceManager.create({
        name,
        description,
        category,
        image: imagePath,
        features: JSON.parse(features || '[]')
      });

      res.json(newService);
    } catch (error) {
      handleError(error, res);
    }
});

router.put('/:id',
  requireAuth,
  upload.single('image'),
  validateRequest(updateServiceSchema),
  validateRequest(idParamSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, category, features } = req.body;
      const updateData: any = {
        name,
        description,
        category,
        features: JSON.parse(features || '[]')
      };

      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }

      const updatedService = await serviceManager.update(parseInt(id), updateData);
      res.json(updatedService);
    } catch (error) {
      handleError(error, res);
    }
});

router.put('/:id/image-order',
  requireAuth,
  validateRequest(idParamSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { imageOrder } = req.body;
      
      if (!Array.isArray(imageOrder)) {
        return res.status(400).json({ message: "Invalid image order format" });
      }

      const updatedService = await serviceManager.updateImageOrder(parseInt(id), imageOrder);
      res.json(updatedService);
    } catch (error) {
      handleError(error, res);
    }
});

export default router;
