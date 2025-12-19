
const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    
  // Branch Information
  zone: { type: String, trim: true },
  branch: { type: String, required: true, trim: true },
  residentPastor: { type: String, trim: true },
  reportPreparedBy: { type: String, trim: true },
  officialEmail: { type: String, trim: true },
  month: { type: String, required: true },
  
  // Income/Credit Items
  offering: { type: Number, default: 0 },
  tithe: { type: Number, default: 0 },
  seedOffering: { type: Number, default: 0 },
  thanksgiving: { type: Number, default: 0 },
  annualThanksgiving: { type: Number, default: 0 },
  buildingProject: { type: Number, default: 0 },
  otherProject: { type: Number, default: 0 },
  crusadeAndMissionary: { type: Number, default: 0 },
  groupMinistryDeposits: { type: Number, default: 0 },
  assetDisposal: { type: Number, default: 0 },
  interestIncome: { type: Number, default: 0 },
  loanRepaidByDebtors: { type: Number, default: 0 },
  loanReceived: { type: Number, default: 0 },
  donationReceived: { type: Number, default: 0 },
  
  // Expenses/Debit Items
  remittance25Percent: { type: Number, default: 0 },
  remittance25PercentReceipt: { type: String },
  remittance5PercentHQ: { type: Number, default: 0 },
  remittance5PercentHQReceipt: { type: String },
  remittance5PercentZonal: { type: Number, default: 0 },
  salariesAndAllowances: { type: Number, default: 0 },
  pastorsPension: { type: Number, default: 0 },
  crusadeMission: { type: Number, default: 0 },
  parsonageWelfare: { type: Number, default: 0 },
  transportAndTravels: { type: Number, default: 0 },
  hotelAndAccommodation: { type: Number, default: 0 },
  donationsGiftsLoveOffering: { type: Number, default: 0 },
  entertainmentAndFeeding: { type: Number, default: 0 },
  medicalWelfare: { type: Number, default: 0 },
  churchExpenses: { type: Number, default: 0 },
  officeExpenses: { type: Number, default: 0 },
  rentParsonage: { type: Number, default: 0 },
  rentChurchBuilding: { type: Number, default: 0 },
  telephoneInternet: { type: Number, default: 0 },
  electricityLighting: { type: Number, default: 0 },
  fuelAndOil: { type: Number, default: 0 },
  licenseDuesSubscriptions: { type: Number, default: 0 },
  security: { type: Number, default: 0 },
  bankCharges: { type: Number, default: 0 },
  groupExpenses: { type: Number, default: 0 },
  loanAdvanced: { type: Number, default: 0 },
  loanRepaidToCreditor: { type: Number, default: 0 },
  repairsFurnitureAndFittings: { type: Number, default: 0 },
  repairsEquipment: { type: Number, default: 0 },
  repairsMotorVehicles: { type: Number, default: 0 },
  repairsChurchBuilding: { type: Number, default: 0 },
  repairsParsonage: { type: Number, default: 0 },
  building: { type: Number, default: 0 },
  motorVehicle: { type: Number, default: 0 },
  generator: { type: Number, default: 0 },
  musicalEquipment: { type: Number, default: 0 },
  asabaProject: { type: Number, default: 0 },
  others: { type: Number, default: 0 },
  
  // Additional Information
  confirmationOfPayment: { type: String },
  numberOfFullTimePastors: { type: Number, default: 0 },
  
  // System Fields
  status: {
    type: String,
    enum: ['unreviewed', 'reviewed', 'posted'],
    default: 'unreviewed'
  },

  batchFileUrl: { type: String },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  postedAt: { type: Date }
}, {
  timestamps: true

});

// Index for quick queries
formSchema.index({ status: 1, submittedAt: -1 });
formSchema.index({ branch: 1, month: 1 });


module.exports = mongoose.model('Form', formSchema);