import express from 'express';
import { body, validationResult } from 'express-validator';
import Warehouse from '../models/Warehouse.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Middleware de autenticación
router.use(protect);

// Obtener todos los almacenes
router.get('/', async (req, res) => {
  try {
    const { status, department, search } = req.query;
    const query = { createdBy: req.user._id };

    if (status && status !== 'all') query.status = status;
    if (department && department !== 'all') query.department = department;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { manager: { $regex: search, $options: 'i' } }
      ];
    }

    const warehouses = await Warehouse.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: warehouses.length,
      data: warehouses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error del servidor al obtener almacenes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener un almacén por ID
router.get('/:id', async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    }).populate('createdBy', 'name email');

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Almacén no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: warehouse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error del servidor al obtener el almacén',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Crear un nuevo almacén
router.post('/', [
  body('name').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('address').trim().notEmpty().withMessage('La dirección es obligatoria'),
  body('department').isIn([
    'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca',
    'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín',
    'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios',
    'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
  ]).withMessage('Departamento inválido'),
  body('capacity').optional().isFloat({ min: 0 }).withMessage('La capacidad debe ser un número positivo'),
  body('contactEmail').optional().isEmail().withMessage('Email no válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errors.array()
      });
    }

    const newWarehouse = new Warehouse({
      ...req.body,
      createdBy: req.user._id
    });

    const savedWarehouse = await newWarehouse.save();
    await savedWarehouse.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: savedWarehouse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error del servidor al crear el almacén',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Actualizar un almacén
router.put('/:id', [
  body('name').optional().trim().notEmpty().withMessage('El nombre no debe estar vacío'),
  body('address').optional().trim().notEmpty().withMessage('La dirección no debe estar vacía'),
  body('department').optional().isIn([
    'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca',
    'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín',
    'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios',
    'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
  ]).withMessage('Departamento inválido'),
  body('capacity').optional().isFloat({ min: 0 }).withMessage('La capacidad debe ser un número positivo'),
  body('contactEmail').optional().isEmail().withMessage('Email no válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errors.array()
      });
    }

    const updatedWarehouse = await Warehouse.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!updatedWarehouse) {
      return res.status(404).json({
        success: false,
        message: 'Almacén no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedWarehouse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error del servidor al actualizar el almacén',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Eliminar un almacén
router.delete('/:id', async (req, res) => {
  try {
    const deletedWarehouse = await Warehouse.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!deletedWarehouse) {
      return res.status(404).json({
        success: false,
        message: 'Almacén no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Almacén eliminado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error del servidor al eliminar el almacén',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
