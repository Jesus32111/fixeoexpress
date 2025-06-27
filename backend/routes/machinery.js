import express from 'express';
import { body, validationResult } from 'express-validator';
import Machinery from '../models/Machinery.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get all machineries
// @route   GET /api/machinery
// @access  Private
router.get('/', async (req, res) => {
  try {
    console.log('Getting all machineries for user:', req.user._id);
    console.log('Query parameters:', req.query);
    
    const { status, type, search } = req.query;
    let query = { createdBy: req.user._id };

    // Add filters
    if (status && status !== 'all') {
      query.status = status;
      console.log('Filtering by status:', status);
    }
    if (type && type !== 'all') {
      query.type = type;
      console.log('Filtering by type:', type);
    }
    if (search) {
      query.$or = [
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } }
      ];
      console.log('Filtering by search:', search);
    }

    console.log('Final query:', JSON.stringify(query, null, 2));

    const machineries = await Machinery.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean(); // Add lean() for better performance

    console.log(`Found ${machineries.length} machineries`);

    res.status(200).json({
      success: true,
      count: machineries.length,
      data: machineries
    });
  } catch (error) {
    console.error('Error message:', error.message);
    console.error('Get machineries error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching machineries',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get single machinery
// @route   GET /api/machinery/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    console.log('Getting machinery with ID:', req.params.id);
    console.log('User ID:', req.user._id);
    
    const machinery = await Machinery.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    }).populate('createdBy', 'name email');

    if (!machinery) {
      console.log('Machinery not found');
      return res.status(404).json({
        success: false,
        message: 'Machinery not found'
      });
    }

    console.log('Machinery found:', machinery._id);

    res.status(200).json({
      success: true,
      data: machinery
    });
  } catch (error) {
    console.error('Get machinery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching machinery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Create new machinery
// @route   POST /api/machinery
// @access  Private
router.post('/', [
  body('brand')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Brand is required and must be less than 100 characters'),
  body('model')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Model is required and must be less than 100 characters'),
  body('serialNumber')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Serial number is required and must be less than 50 characters'),
  body('type')
    .isIn(['Excavadora', 'Bulldozer', 'Grúa', 'Cargadora', 'Compactadora', 'Retroexcavadora', 'Motoniveladora', 'Volquete', 'Otro'])
    .withMessage('Invalid machinery type'),
  body('year')
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Year must be a valid year'),
  body('hourMeter')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hour meter must be a positive number'),
  body('purchasePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be a positive number')
], async (req, res) => {
  try {
    console.log('Creating new machinery:', req.body);
    console.log('User ID:', req.user._id);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if serial number already exists
    const existingMachinery = await Machinery.findOne({ 
      serialNumber: req.body.serialNumber 
    });
    
    if (existingMachinery) {
      console.log('Serial number already exists:', req.body.serialNumber);
      return res.status(400).json({
        success: false,
        message: 'A machinery with this serial number already exists'
      });
    }

    // Create machinery
    const machineryData = {
      ...req.body,
      createdBy: req.user._id
    };

    console.log('Creating machinery with data:', machineryData);

    const machinery = new Machinery(machineryData);
    const savedMachinery = await machinery.save();
    
    // Populate the created machinery
    await savedMachinery.populate('createdBy', 'name email');
    
    console.log('Machinery created successfully:', savedMachinery._id);

    res.status(201).json({
      success: true,
      data: savedMachinery
    });
  } catch (error) {
    console.error('Create machinery error:', error);
    console.error('Error stack:', error.stack);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A machinery with this serial number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating machinery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update machinery
// @route   PUT /api/machinery/:id
// @access  Private
router.put('/:id', [
  body('brand')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Brand must be less than 100 characters'),
  body('model')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Model must be less than 100 characters'),
  body('serialNumber')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Serial number must be less than 50 characters'),
  body('type')
    .optional()
    .isIn(['Excavadora', 'Bulldozer', 'Grúa', 'Cargadora', 'Compactadora', 'Retroexcavadora', 'Motoniveladora', 'Volquete', 'Otro'])
    .withMessage('Invalid machinery type'),
  body('year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Year must be a valid year'),
  body('hourMeter')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hour meter must be a positive number'),
  body('purchasePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be a positive number')
], async (req, res) => {
  try {
    console.log('Updating machinery:', req.params.id, req.body);
    console.log('User ID:', req.user._id);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if serial number already exists (excluding current machinery)
    if (req.body.serialNumber) {
      const existingMachinery = await Machinery.findOne({ 
        serialNumber: req.body.serialNumber,
        _id: { $ne: req.params.id }
      });
      
      if (existingMachinery) {
        return res.status(400).json({
          success: false,
          message: 'A machinery with this serial number already exists'
        });
      }
    }

    const machinery = await Machinery.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!machinery) {
      return res.status(404).json({
        success: false,
        message: 'Machinery not found'
      });
    }

    console.log('Machinery updated successfully');

    res.status(200).json({
      success: true,
      data: machinery
    });
  } catch (error) {
    console.error('Update machinery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating machinery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Delete machinery
// @route   DELETE /api/machinery/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    console.log('Deleting machinery:', req.params.id);
    console.log('User ID:', req.user._id);
    
    const machinery = await Machinery.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!machinery) {
      return res.status(404).json({
        success: false,
        message: 'Machinery not found'
      });
    }

    console.log('Machinery deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Machinery deleted successfully'
    });
  } catch (error) {
    console.error('Delete machinery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting machinery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Add maintenance record
// @route   POST /api/machinery/:id/maintenance
// @access  Private
router.post('/:id/maintenance', [
  body('type')
    .isIn(['Preventivo', 'Correctivo', 'Inspección'])
    .withMessage('Invalid maintenance type'),
  body('description')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Description is required'),
  body('cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost must be a positive number')
], async (req, res) => {
  try {
    console.log('Adding maintenance record to machinery:', req.params.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const machinery = await Machinery.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!machinery) {
      return res.status(404).json({
        success: false,
        message: 'Machinery not found'
      });
    }

    machinery.maintenanceHistory.push(req.body);
    await machinery.save();

    res.status(200).json({
      success: true,
      data: machinery
    });
  } catch (error) {
    console.error('Add maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding maintenance record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;