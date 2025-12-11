
const Joi = require('joi');


// Required fields for form submission
const requiredFields = ['branch', 'month'];


// Filter out empty/null/undefined values from form data
const filterFilledFields = (data) => {
  const filtered = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Skip if value is null, undefined, or empty string
    if (value === null || value === undefined || value === '') {
      continue;
    }
    
    // Include the field
    filtered[key] = value;
  }
  
  return filtered;
};



// Validate form submission
const validateFormSubmission = (data) => {
  const schema = Joi.object({
    // Required fields
    branch: Joi.string().required().trim(),
    month: Joi.string().required().valid(
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ),
    


    // Optional string fields
    zone: Joi.string().trim().allow(''),
    residentPastor: Joi.string().trim().allow(''),
    reportPreparedBy: Joi.string().trim().allow(''),
    officialEmail: Joi.string().email().trim().allow(''),
    confirmationOfPayment: Joi.string().valid('YES', 'NO').allow(''),
    

    // File paths
    remittance25PercentReceipt: Joi.string().allow(''),
    remittance5PercentHQReceipt: Joi.string().allow(''),
    

    // Numeric fields (all optional, default to 0)
    offering: Joi.number().min(0).allow(''),
    tithe: Joi.number().min(0).allow(''),
    seedOffering: Joi.number().min(0).allow(''),
    thanksgiving: Joi.number().min(0).allow(''),
    annualThanksgiving: Joi.number().min(0).allow(''),
    buildingProject: Joi.number().min(0).allow(''),
    otherProject: Joi.number().min(0).allow(''),
    crusadeAndMissionary: Joi.number().min(0).allow(''),
    groupMinistryDeposits: Joi.number().min(0).allow(''),
    assetDisposal: Joi.number().min(0).allow(''),
    interestIncome: Joi.number().min(0).allow(''),
    loanRepaidByDebtors: Joi.number().min(0).allow(''),
    loanReceived: Joi.number().min(0).allow(''),
    donationReceived: Joi.number().min(0).allow(''),
    remittance25Percent: Joi.number().min(0).allow(''),
    remittance5PercentHQ: Joi.number().min(0).allow(''),
    remittance5PercentZonal: Joi.number().min(0).allow(''),
    salariesAndAllowances: Joi.number().min(0).allow(''),
    pastorsPension: Joi.number().min(0).allow(''),
    crusadeMissionary: Joi.number().min(0).allow(''),
    parsonageWelfare: Joi.number().min(0).allow(''),
    transportAndTravels: Joi.number().min(0).allow(''),
    hotelAndAccommodation: Joi.number().min(0).allow(''),
    donationsGiftsLoveOffering: Joi.number().min(0).allow(''),
    entertainmentAndFeeding: Joi.number().min(0).allow(''),
    medicalWelfare: Joi.number().min(0).allow(''),
    churchExpenses: Joi.number().min(0).allow(''),
    officeExpenses: Joi.number().min(0).allow(''),
    rentParsonage: Joi.number().min(0).allow(''),
    rentChurchBuilding: Joi.number().min(0).allow(''),
    telephoneInternet: Joi.number().min(0).allow(''),
    electricityLighting: Joi.number().min(0).allow(''),
    fuelAndOil: Joi.number().min(0).allow(''),
    licenseDuesSubscriptions: Joi.number().min(0).allow(''),
    security: Joi.number().min(0).allow(''),
    bankCharges: Joi.number().min(0).allow(''),
    groupExpenses: Joi.number().min(0).allow(''),
    loanAdvanced: Joi.number().min(0).allow(''),
    loanRepaidToCreditor: Joi.number().min(0).allow(''),
    repairsFurnitureAndFittings: Joi.number().min(0).allow(''),
    repairsEquipment: Joi.number().min(0).allow(''),
    repairsMotorVehicles: Joi.number().min(0).allow(''),
    repairsChurchBuilding: Joi.number().min(0).allow(''),
    repairsParsonage: Joi.number().min(0).allow(''),
    building: Joi.number().min(0).allow(''),
    motorVehicle: Joi.number().min(0).allow(''),
    generator: Joi.number().min(0).allow(''),
    musicalEquipment: Joi.number().min(0).allow(''),
    asabaProject: Joi.number().min(0).allow(''),
    others: Joi.number().min(0).allow(''),
    numberOfFullTimePastors: Joi.number().min(0).integer().allow('')
  }).unknown(true); // Allow unknown fields to pass through


  return schema.validate(data, { abortEarly: false });
};

// Validate login credentials
const validateLogin = (data) => {
  const schema = Joi.object({
    username: Joi.string().required().trim(),
    password: Joi.string().required()
  });

  return schema.validate(data);
};


module.exports = {
  requiredFields,
  filterFilledFields,
  validateFormSubmission,
  validateLogin
};