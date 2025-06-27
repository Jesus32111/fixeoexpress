import express from 'express';
import { body, validationResult } from 'express-validator';
import Tool from '../models/Tool.js';
import Warehouse from '../models/Warehouse.js';
import FinanceRecord from '../models/FinanceRecord.js'; // Import FinanceRecord
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get all tools
// @route   GET /api/tools
// @access  Private
router.get('/', async (req, res) => {
  try {
    console.log('Getting all tools for user:', req.user._id);
    console.log('Query parameters:', req.query);
    
    const { category, warehouse, status, condition, search } = req.query;
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
    if (status && status !== 'all') {
      query.status = status;
      console.log('Filtering by status:', status);
    }
    if (condition && condition !== 'all') {
      query.condition = condition;
      console.log('Filtering by condition:', condition);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } }
      ];
      console.log('Filtering by search:', search);
    }

    console.log('Final query:', JSON.stringify(query, null, 2));

    const tools = await Tool.find(query)
      .populate('createdBy', 'name email')
      .populate('warehouse', 'name address department')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${tools.length} tools`);

    res.status(200).json({
      success: true,
      count: tools.length,
      data: tools
    });
  } catch (error) {
    console.error('Get tools error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tools',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get single tool
// @route   GET /api/tools/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    console.log('Getting tool with ID:', req.params.id);
    console.log('User ID:', req.user._id);
    
    const tool = await Tool.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    })
    .populate('createdBy', 'name email')
    .populate('warehouse', 'name address department');

    if (!tool) {
      console.log('Tool not found');
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    console.log('Tool found:', tool._id);

    res.status(200).json({
      success: true,
      data: tool
    });
  } catch (error) {
    console.error('Get tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tool',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Create new tool
// @route   POST /api/tools
// @access  Private
router.post('/', [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Tool name is required and must be less than 100 characters'),
  body('category')
    .isIn([
      'Herramientas Manuales',
      'Herramientas Eléctricas',
      'Herramientas Neumáticas',
      'Herramientas de Medición',
      'Herramientas de Corte',
      'Herramientas de Soldadura',
      'Herramientas de Seguridad',
      'Equipos de Elevación',
      'Otros'
    ])
    .withMessage('Invalid tool category'),
  body('warehouse')
    .isMongoId()
    .withMessage('Valid warehouse is required'),
  body('condition')
    .optional()
    .isIn(['Excelente', 'Bueno', 'Regular', 'Malo', 'Fuera de Servicio'])
    .withMessage('Invalid condition'),
  body('status')
    .optional()
    .isIn(['Disponible', 'En Uso', 'En Mantenimiento', 'Perdida', 'Dañada'])
    .withMessage('Invalid status'),
  body('purchasePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be positive')
], async (req, res) => {
  try {
    console.log('Creating new tool:', req.body);
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

    // Create tool
    const toolData = {
      ...req.body,
      createdBy: req.user._id
    };

    console.log('Creating tool with data:', toolData);

    const tool = new Tool(toolData);
    const savedTool = await tool.save();
    
    // Populate the created tool
    const populatedTool = await savedTool.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'warehouse', select: 'name address department' }
    ]);
    
    console.log('Tool created successfully:', populatedTool._id);

    // Create FinanceRecord for tool purchase if price is available
    if (populatedTool.purchasePrice && populatedTool.purchasePrice > 0) {
      try {
        const description = `Compra de herramienta: ${populatedTool.name} ${populatedTool.code ? `(${populatedTool.code})` : ''}`.trim();
        const financeRecordData = {
          type: 'Egreso',
          category: 'Compra de Herramientas',
          description: description,
          amount: populatedTool.purchasePrice,
          date: populatedTool.purchaseDate || new Date(),
          paymentMethod: req.body.paymentMethod || 'Efectivo', // Or from request if available
          sourceType: 'Tool',
          sourceId: populatedTool._id,
          createdBy: req.user._id,
          notes: `Adquisición de herramienta: ${populatedTool.name}`
        };
        const newFinanceRecord = new FinanceRecord(financeRecordData);
        await newFinanceRecord.save();
        console.log('FinanceRecord created for tool purchase:', newFinanceRecord._id);
      } catch (financeError) {
        console.error('Error creating FinanceRecord for tool purchase:', financeError);
      }
    }

    res.status(201).json({
      success: true,
      data: populatedTool
    });
  } catch (error) {
    console.error('Create tool error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating tool',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update tool
// @route   PUT /api/tools/:id
// @access  Private
router.put('/:id', [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Tool name must be less than 100 characters'),
  body('category')
    .optional()
    .isIn([
      'Herramientas Manuales',
      'Herramientas Eléctricas',
      'Herramientas Neumáticas',
      'Herramientas de Medición',
      'Herramientas de Corte',
      'Herramientas de Soldadura',
      'Herramientas de Seguridad',
      'Equipos de Elevación',
      'Otros'
    ])
    .withMessage('Invalid tool category'),
  body('warehouse')
    .optional()
    .isMongoId()
    .withMessage('Valid warehouse is required'),
  body('condition')
    .optional()
    .isIn(['Excelente', 'Bueno', 'Regular', 'Malo', 'Fuera de Servicio'])
    .withMessage('Invalid condition'),
  body('status')
    .optional()
    .isIn(['Disponible', 'En Uso', 'En Mantenimiento', 'Perdida', 'Dañada'])
    .withMessage('Invalid status'),
  body('purchasePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be positive')
], async (req, res) => {
  try {
    console.log('Updating tool:', req.params.id, req.body);
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

    const tool = await Tool.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .populate('warehouse', 'name address department');

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    console.log('Tool updated successfully');

    res.status(200).json({
      success: true,
      data: tool
    });
  } catch (error) {
    console.error('Update tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating tool',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Delete tool
// @route   DELETE /api/tools/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    console.log('Deleting tool:', req.params.id);
    console.log('User ID:', req.user._id);
    
    const tool = await Tool.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    console.log('Tool deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Tool deleted successfully'
    });
  } catch (error) {
    console.error('Delete tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting tool',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Add maintenance record
// @route   POST /api/tools/:id/maintenance
// @access  Private
router.post('/:id/maintenance', [
  body('type')
    .isIn(['Mantenimiento', 'Reparación', 'Calibración', 'Inspección'])
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
    console.log('Adding maintenance record to tool:', req.params.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const tool = await Tool.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    const maintenanceEntry = { ...req.body, date: req.body.date || new Date() };
    tool.maintenanceHistory.push(maintenanceEntry);
    await tool.save();

    // Create FinanceRecord for maintenance cost if applicable
    if (maintenanceEntry.cost && maintenanceEntry.cost > 0) {
      try {
        const description = `Costo de mantenimiento para herramienta: ${tool.name} (${maintenanceEntry.type} - ${maintenanceEntry.description.substring(0, 50)})`;
        const financeRecordData = {
          type: 'Egreso',
          category: 'Mantenimiento Herramientas',
          description: description,
          amount: maintenanceEntry.cost,
          date: maintenanceEntry.date,
          paymentMethod: req.body.paymentMethodMaintenance || 'Efectivo', // Consider specific field
          sourceType: 'Tool',
          sourceId: tool._id,
          reference: `Maint-${tool._id}-${maintenanceEntry.date.toISOString().split('T')[0]}`,
          createdBy: req.user._id,
          notes: `Mantenimiento: ${maintenanceEntry.type} para ${tool.name}. Costo: ${maintenanceEntry.cost}.`
        };
        const newFinanceRecord = new FinanceRecord(financeRecordData);
        await newFinanceRecord.save();
        console.log('FinanceRecord created for tool maintenance:', newFinanceRecord._id);
      } catch (financeError) {
        console.error('Error creating FinanceRecord for tool maintenance:', financeError);
      }
    }
    
    // Repopulate tool to include the new maintenance history and any other virtuals
    const populatedTool = await Tool.findById(tool._id)
        .populate('createdBy', 'name email')
        .populate('warehouse', 'name address department');


    res.status(200).json({
      success: true,
      data: populatedTool
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