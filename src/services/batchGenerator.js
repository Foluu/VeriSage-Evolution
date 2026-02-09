const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');


// Account mapping based on account list
const ACCOUNT_MAP = {

  // Income/Credit accounts (IsDebit = N)
  offering: { account: '4500', description: 'OFFERING', isDebit: 'N' },
  tithe: { account: '4510', description: 'TITHE', isDebit: 'N' },
  seedOffering: { account: '4550', description: 'SEED OFFERING', isDebit: 'N' },
  thanksgiving: { account: '4550', description: 'THANKSGIVING', isDebit: 'N' },
  annualThanksgiving: { account: '4550', description: 'ANNUAL THANKSGIVING', isDebit: 'N' },
  otherProject: { account: '4550', description: 'OTHER PROJECTS', isDebit: 'N' },
  donationReceived: { account: '4560', description: 'DONATION RECEIVED', isDebit: 'N' },
  buildingProject: { account: '4600', description: 'BUILDING FUND', isDebit: 'N' },
  crusadeAndMissionary: { account: '4560', description: 'CRUSADE & MISSION', isDebit: 'N' },
  groupMinistryDeposits: { account: '4700', description: 'GROUP INCOME', isDebit: 'N' },
  assetDisposal: { account: '4580', description: 'PROCEEDS FROM ASSET DISPOSAL', isDebit: 'N' },
  interestIncome: { account: '4570', description: 'INTEREST INCOME', isDebit: 'N' },
  loanRepaidByDebtors: { account: '4550', description: 'LOAN REPAID BY DEBTORS', isDebit: 'N' },
  loanReceived: { account: '4550', description: 'LOAN RECEIVED', isDebit: 'N' },


  // Expense/Debit accounts (IsDebit = Y)
  remittance25Percent: { account: '5000', description: '25% REMITTANCE TO NAT. OFFICE', isDebit: 'Y' },
  remittance5PercentZonal: { account: '5001', description: '5% REMITTANCE TO ZONAL HEADQUARTERS', isDebit: 'Y' },
  remittance5PercentHQ: { account: '5002', description: '5% REMITTANCE FOR HQ. BUILDING', isDebit: 'Y' },
  salariesAndAllowances: { account: '7000', description: 'SALARIES & WAGES', isDebit: 'Y' },
  pastorsPension: { account: '7135', description: "PASTOR'S PENSION", isDebit: 'Y' },
  crusadeMission: { account: '5210', description: 'CRUSADE & MISSION', isDebit: 'Y' },
  parsonageWelfare: { account: '7115', description: 'PARSONAGE WELFARE', isDebit: 'Y' },
  transportAndTravels: { account: '6050', description: 'TRANSPORT & TRAVELS', isDebit: 'Y' },
  hotelAndAccommodation: { account: '6060', description: 'HOTEL & ACCOMMODATION', isDebit: 'Y' },
  donationsGiftsLoveOffering: { account: '6045', description: 'DONATIONS/GIFTS/LOVE OFFERING', isDebit: 'Y' },
  entertainmentAndFeeding: { account: '6065', description: 'FEEDING & ENTERTAINMENT', isDebit: 'Y' },
  medicalWelfare: { account: '7120', description: 'MEDICAL WELFARE', isDebit: 'Y' },
  churchExpenses: { account: '6000', description: 'CHURCH EXPENSES', isDebit: 'Y' },
  officeExpenses: { account: '6010', description: 'OFFICE EXPENSES', isDebit: 'Y' },
  rentParsonage: { account: '6400', description: 'RENT - PERSONAGE', isDebit: 'Y' },
  rentChurchBuilding: { account: '6400', description: 'RENT - CHURCH BUILDING', isDebit: 'Y' },
  telephoneInternet: { account: '6025', description: 'TELEPHONE', isDebit: 'Y' },
  electricityLighting: { account: '6075', description: 'ELECTRICITY', isDebit: 'Y' },
  fuelAndOil: { account: '8200', description: 'FUEL & OIL', isDebit: 'Y' },
  licenseDuesSubscriptions: { account: '6035', description: 'LICENSE, DUES & SUBSCRIPTIONS', isDebit: 'Y' },
  security: { account: '6300', description: 'SECURITY', isDebit: 'Y' },
  bankCharges: { account: '6500', description: 'BANK CHARGES', isDebit: 'Y' },
  groupExpenses: { account: '5900', description: 'GROUP EXPENSES', isDebit: 'Y' },
  loanAdvanced: { account: '6105', description: 'LOAN ADVANCED', isDebit: 'Y' },
  loanRepaidToCreditor: { account: '6105', description: 'LOAN REPAID TO CREDITOR', isDebit: 'Y' },
  repairsFurnitureAndFittings: { account: '8420', description: 'FURN. & FITTINGS', isDebit: 'Y' },
  repairsEquipment: { account: '8410', description: 'REP & MTCE. - EQUIPMENT', isDebit: 'Y' },
  repairsMotorVehicles: { account: '8400', description: 'REP & MTCE. - M/V', isDebit: 'Y' },
  repairsChurchBuilding: { account: '8405', description: 'REP & MTCE. - LAND & BUILDING', isDebit: 'Y' },
  repairsParsonage: { account: '8300', description: 'REP & MTCE. - PARSONAGE', isDebit: 'Y' },
  building: { account: '8500', description: 'DEP - BUILDING', isDebit: 'Y' },
  motorVehicle: { account: '8510', description: 'DEP - MOTOR VEHICLE', isDebit: 'Y' },
  generator: { account: '8530', description: 'DEP - PLANT & EQUIP.', isDebit: 'Y' },
  musicalEquipment: { account: '6000', description: 'MUSCIAL EQUIPMENT', isDebit: 'Y' },
  asabaProject: { account: '5700', description: 'ASABA PROJECT', isDebit: 'Y' },
  others: { account: '6000', description: 'OTHERS', isDebit: 'Y' }
};


