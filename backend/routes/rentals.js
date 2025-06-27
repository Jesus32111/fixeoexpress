import express from 'express';
import { body, validationResult, param } from 'express-validator';
import Rental from '../models/Rental.js';
import Vehicle from '../models/Vehicle.js';
import Machinery from '../models/Machinery.js';
import FinanceRecord from '../models/FinanceRecord.js'; // Import FinanceRecord
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

const commonValidationRules = [
  body('customerName')
    .trim().notEmpty().withMessage('El nombre del cliente es obligatorio.')
    .isLength({ max: 100 }).withMessage('El nombre del cliente no puede exceder los 100 caracteres.'),
  body('contactPerson')
    .trim().notEmpty().withMessage('La persona de contacto es obligatoria.')
    .isLength({ max: 100 }).withMessage('La persona de contacto no puede exceder los 100 caracteres.'),
  body('email')
    .optional({ checkFalsy: true }).trim().isEmail().withMessage('Email inválido.')
    .isLength({ max: 100 }).withMessage('El email no puede exceder los 100 caracteres.'),
  body('phone')
    .optional({ checkFalsy: true }).trim()
    .isLength({ max: 20 }).withMessage('El teléfono no puede exceder los 20 caracteres.'),
  body('address')
    .optional({ checkFalsy: true }).trim()
    .isLength({ max: 200 }).withMessage('La dirección no puede exceder los 200 caracteres.'),
  body('equipmentType')
    .isIn(['vehicle', 'machinery']).withMessage('Tipo de equipo inválido. Debe ser "vehicle" o "machinery".'),
  body('equipment')
    .notEmpty().withMessage('El equipo es obligatorio.').isMongoId().withMessage('ID de equipo inválido.'),
  body('startDate')
    .isISO8601().toDate().withMessage('Fecha de inicio inválida.'),
  body('endDate')
    .isISO8601().toDate().withMessage('Fecha de fin inválida.')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.startDate)) {
        throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio.');
      }
      return true;
    }),
  body('dailyRate')
    .isFloat({ min: 0 }).withMessage('La tarifa diaria debe ser un número positivo.'),
  body('deposit')
    .optional().isFloat({ min: 0 }).withMessage('El depósito debe ser un número positivo.'),
  body('includeOperator')
    .optional().isBoolean().withMessage('Incluir operador debe ser un valor booleano.'),
  body('fuelIncluded')
    .optional().isBoolean().withMessage('Combustible incluido debe ser un valor booleano.'),
  body('transportCost')
    .optional().isFloat({ min: 0 }).withMessage('El costo de transporte debe ser un número positivo.'),
  body('jobDescription')
    .trim().notEmpty().withMessage('La descripción del trabajo es obligatoria.')
    .isLength({ max: 1000 }).withMessage('La descripción del trabajo no puede exceder los 1000 caracteres.'),
  body('deliveryAddress')
    .optional({ checkFalsy: true }).trim()
    .isLength({ max: 200 }).withMessage('La dirección de entrega no puede exceder los 200 caracteres.')
];

// Middleware to check if equipment exists and belongs to user
const validateEquipment = async (req, res, next) => {
  const { equipmentType, equipment } = req.body;
  const userId = req.user._id;

  try {
    let equipmentExists;
    if (equipmentType === 'vehicle') {
      equipmentExists = await Vehicle.findOne({ _id: equipment, createdBy: userId });
    } else if (equipmentType === 'machinery') {
      equipmentExists = await Machinery.findOne({ _id: equipment, createdBy: userId });
    } else {
      return res.status(400).json({ success: false, message: 'Tipo de equipo inválido.' });
    }

    if (!equipmentExists) {
      return res.status(404).json({ success: false, message: 'Equipo no encontrado o no pertenece al usuario.' });
    }
    next();
  } catch (error) {
    console.error('Error validando equipo:', error);
    res.status(500).json({ success: false, message: 'Error del servidor validando equipo.' });
  }
};


// @desc    Get all rentals
// @route   GET /api/rentals
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, equipmentType, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    let query = { createdBy: req.user._id };

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { jobDescription: { $regex: search, $options: 'i' } }
      ];
    }
    if (equipmentType && ['vehicle', 'machinery'].includes(equipmentType)) {
        query.equipmentType = equipmentType;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await Rental.countDocuments(query);
    const rentals = await Rental.find(query)
      .populate({
          path: 'equipment',
          select: 'plate brand model serialNumber type name' // Add fields common to both or specific ones
      })
      .populate('createdBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      count: rentals.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: rentals
    });
  } catch (error) {
    console.error('Error obteniendo alquileres:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al obtener alquileres.' });
  }
});

// @desc    Get single rental
// @route   GET /api/rentals/:id
// @access  Private
router.get('/:id', [
    param('id').isMongoId().withMessage('ID de alquiler inválido.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const rental = await Rental.findOne({ _id: req.params.id, createdBy: req.user._id })
      .populate({
          path: 'equipment',
          select: 'plate brand model serialNumber type name'
      })
      .populate('createdBy', 'name email');

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Alquiler no encontrado.' });
    }
    res.status(200).json({ success: true, data: rental });
  } catch (error) {
    console.error('Error obteniendo alquiler:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al obtener el alquiler.' });
  }
});

