import mongoose from 'mongoose';

const machinerySchema = new mongoose.Schema({
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [100, 'Brand cannot be more than 100 characters']
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true,
    maxlength: [100, 'Model cannot be more than 100 characters']
  },
  serialNumber: {
    type: String,
    required: [true, 'Serial number is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Serial number cannot be more than 50 characters']
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: ['Excavadora', 'Bulldozer', 'Grúa', 'Cargadora', 'Compactadora', 'Retroexcavadora', 'Motoniveladora', 'Volquete', 'Otro'],
    default: 'Otro'
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [1900, 'Year must be after 1900'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
  },
  status: {
    type: String,
    enum: ['Disponible', 'Alquilada', 'En Mantenimiento', 'Fuera de Servicio'],
    default: 'Disponible'
  },
  hourMeter: {
    type: Number,
    default: 0,
    min: [0, 'Hour meter cannot be negative']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  purchaseDate: {
    type: Date
  },
  purchasePrice: {
    type: Number,
    min: [0, 'Purchase price cannot be negative']
  },
  location: {
    type: String,
    maxlength: [200, 'Location cannot be more than 200 characters']
  },
  compatibleParts: [{
    partName: String,
    partNumber: String,
    supplier: String
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
    technician: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  collection: 'machineries'
});

// Indexes for better performance
machinerySchema.index({ serialNumber: 1 });
machinerySchema.index({ brand: 1, model: 1 });
machinerySchema.index({ status: 1 });
machinerySchema.index({ type: 1 });
machinerySchema.index({ createdBy: 1 });
machinerySchema.index({ purchaseDate: -1 });
machinerySchema.index({ createdAt: -1 });


const Machinery = mongoose.model('Machinery', machinerySchema);

export default Machinery;