import express from 'express';
import { body, validationResult } from 'express-validator';
import Vehicle from '../models/Vehicle.js';
import Warehouse from '../models/Warehouse.js';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/vehicles';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only PDF, DOC, DOCX, JPG, JPEG, PNG files
  const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// All routes are protected
router.use(protect);

// @desc    Get all vehicles
// @route   GET /api/vehicles
// @access  Private
router.get('/', async (req, res) => {
  try {
    console.log('Getting all vehicles for user:', req.user._id);
    console.log('Query parameters:', req.query);
    
    const { status, warehouse, search } = req.query;
    let query = { createdBy: req.user._id };

    // Add filters
    if (status && status !== 'all') {
      query.status = status;
      console.log('Filtering by status:', status);
    }
    if (warehouse && warehouse !== 'all') {
      query.warehouse = warehouse;
      console.log('Filtering by warehouse:', warehouse);
    }
    if (search) {
      query.$or = [
        { plate: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
      console.log('Filtering by search:', search);
    }

    console.log('Final query:', JSON.stringify(query, null, 2));

    const vehicles = await Vehicle.find(query)
      .populate('createdBy', 'name email')
      .populate('warehouse', 'name address department')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${vehicles.length} vehicles`);

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching vehicles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get single vehicle
// @route   GET /api/vehicles/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    console.log('Getting vehicle with ID:', req.params.id);
    console.log('User ID:', req.user._id);
    
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    })
    .populate('createdBy', 'name email')
    .populate('warehouse', 'name address department');

    if (!vehicle) {
      console.log('Vehicle not found');
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    console.log('Vehicle found:', vehicle._id);

    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching vehicle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Create new vehicle
// @route   POST /api/vehicles
// @access  Private
router.post('/', 
  upload.fields([
    { name: 'soat', maxCount: 1 },
    { name: 'technicalReview', maxCount: 1 },
    { name: 'propertyCard', maxCount: 1 },
    { name: 'others', maxCount: 5 }
  ]),
  [
    body('plate')
      .trim()
      .isLength({ min: 1, max: 10 })
      .withMessage('Plate is required and must be less than 10 characters')
      .matches(/^[A-Z0-9-]+$/)
      .withMessage('Plate format is invalid'),
    body('brand')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Brand is required and must be less than 50 characters'),
    body('model')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Model is required and must be less than 50 characters'),
    body('year')
      .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
      .withMessage('Year must be a valid year'),
    body('currentMileage')
      .isFloat({ min: 0 })
      .withMessage('Current mileage must be a positive number'),
    body('status')
      .isIn(['Operativo', 'En Mantenimiento', 'No Disponible', 'Fuera de Servicio'])
      .withMessage('Invalid status'),
    body('soatExpiration')
      .isISO8601()
      .withMessage('SOAT expiration date is required'),
    body('technicalReviewExpiration')
      .isISO8601()
      .withMessage('Technical review expiration date is required'),
    body('warehouse')
      .isMongoId()
      .withMessage('Valid warehouse is required')
  ],
  async (req, res) => {
    try {
      console.log('Creating new vehicle:', req.body);
      console.log('User ID:', req.user._id);
      console.log('Files:', req.files);
      
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

      // Check if plate already exists
      const existingVehicle = await Vehicle.findOne({ 
        plate: req.body.plate.toUpperCase() 
      });
      
      if (existingVehicle) {
        console.log('Plate already exists:', req.body.plate);
        return res.status(400).json({
          success: false,
          message: 'A vehicle with this plate already exists'
        });
      }

      // Verify warehouse exists and belongs to user
      const warehouse = await Warehouse.findOne({
        _id: req.body.warehouse,
        createdBy: req.user._id
      });

      if (!warehouse) {
        return res.status(400).json({
          success: false,
          message: 'Warehouse not found or does not belong to you'
        });
      }

      // Process uploaded files
      const documents = {};
      
      if (req.files.soat && req.files.soat[0]) {
        documents.soat = {
          filename: req.files.soat[0].filename,
          originalName: req.files.soat[0].originalname,
          uploadDate: new Date(),
          size: req.files.soat[0].size
        };
      }

      if (req.files.technicalReview && req.files.technicalReview[0]) {
        documents.technicalReview = {
          filename: req.files.technicalReview[0].filename,
          originalName: req.files.technicalReview[0].originalname,
          uploadDate: new Date(),
          size: req.files.technicalReview[0].size
        };
      }

      if (req.files.propertyCard && req.files.propertyCard[0]) {
        documents.propertyCard = {
          filename: req.files.propertyCard[0].filename,
          originalName: req.files.propertyCard[0].originalname,
          uploadDate: new Date(),
          size: req.files.propertyCard[0].size
        };
      }

      if (req.files.others && req.files.others.length > 0) {
        documents.others = req.files.others.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          uploadDate: new Date(),
          size: file.size,
          description: 'Other document'
        }));
      }

      // Create vehicle
      const vehicleData = {
        plate: req.body.plate.toUpperCase(),
        brand: req.body.brand,
        model: req.body.model,
        year: parseInt(req.body.year),
        currentMileage: parseFloat(req.body.currentMileage),
        status: req.body.status,
        soatExpiration: new Date(req.body.soatExpiration),
        technicalReviewExpiration: new Date(req.body.technicalReviewExpiration),
        warehouse: req.body.warehouse,
        documents,
        createdBy: req.user._id
      };

      console.log('Creating vehicle with data:', vehicleData);

      const vehicle = new Vehicle(vehicleData);
      const savedVehicle = await vehicle.save();
      
      // Populate the created vehicle
      await savedVehicle.populate([
        { path: 'createdBy', select: 'name email' },
        { path: 'warehouse', select: 'name address department' }
      ]);
      
      console.log('Vehicle created successfully:', savedVehicle._id);

      res.status(201).json({
        success: true,
        data: savedVehicle
      });
    } catch (error) {
      console.error('Create vehicle error:', error);
      console.error('Error stack:', error.stack);
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'A vehicle with this plate already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error while creating vehicle',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private
router.put('/:id',
  upload.fields([
    { name: 'soat', maxCount: 1 },
    { name: 'technicalReview', maxCount: 1 },
    { name: 'propertyCard', maxCount: 1 },
    { name: 'others', maxCount: 5 }
  ]),
  [
    body('plate')
      .optional()
      .trim()
      .isLength({ min: 1, max: 10 })
      .withMessage('Plate must be less than 10 characters')
      .matches(/^[A-Z0-9-]+$/)
      .withMessage('Plate format is invalid'),
    body('brand')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Brand must be less than 50 characters'),
    body('model')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Model must be less than 50 characters'),
    body('year')
      .optional()
      .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
      .withMessage('Year must be a valid year'),
    body('currentMileage')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Current mileage must be a positive number'),
    body('status')
      .optional()
      .isIn(['Operativo', 'En Mantenimiento', 'No Disponible', 'Fuera de Servicio'])
      .withMessage('Invalid status'),
    body('warehouse')
      .optional()
      .isMongoId()
      .withMessage('Valid warehouse is required')
  ],
  async (req, res) => {
    try {
      console.log('Updating vehicle:', req.params.id, req.body);
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

      // Check if plate already exists (excluding current vehicle)
      if (req.body.plate) {
        const existingVehicle = await Vehicle.findOne({ 
          plate: req.body.plate.toUpperCase(),
          _id: { $ne: req.params.id }
        });
        
        if (existingVehicle) {
          return res.status(400).json({
            success: false,
            message: 'A vehicle with this plate already exists'
          });
        }
      }

      // Verify warehouse exists and belongs to user if provided
      if (req.body.warehouse) {
        const warehouse = await Warehouse.findOne({
          _id: req.body.warehouse,
          createdBy: req.user._id
        });

        if (!warehouse) {
          return res.status(400).json({
            success: false,
            message: 'Warehouse not found or does not belong to you'
          });
        }
      }

      const updateData = { ...req.body };
      
      if (updateData.plate) {
        updateData.plate = updateData.plate.toUpperCase();
      }
      
      if (updateData.year) {
        updateData.year = parseInt(updateData.year);
      }
      
      if (updateData.currentMileage) {
        updateData.currentMileage = parseFloat(updateData.currentMileage);
      }

      if (updateData.soatExpiration) {
        updateData.soatExpiration = new Date(updateData.soatExpiration);
      }

      if (updateData.technicalReviewExpiration) {
        updateData.technicalReviewExpiration = new Date(updateData.technicalReviewExpiration);
      }

      // Handle file updates
      if (req.files && Object.keys(req.files).length > 0) {
        const currentVehicle = await Vehicle.findOne({
          _id: req.params.id,
          createdBy: req.user._id
        });

        if (!currentVehicle) {
          return res.status(404).json({
            success: false,
            message: 'Vehicle not found'
          });
        }

        updateData.documents = { ...currentVehicle.documents };

        // Update individual document types
        if (req.files.soat && req.files.soat[0]) {
          updateData.documents.soat = {
            filename: req.files.soat[0].filename,
            originalName: req.files.soat[0].originalname,
            uploadDate: new Date(),
            size: req.files.soat[0].size
          };
        }

        if (req.files.technicalReview && req.files.technicalReview[0]) {
          updateData.documents.technicalReview = {
            filename: req.files.technicalReview[0].filename,
            originalName: req.files.technicalReview[0].originalname,
            uploadDate: new Date(),
            size: req.files.technicalReview[0].size
          };
        }

        if (req.files.propertyCard && req.files.propertyCard[0]) {
          updateData.documents.propertyCard = {
            filename: req.files.propertyCard[0].filename,
            originalName: req.files.propertyCard[0].originalname,
            uploadDate: new Date(),
            size: req.files.propertyCard[0].size
          };
        }

        if (req.files.others && req.files.others.length > 0) {
          const newOthers = req.files.others.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            uploadDate: new Date(),
            size: file.size,
            description: 'Other document'
          }));
          
          updateData.documents.others = [
            ...(currentVehicle.documents.others || []),
            ...newOthers
          ];
        }
      }

      const vehicle = await Vehicle.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user._id },
        updateData,
        { new: true, runValidators: true }
      )
      .populate('createdBy', 'name email')
      .populate('warehouse', 'name address department');

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      console.log('Vehicle updated successfully');

      res.status(200).json({
        success: true,
        data: vehicle
      });
    } catch (error) {
      console.error('Update vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating vehicle',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    console.log('Deleting vehicle:', req.params.id);
    console.log('User ID:', req.user._id);
    
    const vehicle = await Vehicle.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // TODO: Delete associated files from filesystem
    // This would require implementing file cleanup logic

    console.log('Vehicle deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting vehicle',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Add maintenance record
// @route   POST /api/vehicles/:id/maintenance
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
    .withMessage('Cost must be a positive number'),
  body('mileage')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Mileage must be a positive number')
], async (req, res) => {
  try {
    console.log('Adding maintenance record to vehicle:', req.params.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    vehicle.maintenanceHistory.push(req.body);
    await vehicle.save();

    res.status(200).json({
      success: true,
      data: vehicle
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