import express from 'express';
import { body, validationResult } from 'express-validator';
import Part from '../models/Part.js';
import Warehouse from '../models/Warehouse.js';
import Vehicle from '../models/Vehicle.js';
import Machinery from '../models/Machinery.js';
import FinanceRecord from '../models/FinanceRecord.js'; // Import FinanceRecord
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get parts statistics
// @route   GET /api/parts/stats
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    console.log('Getting parts statistics for user:', req.user._id);
    
    const baseQuery = { createdBy: req.user._id };
    
    // Get all parts for calculations
    const allParts = await Part.find(baseQuery);
    
    // Calculate statistics
    const totalParts = allParts.length;
    const lowStockParts = allParts.filter(part => part.currentStock <= part.minimumStock).length;
    const outOfStockParts = allParts.filter(part => part.currentStock === 0).length;
    const totalValue = allParts.reduce((sum, part) => sum + (part.currentStock * (part.unitPrice || 0)), 0);

    // Get parts by category
    const partsByCategory = await Part.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          lowStock: {
            $sum: {
              $cond: [{ $lte: ['$currentStock', '$minimumStock'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const stats = {
      totalParts,
      lowStockParts,
      outOfStockParts,
      totalValue,
      partsByCategory
    };

    console.log('Parts statistics:', stats);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get parts statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching parts statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get all parts
// @route   GET /api/parts
// @access  Private
router.get('/', async (req, res) => {
  try {
    console.log('Getting all parts for user:', req.user._id);
    console.log('Query parameters:', req.query);
    
    const { category, warehouse, stockStatus, search } = req.query;
    let query = { createdBy: req.user._id };

    // Add filters
    if (category && category !== 'all') {
      query.category = category;
      console.log('Filtering by category:', category);
    }
    if (warehouse && warehouse !== 'all') {
      query.warehouse = warehouse;
      console.log('Filtering by warehouse:', warehouse);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { partNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'supplier.name': { $regex: search, $options: 'i' } }
      ];
      console.log('Filtering by search:', search);
    }

    console.log('Final query:', JSON.stringify(query, null, 2));

    let parts = await Part.find(query)
      .populate('createdBy', 'name email')
      .populate('warehouse', 'name address department')
      .sort({ createdAt: -1 })
      .lean();

    // Apply stock status filter after fetching (since it's a virtual field)
    if (stockStatus && stockStatus !== 'all') {
      parts = parts.filter(part => {
        if (stockStatus === 'low_stock') {
          return part.currentStock <= part.minimumStock && part.currentStock > 0;
        }
        if (stockStatus === 'out_of_stock') {
          return part.currentStock === 0;
        }
        if (stockStatus === 'normal') {
          return part.currentStock > part.minimumStock;
        }
        return true;
      });
    }

    console.log(`Found ${parts.length} parts`);

    res.status(200).json({
      success: true,
      count: parts.length,
      data: parts
    });
  } catch (error) {
    console.error('Get parts error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching parts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get single part
// @route   GET /api/parts/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    console.log('Getting part with ID:', req.params.id);
    console.log('User ID:', req.user._id);
    
    const part = await Part.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    })
    .populate('createdBy', 'name email')
    .populate('warehouse', 'name address department')
    .populate('stockMovements.performedBy', 'name email');

    if (!part) {
      console.log('Part not found');
      return res.status(404).json({
        success: false,
        message: 'Part not found'
      });
    }

    console.log('Part found:', part._id);

    res.status(200).json({
      success: true,
      data: part
    });
  } catch (error) {
    console.error('Get part error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching part',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Create new part
// @route   POST /api/parts
// @access  Private
router.post('/', [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Part name is required and must be less than 100 characters'),
  body('partNumber')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Part number is required and must be less than 50 characters'),
  body('category')
    .isIn([
      'Motor', 'Transmisión', 'Hidráulico', 'Eléctrico', 'Neumático',
      'Filtros', 'Aceites y Lubricantes', 'Frenos', 'Suspensión',
      'Carrocería', 'Herramientas', 'Otros'
    ])
    .withMessage('Invalid part category'),
  body('warehouse')
    .isMongoId()
    .withMessage('Valid warehouse is required'),
  body('currentStock')
    .isInt({ min: 0 })
    .withMessage('Current stock must be a non-negative integer'),
  body('minimumStock')
    .isInt({ min: 0 })
    .withMessage('Minimum stock must be a non-negative integer'),
  body('maximumStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum stock must be a non-negative integer'),
  body('unit')
    .isIn(['Unidad', 'Litro', 'Galón', 'Kilogramo', 'Metro', 'Caja', 'Paquete', 'Rollo'])
    .withMessage('Invalid unit'),
  body('unitPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit price must be positive')
], async (req, res) => {
  try {
    console.log('Creating new part:', req.body);
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

    // Check if part number already exists
    const existingPart = await Part.findOne({ 
      partNumber: req.body.partNumber.toUpperCase(),
      createdBy: req.user._id
    });
    
    if (existingPart) {
      console.log('Part number already exists:', req.body.partNumber);
      return res.status(400).json({
        success: false,
        message: 'A part with this part number already exists'
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

    // Create part
    const partData = {
      ...req.body,
      partNumber: req.body.partNumber.toUpperCase(),
      createdBy: req.user._id
    };

    // Add initial stock movement if stock > 0
    if (partData.currentStock > 0) {
      partData.stockMovements = [{
        type: 'Entrada',
        quantity: partData.currentStock,
        reason: 'Stock inicial',
        previousStock: 0,
        newStock: partData.currentStock,
        performedBy: req.user._id
      }];
    }

    console.log('Creating part with data:', partData);

    const part = new Part(partData);
    const savedPart = await part.save();
    
    // Populate the created part
    const populatedPart = await savedPart.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'warehouse', select: 'name address department' }
    ]);
    
    console.log('Part created successfully:', populatedPart._id);

    // Create FinanceRecord for initial stock entry if applicable
    if (populatedPart.currentStock > 0 && populatedPart.unitPrice && populatedPart.unitPrice > 0) {
      try {
        const initialStockMovement = populatedPart.stockMovements.find(m => m.reason === 'Stock inicial');
        if (initialStockMovement) {
          const totalCost = initialStockMovement.quantity * populatedPart.unitPrice;
          const financeRecordData = {
            type: 'Egreso',
            category: 'Compra de Repuestos',
            description: `Compra inicial de ${initialStockMovement.quantity} x ${populatedPart.name} (${populatedPart.partNumber})`,
            amount: totalCost,
            date: initialStockMovement.date || new Date(),
            paymentMethod: req.body.paymentMethod || 'Efectivo', // Consider adding paymentMethod to part creation
            sourceType: 'Part',
            sourceId: populatedPart._id,
            reference: initialStockMovement.reference,
            createdBy: req.user._id,
            notes: `Stock inicial para ${populatedPart.name}. Cantidad: ${initialStockMovement.quantity}, Precio Unitario: ${populatedPart.unitPrice}`
          };
          const newFinanceRecord = new FinanceRecord(financeRecordData);
          await newFinanceRecord.save();
          console.log('FinanceRecord created successfully for initial part stock:', newFinanceRecord._id);
        }
      } catch (financeError) {
        console.error('Error creating FinanceRecord for initial part stock:', financeError);
      }
    }

    res.status(201).json({
      success: true,
      data: populatedPart
    });
  } catch (error) {
    console.error('Create part error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating part',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update part
// @route   PUT /api/parts/:id
// @access  Private
router.put('/:id', [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Part name must be less than 100 characters'),
  body('partNumber')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Part number must be less than 50 characters'),
  body('category')
    .optional()
    .isIn([
      'Motor', 'Transmisión', 'Hidráulico', 'Eléctrico', 'Neumático',
      'Filtros', 'Aceites y Lubricantes', 'Frenos', 'Suspensión',
      'Carrocería', 'Herramientas', 'Otros'
    ])
    .withMessage('Invalid part category'),
  body('warehouse')
    .optional()
    .isMongoId()
    .withMessage('Valid warehouse is required'),
  body('minimumStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock must be a non-negative integer'),
  body('maximumStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum stock must be a non-negative integer'),
  body('unit')
    .optional()
    .isIn(['Unidad', 'Litro', 'Galón', 'Kilogramo', 'Metro', 'Caja', 'Paquete', 'Rollo'])
    .withMessage('Invalid unit'),
  body('unitPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit price must be positive')
], async (req, res) => {
  try {
    console.log('Updating part:', req.params.id, req.body);
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

    // Check if part number already exists (excluding current part)
    if (req.body.partNumber) {
      const existingPart = await Part.findOne({ 
        partNumber: req.body.partNumber.toUpperCase(),
        _id: { $ne: req.params.id },
        createdBy: req.user._id
      });
      
      if (existingPart) {
        return res.status(400).json({
          success: false,
          message: 'A part with this part number already exists'
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
    if (updateData.partNumber) {
      updateData.partNumber = updateData.partNumber.toUpperCase();
    }

    const part = await Part.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      updateData,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .populate('warehouse', 'name address department');

    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Part not found'
      });
    }

    console.log('Part updated successfully');

    res.status(200).json({
      success: true,
      data: part
    });
  } catch (error) {
    console.error('Update part error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating part',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update part stock
// @route   PUT /api/parts/:id/stock
// @access  Private
router.put('/:id/stock', [
  body('type')
    .isIn(['Entrada', 'Salida', 'Ajuste', 'Transferencia'])
    .withMessage('Invalid movement type'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('reason')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Reason is required and must be less than 200 characters'),
  body('reference')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Reference must be less than 50 characters')
], async (req, res) => {
  try {
    console.log('Updating part stock:', req.params.id, req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const part = await Part.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Part not found'
      });
    }

    const { type, quantity, reason, reference } = req.body;
    const previousStock = part.currentStock;
    let newStock;

    // Calculate new stock based on movement type
    switch (type) {
      case 'Entrada':
        newStock = previousStock + quantity;
        break;
      case 'Salida':
        newStock = Math.max(0, previousStock - quantity);
        break;
      case 'Ajuste':
        newStock = quantity; // For adjustments, quantity is the new total
        break;
      case 'Transferencia':
        newStock = Math.max(0, previousStock - quantity);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid movement type'
        });
    }

    // Add stock movement record
    const stockMovement = {
      type,
      quantity: type === 'Ajuste' ? quantity - previousStock : quantity,
      reason,
      reference,
      previousStock,
      newStock,
      performedBy: req.user._id
    };

    part.stockMovements.push(stockMovement);
    part.currentStock = newStock;

    await part.save();

    // Populate the updated part
    const populatedStockUpdatePart = await part.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'warehouse', select: 'name address department' },
      { path: 'stockMovements.performedBy', select: 'name email' }
    ]);

    console.log('Part stock updated successfully');

    // Create FinanceRecord for 'Entrada' of stock if unitPrice is available
    if (type === 'Entrada' && populatedStockUpdatePart.unitPrice && populatedStockUpdatePart.unitPrice > 0) {
      try {
        const currentMovement = populatedStockUpdatePart.stockMovements[populatedStockUpdatePart.stockMovements.length - 1];
        const totalCost = currentMovement.quantity * populatedStockUpdatePart.unitPrice;
        
        const financeRecordData = {
          type: 'Egreso',
          category: 'Compra de Repuestos',
          description: `Compra de ${currentMovement.quantity} x ${populatedStockUpdatePart.name} (${populatedStockUpdatePart.partNumber})`,
          amount: totalCost,
          date: currentMovement.date || new Date(),
          paymentMethod: req.body.paymentMethodStock || 'Efectivo', // Consider a specific field for payment method on stock update
          sourceType: 'Part',
          sourceId: populatedStockUpdatePart._id,
          reference: currentMovement.reference,
          createdBy: req.user._id,
          notes: `Entrada de stock: ${currentMovement.reason}. Cantidad: ${currentMovement.quantity}, Precio Unit.: ${populatedStockUpdatePart.unitPrice}`
        };
        const newFinanceRecord = new FinanceRecord(financeRecordData);
        await newFinanceRecord.save();
        console.log('FinanceRecord created for part stock entry:', newFinanceRecord._id);
      } catch (financeError) {
        console.error('Error creating FinanceRecord for part stock entry:', financeError);
      }
    }

    res.status(200).json({
      success: true,
      data: populatedStockUpdatePart
    });
  } catch (error) {
    console.error('Update part stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating part stock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Delete part
// @route   DELETE /api/parts/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    console.log('Deleting part:', req.params.id);
    console.log('User ID:', req.user._id);
    
    const part = await Part.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Part not found'
      });
    }

    console.log('Part deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Part deleted successfully'
    });
  } catch (error) {
    console.error('Delete part error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting part',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;