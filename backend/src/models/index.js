import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  order_id: { type: String, index: true },
  input: mongoose.Schema.Types.Mixed,
  predicted_rto_risk: Number,
  action: String,
  action_label: String,
  reason: String,
  decision_status: { type: String, default: 'DECIDED' },
  created_at: { type: Date, default: Date.now }
}, { minimize: false });

const sessionSchema = new mongoose.Schema({
  session_id: { type: String, unique: true, index: true },
  order_id: String,
  order: mongoose.Schema.Types.Mixed,
  flow: String,
  language: String,
  discount: Number,
  status: String,
  messages: [mongoose.Schema.Types.Mixed],
  clarification_sent: Boolean,
  payment_link: String,
  created_at: String,
  updated_at: String
}, { minimize: false });

const policySchema = new mongoose.Schema({
  key: { type: String, unique: true },
  values: mongoose.Schema.Types.Mixed
}, { minimize: false });

export const OrderModel = mongoose.models.CodOrder || mongoose.model('CodOrder', orderSchema);
export const SessionModel = mongoose.models.WhatsappSession || mongoose.model('WhatsappSession', sessionSchema);
export const PolicyModel = mongoose.models.CodPolicy || mongoose.model('CodPolicy', policySchema);
