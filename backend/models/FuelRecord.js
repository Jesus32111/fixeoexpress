import mongoose from 'mongoose';

const fuelRecordSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: function () {
      return !this.machinery;
    }
  },
  machinery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machinery',
    required: function () {
      return !this.vehicle;
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.1, 'Quantity must be at least 0.1 gallons']
  },
  pricePerGallon: {
    type: Number,
    required: [true, 'Price per gallon is required'],
    min: [0.01, 'Price per gallon must be positive']
  },
  totalCost: {
    type: Number,
    required: [true, 'Total cost is required'],
    min: [0.01, 'Total cost must be positive']
  },
  gasStation: {
    name: {
      type: String,
      required: [true, 'Gas station name is required'],
      trim: true,
      maxlength: [100, 'Gas station name cannot be more than 100 characters']
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot be more than 200 characters']
    }
  },
  fuelDate: {
    type: Date,
    required: [true, 'Fuel date is required'],
    default: Date.now
  },
  currentMileage: {
    type: Number,
    min: [0, 'Mileage cannot be negative']
  },
  currentHours: {
    type: Number,
    min: [0, 'Hours cannot be negative']
  },
  fuelType: {
    type: String,
    enum: ['Gasolina 84', 'Gasolina 90', 'Gasolina 95', 'Gasolina 97', 'Diesel B5', 'Diesel B20', 'GLP', 'GNV'],
    required: [true, 'Fuel type is required']
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  receiptNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Receipt number cannot be more than 50 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  collection: 'fuel_records'
});

// Indexes for better performance
fuelRecordSchema.index({ vehicle: 1 });
fuelRecordSchema.index({ machinery: 1 });
fuelRecordSchema.index({ fuelDate: -1 });
fuelRecordSchema.index({ createdBy: 1 });
fuelRecordSchema.index({ 'gasStation.name': 1 });
fuelRecordSchema.index({ createdAt: 1 });

// Validate that either vehicle or machinery is provided, but not both
fuelRecordSchema.pre('save', function (next) {
  if (this.vehicle && this.machinery) {
    return next(new Error('Cannot assign fuel record to both vehicle and machinery'));
  } else if (!this.vehicle && !this.machinery) {
    return next(new Error('Must assign fuel record to either vehicle or machinery'));
  }
  next();
});

// Calculate total cost before saving (robust version)
fuelRecordSchema.pre('save', function (next) {
  const qty = Number(this.quantity);
  const price = Number(this.pricePerGallon);

  if (!isNaN(qty) && !isNaN(price)) {
    this.totalCost = qty * price;
    return next();
  }

  this.invalidate('totalCost', 'Total cost could not be calculated due to invalid quantity or pricePerGallon');
  next(new Error('Invalid quantity or pricePerGallon for totalCost calculation'));
});

const FuelRecord = mongoose.model('FuelRecord', fuelRecordSchema);

export default FuelRecord;
