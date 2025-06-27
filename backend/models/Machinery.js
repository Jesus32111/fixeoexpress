import mongoose from 'mongoose';

const machinerySchema = new mongoose.Schema({
  plate: { // Assuming 'plate' will be used as a unique identifier similar to vehicles
    type: String,
    required: [true, 'Plate/Serial is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [50, 'Plate/Serial cannot be more than 50 characters'] // Adjusted length
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
  currentMileage: { // Changed from hourMeter to currentMileage for consistency
    type: Number,
    required: [true, 'Current mileage/hours is required'],
    min: [0, 'Current mileage/hours cannot be negative'],
    default: 0
  },
  status: {
    type: String,
    enum: ['Operativo', 'En Mantenimiento', 'No Disponible', 'Fuera de Servicio', 'Alquilada'], // Added 'Alquilada' and mapped others
    default: 'Operativo'
  },
  soatExpiration: { // Assuming machinery might have SOAT or equivalent
    type: Date,
    required: [true, 'SOAT/Equivalent expiration date is required']
  },
  technicalReviewExpiration: { // Assuming machinery might have technical reviews
    type: Date,
    required: [true, 'Technical review/Equivalent expiration date is required']
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Warehouse is required']
  },
  documents: {
    soat: { // SOAT or equivalent document
      filename: String,
      originalName: String,
      uploadDate: Date,
      size: Number
    },
    technicalReview: { // Technical Review or equivalent document
      filename: String,
      originalName: String,
      uploadDate: Date,
      size: Number
    },
    propertyCard: { // Property Card or equivalent document
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
    mileage: Number, // Assuming mileage/hours will be recorded here
    technician: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  collection: 'machineries' // Keep collection name or change if needed
});

// Indexes for better performance
machinerySchema.index({ plate: 1 }); // Changed from serialNumber to plate
machinerySchema.index({ brand: 1, model: 1 });
machinerySchema.index({ status: 1 });
machinerySchema.index({ warehouse: 1 });
machinerySchema.index({ createdBy: 1 });
machinerySchema.index({ createdAt: -1 });
machinerySchema.index({ soatExpiration: 1 });
machinerySchema.index({ technicalReviewExpiration: 1 });

// Virtual for checking if SOAT/Equivalent is expired or expiring soon
machinerySchema.virtual('soatStatus').get(function() {
  const now = new Date();
  const soatDate = new Date(this.soatExpiration);
  const daysUntilExpiration = Math.ceil((soatDate - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiration < 0) return 'expired';
  if (daysUntilExpiration <= 30) return 'expiring';
  return 'valid';
});

// Virtual for checking if Technical Review/Equivalent is expired or expiring soon
machinerySchema.virtual('technicalReviewStatus').get(function() {
  const now = new Date();
  const reviewDate = new Date(this.technicalReviewExpiration);
  const daysUntilExpiration = Math.ceil((reviewDate - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiration < 0) return 'expired';
  if (daysUntilExpiration <= 30) return 'expiring';
  return 'valid';
});

// Virtual for checking if machinery needs attention (expired docs or pending maintenance)
machinerySchema.virtual('needsAttention').get(function() {
  const soatStatus = this.soatStatus;
  const techStatus = this.technicalReviewStatus;
  const hasCriticalMaintenance = (this.pendingMaintenance || []).some(m => m.priority === 'Crítica');

  return soatStatus === 'expired' || techStatus === 'expired' || hasCriticalMaintenance;
});

// Ensure virtual fields are serialized
machinerySchema.set('toJSON', { virtuals: true });

const Machinery = mongoose.model('Machinery', machinerySchema);

export default Machinery;