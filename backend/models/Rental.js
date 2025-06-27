import mongoose from 'mongoose';

const rentalSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'El nombre del cliente es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre del cliente no puede exceder los 100 caracteres']
  },
  contactPerson: {
    type: String,
    required: [true, 'La persona de contacto es obligatoria'],
    trim: true,
    maxlength: [100, 'La persona de contacto no puede exceder los 100 caracteres']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'Por favor, introduce un email válido']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'El teléfono no puede exceder los 20 caracteres']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'La dirección no puede exceder los 200 caracteres']
  },
  equipmentType: {
    type: String,
    required: [true, 'El tipo de equipo es obligatorio'],
    enum: ['vehicle', 'machinery']
  },
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'El equipo es obligatorio'],
    refPath: 'equipmentTypeRef'
  },
  equipmentTypeRef: { // Helper field for refPath
    type: String,
    required: true,
    enum: ['Vehicle', 'Machinery']
  },
  startDate: {
    type: Date,
    required: [true, 'La fecha de inicio es obligatoria']
  },
  endDate: {
    type: Date,
    required: [true, 'La fecha de fin es obligatoria']
  },
  dailyRate: {
    type: Number,
    required: [true, 'La tarifa diaria es obligatoria'],
    min: [0, 'La tarifa diaria no puede ser negativa']
  },
  deposit: {
    type: Number,
    min: [0, 'El depósito no puede ser negativo'],
    default: 0
  },
  includeOperator: {
    type: Boolean,
    default: false
  },
  fuelIncluded: {
    type: Boolean,
    default: false
  },
  transportCost: {
    type: Number,
    min: [0, 'El costo de transporte no puede ser negativo'],
    default: 0
  },
  jobDescription: {
    type: String,
    required: [true, 'La descripción del trabajo es obligatoria'],
    trim: true,
    maxlength: [1000, 'La descripción del trabajo no puede exceder los 1000 caracteres']
  },
  deliveryAddress: {
    type: String,
    trim: true,
    maxlength: [200, 'La dirección de entrega no puede exceder los 200 caracteres']
  },
  // Calculated fields (not stored, but good for reference or future virtuals)
  // totalCost: { type: Number }, 
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  collection: 'rentals'
});

// Indexes
rentalSchema.index({ customerName: 1 });
rentalSchema.index({ startDate: -1 });
rentalSchema.index({ endDate: -1 });
rentalSchema.index({ equipment: 1 });
rentalSchema.index({ createdBy: 1 });
rentalSchema.index({ createdAt: -1 });


// Pre-save hook to set equipmentTypeRef based on equipmentType
rentalSchema.pre('save', function(next) {
  if (this.equipmentType === 'vehicle') {
    this.equipmentTypeRef = 'Vehicle';
  } else if (this.equipmentType === 'machinery') {
    this.equipmentTypeRef = 'Machinery';
  } else {
    // Should ideally be caught by enum validation, but good as a safeguard
    return next(new Error('Tipo de equipo inválido.')); 
  }
  next();
});

// Validate that endDate is after startDate
rentalSchema.pre('save', function(next) {
  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    return next(new Error('La fecha de fin no puede ser anterior a la fecha de inicio.'));
  }
  next();
});


const Rental = mongoose.model('Rental', rentalSchema);

export default Rental;
