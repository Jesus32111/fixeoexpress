import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  plate: {
    type: String,
    required: [true, 'Plate is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Plate cannot be more than 10 characters'],
    match: [/^[A-Z0-9-]+$/, 'Plate format is invalid']
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [50, 'Brand cannot be more than 50 characters']
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true,
    maxlength: [50, 'Model cannot be more than 50 characters']
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [1900, 'Year must be after 1900'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
  },
  currentMileage: {
    type: Number,
    required: [true, 'Current mileage is required'],
    min: [0, 'Current mileage cannot be negative'],
    default: 0
  },
  status: {
    type: String,
    enum: ['Operativo', 'En Mantenimiento', 'No Disponible', 'Fuera de Servicio'],
    default: 'Operativo'
  },
  soatExpiration: {
    type: Date,
    required: [true, 'SOAT expiration date is required']
  },
  technicalReviewExpiration: {
    type: Date,
    required: [true, 'Technical review expiration date is required']
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Warehouse is required']
  },
  documents: {
    soat: {
      filename: String,
      originalName: String,
      uploadDate: Date,
      size: Number
    },
    technicalReview: {
      filename: String,
      originalName: String,
      uploadDate: Date,
      size: Number
    },
    propertyCard: {
      filename: String,
      originalName: String,
      uploadDate: Date,
      size: Number
    },
    others: [{
      filename: String,
      originalName: String,
      uploadDate: Date,
      size: Number,
      description: String
    }]
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot be more than 1000 characters']
  },
  pendingMaintenance: [{
    description: {
      type: String,
      required: true,
      maxlength: [200, 'Description cannot be more than 200 characters']
    },
    priority: {
      type: String,
      enum: ['Baja', 'Media', 'Alta', 'Crítica'],
      default: 'Media'
    },
    estimatedCost: {
      type: Number,
      min: [0, 'Cost cannot be negative']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  maintenanceHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['Preventivo', 'Correctivo', 'Inspección']
    },
    description: String,
    cost: Number,
    mileage: Number,
    technician: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  collection: 'vehicles'
});

// Indexes for better performance
vehicleSchema.index({ plate: 1 });
vehicleSchema.index({ brand: 1, model: 1 });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ warehouse: 1 });
vehicleSchema.index({ createdBy: 1 });
vehicleSchema.index({ createdAt: -1 });
vehicleSchema.index({ soatExpiration: 1 });
vehicleSchema.index({ technicalReviewExpiration: 1 });

// Virtual for checking if SOAT is expired or expiring soon
vehicleSchema.virtual('soatStatus').get(function() {
  const now = new Date();
  const soatDate = new Date(this.soatExpiration);
  const daysUntilExpiration = Math.ceil((soatDate - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiration < 0) return 'expired';
  if (daysUntilExpiration <= 30) return 'expiring';
  return 'valid';
});

// Virtual for checking if Technical Review is expired or expiring soon
vehicleSchema.virtual('technicalReviewStatus').get(function() {
  const now = new Date();
  const reviewDate = new Date(this.technicalReviewExpiration);
  const daysUntilExpiration = Math.ceil((reviewDate - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiration < 0) return 'expired';
  if (daysUntilExpiration <= 30) return 'expiring';
  return 'valid';
});

// Virtual for checking if vehicle needs attention (expired docs or pending maintenance)
vehicleSchema.virtual('needsAttention').get(function() {
  const soatStatus = this.soatStatus;
  const techStatus = this.technicalReviewStatus;
  const hasCriticalMaintenance = (this.pendingMaintenance || []).some(m => m.priority === 'Crítica');

  return soatStatus === 'expired' || techStatus === 'expired' || hasCriticalMaintenance;
});

// Ensure virtual fields are serialized
vehicleSchema.set('toJSON', { virtuals: true });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;