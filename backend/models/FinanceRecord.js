import mongoose from 'mongoose';

const financeRecordSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Ingreso', 'Egreso'],
    required: [true, 'Finance record type is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [100, 'Category cannot be more than 100 characters']
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: [100, 'Subcategory cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be positive']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Yape', 'Plin', 'Otro'],
    default: 'Efectivo'
  },
  reference: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference cannot be more than 100 characters']
  },
  sourceType: {
    type: String,
    // Added 'Part' and 'Tool'. Considered 'FuelRecord' but 'Fuel' is already in use and working.
    // 'Maintenance' and 'Purchase' are generic and could be used by other modules if needed.
    enum: ['Rental', 'Manual', 'Fuel', 'Part', 'Tool', 'Maintenance', 'Purchase', 'Sale'],
    default: 'Manual'
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sourceType'
  },
  attachments: [{
    filename: String,
    originalName: String,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    size: Number,
    description: String
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot be more than 50 characters']
  }],
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringConfig: {
    frequency: {
      type: String,
      enum: ['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Semestral', 'Anual']
    },
    nextDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  collection: 'finance_records'
});

// Indexes for better performance
financeRecordSchema.index({ type: 1 });
financeRecordSchema.index({ category: 1 });
financeRecordSchema.index({ date: -1 });
financeRecordSchema.index({ createdBy: 1 });
financeRecordSchema.index({ sourceType: 1, sourceId: 1 });

// Pre-save middleware to handle recurring records
financeRecordSchema.pre('save', function(next) {
  if (this.isRecurring && this.recurringConfig.frequency && !this.recurringConfig.nextDate) {
    const nextDate = new Date(this.date);
    
    switch (this.recurringConfig.frequency) {
      case 'Diario':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'Semanal':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'Quincenal':
        nextDate.setDate(nextDate.getDate() + 15);
        break;
      case 'Mensual':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'Trimestral':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'Semestral':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'Anual':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    
    this.recurringConfig.nextDate = nextDate;
  }
  next();
});

const FinanceRecord = mongoose.model('FinanceRecord', financeRecordSchema);

export default FinanceRecord;