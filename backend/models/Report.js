import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reportType: {
    type: String,
    required: true,
    enum: ['general', 'alerts', 'finance', 'fuel', 'machinery', 'parts', 'rentals', 'tools', 'vehicles', 'warehouses'],
  },
  data: {
    type: Object,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Report = mongoose.model('Report', ReportSchema);

export default Report;
