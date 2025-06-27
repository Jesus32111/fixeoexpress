import express from 'express';
import { body, validationResult } from 'express-validator';
import FinanceRecord from '../models/FinanceRecord.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get finance statistics
// @route   GET /api/finance/stats
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    console.log('Getting finance statistics for user:', req.user._id);
    
    const { period = 'month', startDate, endDate } = req.query;
    
    // Build date filter
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      switch (period) {
        case 'day':
          dateFilter = {
            date: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            }
          };
          break;
        case 'week':
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          dateFilter = {
            date: {
              $gte: weekStart,
              $lt: new Date()
            }
          };
          break;
        case 'month':
        default:
          dateFilter = {
            date: {
              $gte: new Date(now.getFullYear(), now.getMonth(), 1),
              $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
            }
          };
          break;
        case 'year':
          dateFilter = {
            date: {
              $gte: new Date(now.getFullYear(), 0, 1),
              $lt: new Date(now.getFullYear() + 1, 0, 1)
            }
          };
          break;
      }
    }

    const baseQuery = { createdBy: req.user._id, ...dateFilter };
    
    // Get income and expense totals
    const incomeTotal = await FinanceRecord.aggregate([
      { $match: { ...baseQuery, type: 'Ingreso' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const expenseTotal = await FinanceRecord.aggregate([
      { $match: { ...baseQuery, type: 'Egreso' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Get income by category
    const incomeByCategory = await FinanceRecord.aggregate([
      { $match: { ...baseQuery, type: 'Ingreso' } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Get expenses by category
    const expensesByCategory = await FinanceRecord.aggregate([
      { $match: { ...baseQuery, type: 'Egreso' } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Get monthly trend (last 12 months)
    const monthlyTrend = await FinanceRecord.aggregate([
      {
        $match: {
          createdBy: req.user._id,
          date: {
            $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const totalIncome = incomeTotal[0]?.total || 0;
    const totalExpenses = expenseTotal[0]?.total || 0;
    const netIncome = totalIncome - totalExpenses;

    const stats = {
      summary: {
        totalIncome,
        totalExpenses,
        netIncome,
        period
      },
      incomeByCategory,
      expensesByCategory,
      monthlyTrend
    };

    console.log('Finance statistics:', stats);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get finance statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching finance statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get all finance records
// @route   GET /api/finance
// @access  Private
router.get('/', async (req, res) => {
  try {
    console.log('Getting all finance records for user:', req.user._id);
    console.log('Query parameters:', req.query);
    
    const { type, category, paymentMethod, search, page = 1, limit = 20, startDate, endDate } = req.query;
    let query = { createdBy: req.user._id };

    // Add filters
    if (type && type !== 'all') {
      query.type = type;
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { subcategory: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('Final query:', JSON.stringify(query, null, 2));

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const total = await FinanceRecord.countDocuments(query);
    console.log(`Total documents matching query before pagination: ${total} for user ${req.user._id}`); // DEBUG
    
    // Get finance records with pagination
    const financeRecords = await FinanceRecord.find(query)
      .populate('createdBy', 'name email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    console.log(`Found ${financeRecords.length} finance records (after pagination, total: ${total}) for user ${req.user._id}`); // DEBUG

    res.status(200).json({
      success: true,
      count: financeRecords.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: financeRecords
    });
  } catch (error) {
    console.error('Get finance records error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching finance records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get single finance record
// @route   GET /api/finance/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    console.log('Getting finance record with ID:', req.params.id);
    
    const financeRecord = await FinanceRecord.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    }).populate('createdBy', 'name email');

    if (!financeRecord) {
      console.log('Finance record not found');
      return res.status(404).json({
        success: false,
        message: 'Finance record not found'
      });
    }

    console.log('Finance record found:', financeRecord._id);

    res.status(200).json({
      success: true,
      data: financeRecord
    });
  } catch (error) {
    console.error('Get finance record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching finance record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Create new finance record
// @route   POST /api/finance
// @access  Private
router.post('/', [
  body('type')
    .isIn(['Ingreso', 'Egreso'])
    .withMessage('Type must be either Ingreso or Egreso'),
  body('category')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category is required and must be less than 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Description is required and must be less than 200 characters'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('date')
    .isISO8601()
    .withMessage('Valid date is required'),
  body('paymentMethod')
    .optional()
    .isIn(['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Yape', 'Plin', 'Otro'])
    .withMessage('Invalid payment method')
], async (req, res) => {
  try {
    console.log('Creating new finance record:', req.body);
    
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

    // Create finance record
    const financeRecordData = {
      ...req.body,
      createdBy: req.user._id
    };

    console.log('Creating finance record with data:', financeRecordData);

    const financeRecord = new FinanceRecord(financeRecordData);
    const savedFinanceRecord = await financeRecord.save();
    
    // Populate the created finance record
    await savedFinanceRecord.populate('createdBy', 'name email');
    
    console.log('Finance record created successfully:', savedFinanceRecord._id);

    res.status(201).json({
      success: true,
      data: savedFinanceRecord
    });
  } catch (error) {
    console.error('Create finance record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating finance record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update finance record
// @route   PUT /api/finance/:id
// @access  Private
router.put('/:id', [
  body('type')
    .optional()
    .isIn(['Ingreso', 'Egreso'])
    .withMessage('Type must be either Ingreso or Egreso'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category must be less than 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Description must be less than 200 characters'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Valid date is required'),
  body('paymentMethod')
    .optional()
    .isIn(['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Yape', 'Plin', 'Otro'])
    .withMessage('Invalid payment method')
], async (req, res) => {
  try {
    console.log('Updating finance record:', req.params.id, req.body);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const financeRecord = await FinanceRecord.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!financeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Finance record not found'
      });
    }

    console.log('Finance record updated successfully');

    res.status(200).json({
      success: true,
      data: financeRecord
    });
  } catch (error) {
    console.error('Update finance record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating finance record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Delete finance record
// @route   DELETE /api/finance/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    console.log('Deleting finance record:', req.params.id);
    
    const financeRecord = await FinanceRecord.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!financeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Finance record not found'
      });
    }

    console.log('Finance record deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Finance record deleted successfully'
    });
  } catch (error) {
    console.error('Delete finance record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting finance record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get categories
// @route   GET /api/finance/categories
// @access  Private
router.get('/categories/list', async (req, res) => {
  try {
    console.log('Getting finance categories for user:', req.user._id);
    
    const { type } = req.query;
    let query = { createdBy: req.user._id };
    
    if (type && type !== 'all') {
      query.type = type;
    }

    // Get unique categories
    const categories = await FinanceRecord.distinct('category', query);
    
    // Get subcategories for each category
    const categoriesWithSubs = await Promise.all(
      categories.map(async (category) => {
        const subcategories = await FinanceRecord.distinct('subcategory', {
          ...query,
          category,
          subcategory: { $ne: null, $ne: '' }
        });
        
        return {
          category,
          subcategories
        };
      })
    );

    res.status(200).json({
      success: true,
      data: categoriesWithSubs
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;