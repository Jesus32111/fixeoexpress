import express from 'express';
import { body, validationResult } from 'express-validator';
import Machinery from '../models/Machinery.js';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(path.resolve(), 'uploads/machinery_documents');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept common document and image types
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Error: File type not supported! Only JPEG, PNG, PDF, DOC, DOCX are allowed.'));
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 10 }, // 10MB limit per file
  fileFilter: fileFilter
});

const machineryUploadFields = [
  { name: 'soat', maxCount: 1 },
  { name: 'technicalReview', maxCount: 1 },
  { name: 'propertyCard', maxCount: 1 },
  { name: 'others', maxCount: 5 } // Allow up to 5 'other' documents
];

// Helper function to build documents object from req.files
const buildDocumentsObject = (files) => {
  const documents = {};
  if (files.soat) {
    documents.soat = {
      filename: files.soat[0].filename,
      originalName: files.soat[0].originalname,
      path: files.soat[0].path,
      uploadDate: new Date(),
      size: files.soat[0].size
    };
  }
  if (files.technicalReview) {
    documents.technicalReview = {
      filename: files.technicalReview[0].filename,
      originalName: files.technicalReview[0].originalname,
      path: files.technicalReview[0].path,
      uploadDate: new Date(),
      size: files.technicalReview[0].size
    };
  }
  if (files.propertyCard) {
    documents.propertyCard = {
      filename: files.propertyCard[0].filename,
      originalName: files.propertyCard[0].originalname,
      path: files.propertyCard[0].path,
      uploadDate: new Date(),
      size: files.propertyCard[0].size
    };
  }
  if (files.others && files.others.length > 0) {
    documents.others = files.others.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      uploadDate: new Date(),
      size: file.size,
      description: '' // Frontend might need to send descriptions for 'others'
    }));
  }
  return documents;
};


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
router.post('/', upload.fields(machineryUploadFields), [
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
    .withMessage('Purchase price must be a positive number'),
  body('soatExpiration').optional().isISO8601().toDate().withMessage('Invalid SOAT expiration date'),
  body('technicalReviewExpiration').optional().isISO8601().toDate().withMessage('Invalid technical review expiration date'),
  body('warehouse').optional().isMongoId().withMessage('Invalid warehouse ID'),
  body('notes').optional().isString().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
], async (req, res) => {
  try {
    console.log('Creating new machinery. Body:', req.body);
    console.log('Files:', req.files); // Log uploaded files
    console.log('User ID:', req.user._id);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      // If validation fails, remove uploaded files to prevent orphans
      if (req.files) {
        Object.values(req.files).forEach(fileArray => {
          fileArray.forEach(file => fs.unlinkSync(file.path));
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if serial number already exists
    const existingMachinery = await Machinery.findOne({ 
      serialNumber: req.body.serialNumber,
      createdBy: req.user._id // Ensure uniqueness per user if needed, or globally
    });
    
    if (existingMachinery) {
      console.log('Serial number already exists:', req.body.serialNumber);
      // Remove uploaded files
      if (req.files) {
        Object.values(req.files).forEach(fileArray => {
          fileArray.forEach(file => fs.unlinkSync(file.path));
        });
      }
      return res.status(400).json({
        success: false,
        message: 'A machinery with this serial number already exists for your account.'
      });
    }
    
    const documents = buildDocumentsObject(req.files || {});

    // Create machinery data
    const machineryData = {
      ...req.body,
      createdBy: req.user._id,
      documents: documents,
      // Ensure numeric fields are parsed correctly if coming as strings from FormData
      year: parseInt(req.body.year),
      hourMeter: req.body.hourMeter ? parseFloat(req.body.hourMeter) : 0,
      purchasePrice: req.body.purchasePrice ? parseFloat(req.body.purchasePrice) : undefined,
      // Handle optional date fields
      purchaseDate: req.body.purchaseDate ? req.body.purchaseDate : undefined,
      soatExpiration: req.body.soatExpiration ? req.body.soatExpiration : undefined,
      technicalReviewExpiration: req.body.technicalReviewExpiration ? req.body.technicalReviewExpiration : undefined,
      warehouse: req.body.warehouse ? req.body.warehouse : undefined,
    };

    // Remove empty optional fields so Mongoose defaults can apply if necessary
    for (const key in machineryData) {
      if (machineryData[key] === undefined || machineryData[key] === null || machineryData[key] === '') {
        delete machineryData[key];
      }
    }
    // Re-assign required fields that might have been deleted if sent as empty string
    machineryData.brand = req.body.brand;
    machineryData.model = req.body.model;
    machineryData.serialNumber = req.body.serialNumber;
    machineryData.type = req.body.type;
    machineryData.year = parseInt(req.body.year);
    machineryData.createdBy = req.user._id;


    console.log('Attempting to create machinery with data:', JSON.stringify(machineryData, null, 2));

    const machinery = new Machinery(machineryData);
    const savedMachinery = await machinery.save();
    
    // Populate the created machinery
    await savedMachinery.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'warehouse', select: 'name department' }
    ]);
    
    console.log('Machinery created successfully:', savedMachinery._id);

    res.status(201).json({
      success: true,
      data: savedMachinery
    });
  } catch (error) {
    console.error('Create machinery error:', error.message);
    console.error('Error stack:', error.stack);

    // Remove uploaded files in case of error during save
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        fileArray.forEach(file => {
          try {
            fs.unlinkSync(file.path);
            console.log('Cleaned up file:', file.path);
          } catch (unlinkErr) {
            console.error('Error cleaning up file:', unlinkErr);
          }
        });
      });
    }
    
    if (error.code === 11000) { // Duplicate key error (e.g. serialNumber)
      return res.status(400).json({
        success: false,
        message: 'A machinery with this serial number already exists.' // More specific message
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed during save.',
        errors: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating machinery',
      error: process.env.NODE_ENV === 'development' ? { message: error.message, stack: error.stack, code: error.code, name: error.name } : undefined
    });
  }
});

