import express from 'express';
import { body, validationResult } from 'express-validator';
import FuelRecord from '../models/FuelRecord.js';
import Vehicle from '../models/Vehicle.js';
import Machinery from '../models/Machinery.js';
import FinanceRecord from '../models/FinanceRecord.js'; // Import FinanceRecord
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get fuel statistics
// @route   GET /api/fuel/stats
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    console.log('Getting fuel statistics for user:', req.user._id);
    
    const { period = 'month', startDate, endDate } = req.query;
    
    // Build date filter
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        fuelDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      switch (period) {
        case 'day':
          dateFilter = {
            fuelDate: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            }
          };
          break;
        case 'week':
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          dateFilter = {
            fuelDate: {
              $gte: weekStart,
              $lt: new Date()
            }
          };
          break;
        case 'month':
        default:
          dateFilter = {
            fuelDate: {
              $gte: new Date(now.getFullYear(), now.getMonth(), 1),
              $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
            }
          };
          break;
      }
    }

    const baseQuery = { createdBy: req.user._id, ...dateFilter };
    
    // Get aggregated statistics
    const stats = await FuelRecord.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalGallons: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
          averagePricePerGallon: { $avg: '$pricePerGallon' },
          maxPricePerGallon: { $max: '$pricePerGallon' },
          minPricePerGallon: { $min: '$pricePerGallon' }
        }
      }
    ]);

    // Get fuel consumption by type
    const fuelByType = await FuelRecord.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$fuelType',
          totalGallons: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
          records: { $sum: 1 }
        }
      },
      { $sort: { totalGallons: -1 } }
    ]);

    // Get top gas stations
    const topGasStations = await FuelRecord.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$gasStation.name',
          totalGallons: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
          visits: { $sum: 1 }
        }
      },
      { $sort: { totalGallons: -1 } },
      { $limit: 5 }
    ]);

    const result = {
      summary: stats[0] || {
        totalRecords: 0,
        totalGallons: 0,
        totalCost: 0,
        averagePricePerGallon: 0,
        maxPricePerGallon: 0,
        minPricePerGallon: 0
      },
      fuelByType,
      topGasStations,
      period
    };

    console.log('Fuel statistics:', result);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get fuel statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fuel statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get all fuel records