// @desc    Create new rental
// @route   POST /api/rentals
// @access  Private
router.post('/', commonValidationRules, validateEquipment, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const rentalData = { ...req.body, createdBy: req.user._id };
    
    // Set equipmentTypeRef based on equipmentType for Mongoose refPath
    if (req.body.equipmentType === 'vehicle') {
        rentalData.equipmentTypeRef = 'Vehicle';
    } else if (req.body.equipmentType === 'machinery') {
        rentalData.equipmentTypeRef = 'Machinery';
    }

    const newRental = new Rental(rentalData);
    await newRental.save();
    
    const populatedRental = await Rental.findById(newRental._id)
        .populate({
            path: 'equipment',
            select: 'plate brand model serialNumber type name'
        })
        .populate('createdBy', 'name email');

    // Create corresponding FinanceRecord
    try {
      const startDate = new Date(populatedRental.startDate);
      const endDate = new Date(populatedRental.endDate);
      // Calculate duration in days (add 1 because rental periods are inclusive)
      const durationInMilliseconds = endDate.getTime() - startDate.getTime();
      const durationInDays = Math.ceil(durationInMilliseconds / (1000 * 60 * 60 * 24)) + 1;
      
      let totalIncome = durationInDays * populatedRental.dailyRate;
      if (populatedRental.transportCost) {
        totalIncome += populatedRental.transportCost;
      }

      let equipmentName = 'Equipo';
      if (populatedRental.equipment) {
        equipmentName = populatedRental.equipment.name || populatedRental.equipment.plate || populatedRental.equipment.serialNumber || `ID: ${populatedRental.equipment._id}`;
      }
      
      const description = `Ingreso por alquiler de ${equipmentName} a ${populatedRental.customerName}.`;
      
      const financeRecordData = {
        type: 'Ingreso',
        category: 'Alquileres',
        description: description,
        amount: totalIncome,
        date: populatedRental.startDate, // Or endDate, depending on business logic for revenue recognition
        paymentMethod: req.body.paymentMethod || 'Transferencia', // Default or from request
        sourceType: 'Rental',
        sourceId: populatedRental._id,
        createdBy: req.user._id,
        notes: `Cliente: ${populatedRental.customerName}. Equipo: ${equipmentName}. Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}. Días: ${durationInDays}. Tarifa diaria: ${populatedRental.dailyRate}. Costo transporte: ${populatedRental.transportCost || 0}.` 
      };
      const newFinanceRecord = new FinanceRecord(financeRecordData);
      await newFinanceRecord.save();
      console.log('FinanceRecord created successfully for Rental:', newFinanceRecord._id);

    } catch (financeError) {
      console.error('Error creating FinanceRecord for Rental:', financeError);
      // Log and continue, or handle more robustly
    }

    res.status(201).json({ success: true, data: populatedRental });
  } catch (error) {
    console.error('Error creando alquiler:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: 'Error de validación.', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Error del servidor al crear el alquiler.' });
  }
});

// @desc    Update rental
// @route   PUT /api/rentals/:id
// @access  Private
router.put('/:id', [
    param('id').isMongoId().withMessage('ID de alquiler inválido.'),
    ...commonValidationRules,
    // Custom validation for equipment on update if it's being changed
    body().custom(async (value, { req }) => {
        // Only run validateEquipment if equipment or equipmentType is part of the update
        if (req.body.equipment || req.body.equipmentType) {
            return new Promise((resolve, reject) => {
                validateEquipment(req, { status: () => ({ json: reject }) }, () => resolve(true));
            });
        }
        return true;
    })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const rental = await Rental.findOne({ _id: req.params.id, createdBy: req.user._id });

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Alquiler no encontrado.' });
    }

    const updateData = { ...req.body };

    // If equipmentType is being changed, equipmentTypeRef must also be updated
    if (req.body.equipmentType) {
        if (req.body.equipmentType === 'vehicle') {
            updateData.equipmentTypeRef = 'Vehicle';
        } else if (req.body.equipmentType === 'machinery') {
            updateData.equipmentTypeRef = 'Machinery';
        }
    } else { // If equipmentType is not in body, use the existing one from the rental to set ref
        if (rental.equipmentType === 'vehicle') {
            updateData.equipmentTypeRef = 'Vehicle';
        } else if (rental.equipmentType === 'machinery') {
            updateData.equipmentTypeRef = 'Machinery';
        }
    }


    const updatedRental = await Rental.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate({
          path: 'equipment',
          select: 'plate brand model serialNumber type name'
      })
      .populate('createdBy', 'name email');

    res.status(200).json({ success: true, data: updatedRental });
  } catch (error) {
    console.error('Error actualizando alquiler:', error);
     if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: 'Error de validación.', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Error del servidor al actualizar el alquiler.' });
  }
});

// @desc    Delete rental
// @route   DELETE /api/rentals/:id
// @access  Private
router.delete('/:id', [
    param('id').isMongoId().withMessage('ID de alquiler inválido.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const rental = await Rental.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Alquiler no encontrado.' });
    }
    res.status(200).json({ success: true, message: 'Alquiler eliminado exitosamente.' });
  } catch (error) {
    console.error('Error eliminando alquiler:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al eliminar el alquiler.' });
  }
});

export default router;
