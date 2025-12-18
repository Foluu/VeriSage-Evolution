const path = require('path');
const fs = require('fs').promises;

// Account mapping based on the sample batch file and account list
const ACCOUNT_MAP = {
  // Income/Credit accounts (IsDebit = N)
  offering: { account: '4500', description: 'OFFERING', isDebit: 'N' },
  tithe: { account: '4510', description: 'TITHE', isDebit: 'N' },
  seedOffering: { account: '4550', description: 'SEED OFFERING', isDebit: 'N' },
  thanksgiving: { account: '4550', description: 'THANKSGIVING', isDebit: 'N' },
  annualThanksgiving: { account: '4550', description: 'ANNUAL THANKSGIVING', isDebit: 'N' },
  otherProject: { account: '4550', description: 'OTHER PROJECTS', isDebit: 'N' },
  donationReceived: { account: '4560', description: 'DONATION RECEIVED', isDebit: 'N' },
  
  // Expense/Debit accounts (IsDebit = Y)
  remittance25Percent: { account: '5000', description: '25% REMITTANCE TO NAT. OFFICE', isDebit: 'Y' },
  remittance5PercentZonal: { account: '5001', description: '5% REMITTANCE TO ZONAL HEADQUARTERS', isDebit: 'Y' },
  remittance5PercentHQ: { account: '5002', description: '5% REMITTANCE FOR HQ. BUILDING', isDebit: 'Y' },
  pastorsPension: { account: '4020', description: "PASTOR'S PENSION", isDebit: 'Y' },
  medicalWelfare: { account: '7120', description: 'MEDICAL WELFARE', isDebit: 'Y' },
  officeExpenses: { account: '6005', description: 'OFFICE EXPENSES', isDebit: 'Y' },
  fuelAndOil: { account: '8200', description: 'FUEL & OIL', isDebit: 'Y' },
  repairsEquipment: { account: '8410', description: 'REPAIRS & MAINTENANCE - EQUIPMENT', isDebit: 'Y' },
  donationsGiftsLoveOffering: { account: '5030', description: 'DONATIONS/GIFTS/LOVE OFFERING', isDebit: 'Y' }
};

// Convert month name to date format
const getDateFromMonth = (monthName, year = new Date().getFullYear()) => {
  const monthMap = {
    'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3, 'APRIL': 4,
    'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8,
    'SEPTEMBER': 9, 'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12
  };
  
  const month = monthMap[monthName.toUpperCase()];
  return new Date(year, month - 1, 4);
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

// Create batch file from form data
const createBatch = async (form) => {
  try {
    const txDate = formatDate(getDateFromMonth(form.month));
    const reference = form.branch.toUpperCase();
    
    let totalCredit = 0;
    let totalDebit = 0;
    
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
    
    // Process each field in the form
    for (const [field, value] of Object.entries(form.toObject())) {
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
      
      csvContent += row.join(',') + '\n';
      
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
      
      csvContent += pettyCashRow.join(',') + '\n';
    }
    
    // Ensure exports directory exists
    const exportDir = path.join(process.cwd(), process.env.EXPORT_DIR || 'exports');
    await fs.mkdir(exportDir, { recursive: true });
    
    // Generate filename (CSV instead of XLSX)
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

module.exports = {
  createBatch
};