// Convert month name to date format
const getDateFromMonth = (monthName, year = new Date().getFullYear()) => {
  const monthMap = {
    'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3, 'APRIL': 4,
    'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8,
    'SEPTEMBER': 9, 'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12
  };
  
  const month = monthMap[monthName.toUpperCase()];
  return new Date(year, month - 1, 25);
};

// Format date as D/M/YYYY
const formatDate = (date) => {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

// Escape CSV field (handle commas, quotes, newlines)
const escapeCSVField = (field) => {
  if (field == null) return '';
  
  const str = String(field);
  
  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
};

// Generate CSV rows for a single form
const generateFormRows = (form) => {
  const txDate = formatDate(getDateFromMonth(form.month));
  const reference = form.branch.toUpperCase();
  
  let totalCredit = 0;
  let totalDebit = 0;
  const rows = [];
  
  // Process each field in the form
  for (const [field, value] of Object.entries(form.toObject ? form.toObject() : form)) {
    // Skip non-numeric fields, zero values, and system fields
    if (typeof value !== 'number' || value === 0 || !ACCOUNT_MAP[field]) {
      continue;
    }
    
    const mapping = ACCOUNT_MAP[field];
    
    // Create CSV row
    const row = [
      escapeCSVField(txDate),
      escapeCSVField(mapping.description),
      escapeCSVField(reference),
      escapeCSVField(value),
      escapeCSVField('N'),
      escapeCSVField('0'),
      escapeCSVField(''),
      escapeCSVField(''),
      escapeCSVField(''),
      escapeCSVField(mapping.account),
      escapeCSVField(mapping.isDebit)
    ];
    
    rows.push(row.join(','));
    
    // Track totals for petty cash calculation
    if (mapping.isDebit === 'N') {
      totalCredit += value;
    } else {
      totalDebit += value;
    }
  }
  
  // Calculate and add PETTY CASH entry
  const pettyCashAmount = totalCredit - totalDebit;
  
  if (pettyCashAmount !== 0) {
    const pettyCashDate = new Date(getDateFromMonth(form.month));
    pettyCashDate.setDate(pettyCashDate.getDate());
    
    const pettyCashRow = [
      escapeCSVField(formatDate(pettyCashDate)),
      escapeCSVField('PETTY CASH'),
      escapeCSVField(reference),
      escapeCSVField(Math.abs(pettyCashAmount)),
      escapeCSVField('N'),
      escapeCSVField('0'),
      escapeCSVField(''),
      escapeCSVField(''),
      escapeCSVField(''),
      escapeCSVField('1300'),
      escapeCSVField(pettyCashAmount < 0 ? 'N' : 'Y')
    ];
    
    rows.push(pettyCashRow.join(','));
  }
  
  return rows;
};

// Create batch file from single form data
const createBatch = async (form) => {
  try {
    // CSV Header
    const headers = [
      'TxDate',
      'Description',
      'Reference',
      'Amount',
      'UseTax',
      'TaxType',
      'TaxAccount',
      'TaxAmount',
      'Project',
      'Account',
      'IsDebit'
    ];
    
    // Start CSV with header row
    let csvContent = headers.join(',') + '\n';
    
    // Add form rows
    const formRows = generateFormRows(form);
    csvContent += formRows.join('\n') + '\n';
    
    // Ensure exports directory exists
    const exportDir = path.join(process.cwd(), process.env.EXPORT_DIR || 'exports');
    await fs.mkdir(exportDir, { recursive: true });
    
    // Generate filename
    const filename = `${form.branch}_${form.month}_${form._id}.csv`;
    const filepath = path.join(exportDir, filename);
    
    // Write CSV file
    await fs.writeFile(filepath, csvContent, 'utf8');
    
    return {
      filename,
      filepath,
      url: `/exports/${filename}`
    };
    
  } catch (error) {
    console.error('Batch generation error:', error);
    throw new Error(`Failed to generate batch file: ${error.message}`);
  }
};

// Create bulk batch file from multiple reviewed forms
const createBulkBatch = async (forms) => {
  try {
    if (!forms || forms.length === 0) {
      throw new Error('No forms provided for bulk batch generation');
    }
    
    // Generate unique batch ID
    const batchId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    
    // CSV Header
    const headers = [
      'TxDate',
      'Description',
      'Reference',
      'Amount',
      'UseTax',
      'TaxType',
      'TaxAccount',
      'TaxAmount',
      'Project',
      'Account',
      'IsDebit'
    ];
    
    // Start CSV with header row
    let csvContent = headers.join(',') + '\n';
    
    // Process each form and add its rows
    for (const form of forms) {
      const formRows = generateFormRows(form);
      csvContent += formRows.join('\n') + '\n';
    }
    
    // Ensure exports directory exists
    const exportDir = path.join(process.cwd(), process.env.EXPORT_DIR || 'exports');
    await fs.mkdir(exportDir, { recursive: true });
    
    // Generate filename with count and date
    const filename = `BULK_BATCH_${timestamp}_${forms.length}_forms_${batchId.slice(0, 8)}.csv`;
    const filepath = path.join(exportDir, filename);
    
    // Write CSV file
    await fs.writeFile(filepath, csvContent, 'utf8');
    
    return {
      batchId,
      filename,
      filepath,
      url: `/exports/${filename}`,
      formCount: forms.length,
      formIds: forms.map(f => f._id.toString())
    };
    
  } catch (error) {
    console.error('Bulk batch generation error:', error);
    throw new Error(`Failed to generate bulk batch file: ${error.message}`);
  }
};

module.exports = {
  createBatch,
  createBulkBatch
};