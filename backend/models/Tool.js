import mongoose from 'mongoose';

const toolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tool name is required'],
    trim: true,
    maxlength: [100, 'Tool name cannot be more than 100 characters']
  },
  code: {
    type: String,
    trim: true,
    maxlength: [50, 'Tool code cannot be more than 50 characters'],
    uppercase: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Herramientas Manuales',
      'Herramientas Eléctricas',
      'Herramientas Neumáticas',
      'Herramientas de Medición',
      'Herramientas de Corte',
      'Herramientas de Soldadura',
      'Herramientas de Seguridad',
      'Equipos de Elevación',
      'Otros'
    ],
    default: 'Otros'
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Warehouse is required']
  },
  condition: {
    type: String,
    enum: ['Excelente', 'Bueno', 'Regular', 'Malo', 'Fuera de Servicio'],
    default: 'Bueno'
  },
  status: {
    type: String,
    enum: ['Disponible', 'En Uso', 'En Mantenimiento', 'Perdida', 'Dañada'],
    default: 'Disponible'
  },
  assignedTo: {
    type: String,
    trim: true,
    maxlength: [100, 'Assigned person name cannot be more than 100 characters']
  },
  assignedDate: {
    type: Date
  },
  purchaseDate: {
    type: Date
  },
  purchasePrice: {
    type: Number,
    min: [0, 'Purchase price cannot be negative']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [50, 'Brand cannot be more than 50 characters']
  },
  model: {
    type: String,
    trim: true,
    maxlength: [50, 'Model cannot be more than 50 characters']
  },
  serialNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Serial number cannot be more than 50 characters']
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  maintenanceHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['Mantenimiento', 'Reparación', 'Calibración', 'Inspección']
    },
    description: String,
    cost: Number,
    technician: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  collection: 'tools'
});

// Indexes for better performance
toolSchema.index({ name: 1 });
toolSchema.index({ code: 1 });
toolSchema.index({ category: 1 });
toolSchema.index({ warehouse: 1 });
toolSchema.index({ status: 1 });
toolSchema.index({ createdBy: 1 });
toolSchema.index({ createdAt: -1 });

// Virtual for checking if tool needs attention
toolSchema.virtual('needsAttention').get(function() {
  return this.condition === 'Malo' || this.status === 'Dañada' || this.status === 'Perdida';
});

// Ensure virtual fields are serialized
toolSchema.set('toJSON', { virtuals: true });

const Tool = mongoose.model('Tool', toolSchema);

export default Tool;