// @desc    Update machinery
// @route   PUT /api/machinery/:id
// @access  Private
router.put('/:id', upload.fields(machineryUploadFields), [
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
    .withMessage('Purchase price must be a positive number'),
  body('soatExpiration').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid SOAT expiration date'),
  body('technicalReviewExpiration').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid technical review expiration date'),
  body('warehouse').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid warehouse ID'),
  body('notes').optional({ checkFalsy: true }).isString().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
], async (req, res) => {
  try {
    console.log('Updating machinery. ID:', req.params.id, 'Body:', req.body);
    console.log('Files:', req.files); // Log uploaded files
    console.log('User ID:', req.user._id);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If validation fails, remove any newly uploaded files
      if (req.files) {
        Object.values(req.files).forEach(fileArray => {
          fileArray.forEach(file => fs.unlinkSync(file.path));
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const machineryToUpdate = await Machinery.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!machineryToUpdate) {
      // Remove any newly uploaded files if machinery not found
      if (req.files) {
        Object.values(req.files).forEach(fileArray => {
          fileArray.forEach(file => fs.unlinkSync(file.path));
        });
      }
      return res.status(404).json({
        success: false,
        message: 'Machinery not found'
      });
    }

    // Check if serial number already exists (excluding current machinery)
    if (req.body.serialNumber && req.body.serialNumber !== machineryToUpdate.serialNumber) {
      const existingMachinery = await Machinery.findOne({ 
        serialNumber: req.body.serialNumber,
        createdBy: req.user._id, // Check within the same user's items
        _id: { $ne: req.params.id }
      });
      
      if (existingMachinery) {
        // Remove any newly uploaded files
        if (req.files) {
          Object.values(req.files).forEach(fileArray => {
            fileArray.forEach(file => fs.unlinkSync(file.path));
          });
        }
        return res.status(400).json({
          success: false,
          message: 'A machinery with this serial number already exists for your account.'
        });
      }
    }

    const updateData = { ...req.body };

    // Handle file updates
    if (req.files && Object.keys(req.files).length > 0) {
      const newDocuments = buildDocumentsObject(req.files);
      
      // Delete old files if new ones are uploaded
      const oldDocuments = machineryToUpdate.documents || {};
      for (const docType in newDocuments) { // soat, technicalReview, propertyCard
        if (newDocuments[docType] && oldDocuments[docType] && oldDocuments[docType].path) {
          try {
            if (fs.existsSync(oldDocuments[docType].path)) {
              fs.unlinkSync(oldDocuments[docType].path);
              console.log('Deleted old file:', oldDocuments[docType].path);
            }
          } catch (err) {
            console.error('Error deleting old file:', err);
          }
        }
      }
      // For 'others', this logic would need to be more complex if users can delete individual 'other' files.
      // Assuming for now 'others' array is replaced if new 'others' are uploaded.
      if (newDocuments.others && oldDocuments.others && oldDocuments.others.length > 0) {
         oldDocuments.others.forEach(oldFile => {
           if (oldFile.path && fs.existsSync(oldFile.path)) {
             try {
               fs.unlinkSync(oldFile.path);
               console.log('Deleted old "other" file:', oldFile.path);
             } catch (err) {
               console.error('Error deleting old "other" file:', err);
             }
           }
         });
      }
      updateData.documents = { ...oldDocuments, ...newDocuments };
    }

    // Ensure numeric fields are parsed correctly
    if (updateData.year) updateData.year = parseInt(updateData.year);
    if (updateData.hourMeter) updateData.hourMeter = parseFloat(updateData.hourMeter);
    if (updateData.purchasePrice) updateData.purchasePrice = parseFloat(updateData.purchasePrice);
    
    // Handle optional date fields (if empty string is passed, set to null/undefined)
    ['purchaseDate', 'soatExpiration', 'technicalReviewExpiration'].forEach(dateField => {
      if (updateData[dateField] === '' || updateData[dateField] === null) {
        updateData[dateField] = undefined;
      }
    });
     if (updateData.warehouse === '' || updateData.warehouse === null) {
        updateData.warehouse = undefined;
    }


    // Update the machinery
    Object.assign(machineryToUpdate, updateData);
    const updatedMachinery = await machineryToUpdate.save();
    
    await updatedMachinery.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'warehouse', select: 'name department' }
    ]);

    console.log('Machinery updated successfully:', updatedMachinery._id);

    res.status(200).json({
      success: true,
      data: updatedMachinery
    });
  } catch (error) {
    console.error('Update machinery error:', error.message);
    console.error('Error stack:', error.stack);
    // Clean up newly uploaded files if error occurs during save
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        fileArray.forEach(file => {
          try {
            fs.unlinkSync(file.path);
            console.log('Cleaned up file after error:', file.path);
          } catch (unlinkErr) {
            console.error('Error cleaning up file after error:', unlinkErr);
          }
        });
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A machinery with this serial number already exists.'
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed during update.',
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating machinery',
      error: process.env.NODE_ENV === 'development' ? { message: error.message, stack: error.stack, name: error.name } : undefined
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

    // Delete associated files
    if (machinery.documents) {
      const docPaths = [];
      if (machinery.documents.soat && machinery.documents.soat.path) {
        docPaths.push(machinery.documents.soat.path);
      }
      if (machinery.documents.technicalReview && machinery.documents.technicalReview.path) {
        docPaths.push(machinery.documents.technicalReview.path);
      }
      if (machinery.documents.propertyCard && machinery.documents.propertyCard.path) {
        docPaths.push(machinery.documents.propertyCard.path);
      }
      if (machinery.documents.others && machinery.documents.others.length > 0) {
        machinery.documents.others.forEach(doc => {
          if (doc.path) docPaths.push(doc.path);
        });
      }

      docPaths.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log('Deleted associated file:', filePath);
          } catch (err) {
            console.error('Error deleting associated file:', filePath, err);
          }
        }
      });
    }

    await Machinery.deleteOne({ _id: req.params.id, createdBy: req.user._id });

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