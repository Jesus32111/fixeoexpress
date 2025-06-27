import mongoose from 'mongoose';

const partSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Part name is required'],
    trim: true,
    maxlength: [100, 'Part name cannot be more than 100 characters']
  },
  partNumber: {
    type: String,
    required: [true, 'Part number is required'],
    trim: true,
    maxlength: [50, 'Part number cannot be more than 50 characters'],
    uppercase: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Motor',
      'Transmisión',
      'Hidráulico',
      'Eléctrico',
      'Neumático',
      'Filtros',
      'Aceites y Lubricantes',
      'Frenos',
      'Suspensión',
      'Carrocería',
      'Herramientas',
      'Otros'
    ],
    default: 'Otros'
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Warehouse is required']
  },
  currentStock: {
    type: Number,
    required: [true, 'Current stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  minimumStock: {
    type: Number,
    required: [true, 'Minimum stock is required'],
    min: [0, 'Minimum stock cannot be negative'],
    default: 1
  },
  maximumStock: {
    type: Number,
    min: [0, 'Maximum stock cannot be negative']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['Unidad', 'Litro', 'Galón', 'Kilogramo', 'Metro', 'Caja', 'Paquete', 'Rollo'],
    default: 'Unidad'
  },
  unitPrice: {
    type: Number,
    min: [0, 'Unit price cannot be negative']
  },
  supplier: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Supplier name cannot be more than 100 characters']
    },
    contact: {
      type: String,
      trim: true,
      maxlength: [100, 'Contact cannot be more than 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone cannot be more than 20 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  compatibleEquipment: [{
    equipmentType: {
      type: String,
      enum: ['Vehicle', 'Machinery'],
      required: true
    },
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'compatibleEquipment.equipmentType'
    },
    equipmentName: String
  }],
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  stockMovements: [{
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['Entrada', 'Salida', 'Ajuste', 'Transferencia'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true,
      maxlength: [200, 'Reason cannot be more than 200 characters']
    },
    reference: {
      type: String,
      maxlength: [50, 'Reference cannot be more than 50 characters']
    },
    previousStock: Number,
    newStock: Number,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  collection: 'parts'
});

// Indexes for better performance
partSchema.index({ name: 1 });
partSchema.index({ partNumber: 1 });
partSchema.index({ category: 1 });
partSchema.index({ warehouse: 1 });
partSchema.index({ currentStock: 1 });
partSchema.index({ createdBy: 1 });
partSchema.index({ createdAt: -1 });

// Virtual for checking if part has low stock
partSchema.virtual('hasLowStock').get(function() {
  return this.currentStock <= this.minimumStock;
});

// Virtual for stock status
partSchema.virtual('stockStatus').get(function() {
  if (this.currentStock === 0) return 'out_of_stock';
  if (this.currentStock <= this.minimumStock) return 'low_stock';
  if (this.maximumStock && this.currentStock >= this.maximumStock) return 'overstock';
  return 'normal';
});

// Ensure virtual fields are serialized
partSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to update stock movements
partSchema.pre('save', function(next) {
  if (this.isModified('currentStock') && !this.isNew) {
    // This will be handled by the API routes when stock is updated
  }
  next();
});

const Part = mongoose.model('Part', partSchema);

export default Part;