// @route   GET /api/fuel
// @access  Private
router.get('/', async (req, res) => {
  try {
    console.log('Getting all fuel records for user:', req.user._id);
    console.log('Query parameters:', req.query);
    
    const { vehicleId, machineryId, gasStation, fuelType, search, page = 1, limit = 10, startDate, endDate } = req.query;
    let query = { createdBy: req.user._id };

    // Add filters
    if (vehicleId && vehicleId !== 'all') {
      query.vehicle = vehicleId;
    }
    if (machineryId && machineryId !== 'all') {
      query.machinery = machineryId;
    }
    if (gasStation && gasStation !== 'all') {
      query['gasStation.name'] = gasStation;
    }
    if (fuelType && fuelType !== 'all') {
      query.fuelType = fuelType;
    }
    if (startDate && endDate) {
      query.fuelDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (search) {
      query.$or = [
        { 'gasStation.name': { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { receiptNumber: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('Final query:', JSON.stringify(query, null, 2));

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const total = await FuelRecord.countDocuments(query);
    
    // Get fuel records with pagination
    const fuelRecords = await FuelRecord.find(query)
      .populate('vehicle', 'plate brand model year')
      .populate('machinery', 'brand model serialNumber type')
      .populate('createdBy', 'name email')
      .sort({ fuelDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    console.log(`Found ${fuelRecords.length} fuel records (${total} total)`);

    res.status(200).json({
      success: true,
      count: fuelRecords.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: fuelRecords
    });
  } catch (error) {
    console.error('Get fuel records error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fuel records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get single fuel record
// @route   GET /api/fuel/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    console.log('Getting fuel record with ID:', req.params.id);
    
    const fuelRecord = await FuelRecord.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    })
    .populate('vehicle', 'plate brand model year')
    .populate('machinery', 'brand model serialNumber type')
    .populate('createdBy', 'name email');

    if (!fuelRecord) {
      console.log('Fuel record not found');
      return res.status(404).json({
        success: false,
        message: 'Fuel record not found'
      });
    }

    console.log('Fuel record found:', fuelRecord._id);

    res.status(200).json({
      success: true,
      data: fuelRecord
    });
  } catch (error) {
    console.error('Get fuel record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fuel record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Create new fuel record
// @route   POST /api/fuel
// @access  Private
router.post('/', [
  body('quantity')
    .isFloat({ min: 0.1 })
    .withMessage('Quantity must be at least 0.1 gallons'),
  body('pricePerGallon')
    .isFloat({ min: 0.01 })
    .withMessage('Price per gallon must be positive'),
  body('gasStation.name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Gas station name is required and must be less than 100 characters'),
  body('fuelType')
    .isIn(['Gasolina 84', 'Gasolina 90', 'Gasolina 95', 'Gasolina 97', 'Diesel B5', 'Diesel B20', 'GLP', 'GNV'])
    .withMessage('Invalid fuel type'),
  body('fuelDate')
    .isISO8601()
    .withMessage('Valid fuel date is required'),
  body('currentMileage')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Mileage must be positive'),
  body('currentHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hours must be positive')
], async (req, res) => {
  try {
    console.log('Creating new fuel record:', req.body);
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

    // Validate that either vehicle or machinery is provided
    if (!req.body.vehicle && !req.body.machinery) {
      return res.status(400).json({
        success: false,
        message: 'Either vehicle or machinery must be specified'
      });
    }

    if (req.body.vehicle && req.body.machinery) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign fuel record to both vehicle and machinery'
      });
    }

    // Verify vehicle or machinery exists and belongs to user
    if (req.body.vehicle) {
      const vehicle = await Vehicle.findOne({
        _id: req.body.vehicle,
        createdBy: req.user._id
      });

      if (!vehicle) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle not found or does not belong to you'
        });
      }
    }

    if (req.body.machinery) {
      const machinery = await Machinery.findOne({
        _id: req.body.machinery,
        createdBy: req.user._id
      });

      if (!machinery) {
        return res.status(400).json({
          success: false,
          message: 'Machinery not found or does not belong to you'
        });
      }
    }

    // Create fuel record
    const fuelRecordData = {
      ...req.body,
      createdBy: req.user._id
    };

    const qty = Number(fuelRecordData.quantity);
    const price = Number(fuelRecordData.pricePerGallon);

    if (isNaN(qty) || isNaN(price)) {
    return res.status(400).json({
        success: false,
        message: 'Cantidad y precio por galón deben ser valores numéricos válidos.'
    });
    }

    // Calcula el totalCost si no se envió
    if (!fuelRecordData.totalCost) {
    fuelRecordData.totalCost = qty * price;
    }

    console.log('Received for new fuel record:');
    console.log('Quantity:', req.body.quantity, typeof req.body.quantity);
    console.log('Price per Gallon:', req.body.pricePerGallon, typeof req.body.pricePerGallon);
    console.log('Creating fuel record with data:', fuelRecordData);

    const fuelRecord = new FuelRecord(fuelRecordData);
    const savedFuelRecord = await fuelRecord.save();
    
    // Populate the created fuel record
    const populatedFuelRecord = await savedFuelRecord.populate([
      { path: 'vehicle', select: 'plate brand model year name' }, // Added 'name' for description
      { path: 'machinery', select: 'brand model serialNumber type name' }, // Added 'name' for description
      { path: 'createdBy', select: 'name email' }
    ]);
    
    console.log('Fuel record created successfully:', populatedFuelRecord._id);

    // Create corresponding FinanceRecord
    try {
      let description = `Gasto de combustible`;
      if (populatedFuelRecord.vehicle) {
        description += ` para vehículo ${populatedFuelRecord.vehicle.name || populatedFuelRecord.vehicle.plate}`;
      } else if (populatedFuelRecord.machinery) {
        description += ` para maquinaria ${populatedFuelRecord.machinery.name || populatedFuelRecord.machinery.serialNumber}`;
      }

      const financeRecordData = {
        type: 'Egreso',
        category: 'Combustible',
        description: description,
        amount: populatedFuelRecord.totalCost,
        date: populatedFuelRecord.fuelDate,
        paymentMethod: req.body.paymentMethod || 'Efectivo', // Or get from fuel record if available
        sourceType: 'Fuel',
        sourceId: populatedFuelRecord._id,
        createdBy: req.user._id,
        notes: `Registro automático por carga de combustible. ${populatedFuelRecord.notes || ''}`.trim()
      };
      const newFinanceRecord = new FinanceRecord(financeRecordData);
      await newFinanceRecord.save();
      console.log('FinanceRecord created successfully for FuelRecord:', newFinanceRecord._id);
    } catch (financeError) {
      console.error('Error creating FinanceRecord for FuelRecord:', financeError);
      // Decide if this should be a critical error. For now, log and continue.
      // Potentially, you might want to delete the FuelRecord if FinanceRecord creation fails.
    }

    res.status(201).json({
      success: true,
      data: populatedFuelRecord
    });
  } catch (error) {
    console.error('Create fuel record error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating fuel record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update fuel record
// @route   PUT /api/fuel/:id
// @access  Private
router.put('/:id', [
  body('quantity')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Quantity must be at least 0.1 gallons'),
  body('pricePerGallon')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price per gallon must be positive'),
  body('gasStation.name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Gas station name must be less than 100 characters'),
  body('fuelType')
    .optional()
    .isIn(['Gasolina 84', 'Gasolina 90', 'Gasolina 95', 'Gasolina 97', 'Diesel B5', 'Diesel B20', 'GLP', 'GNV'])
    .withMessage('Invalid fuel type'),
  body('fuelDate')
    .optional()
    .isISO8601()
    .withMessage('Valid fuel date is required'),
  body('currentMileage')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Mileage must be positive'),
  body('currentHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hours must be positive')
], async (req, res) => {
  try {
    console.log('Updating fuel record:', req.params.id, req.body);
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

    const fuelRecord = await FuelRecord.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    )
    .populate('vehicle', 'plate brand model year')
    .populate('machinery', 'brand model serialNumber type')
    .populate('createdBy', 'name email');

    if (!fuelRecord) {
      return res.status(404).json({
        success: false,
        message: 'Fuel record not found'
      });
    }

    console.log('Fuel record updated successfully');

    res.status(200).json({
      success: true,
      data: fuelRecord
    });
  } catch (error) {
    console.error('Update fuel record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating fuel record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Delete fuel record
// @route   DELETE /api/fuel/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    console.log('Deleting fuel record:', req.params.id);
    console.log('User ID:', req.user._id);
    
    const fuelRecord = await FuelRecord.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!fuelRecord) {
      return res.status(404).json({
        success: false,
        message: 'Fuel record not found'
      });
    }

    console.log('Fuel record deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Fuel record deleted successfully'
    });
  } catch (error) {
    console.error('Delete fuel record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting fuel record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;