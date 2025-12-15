const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;

/**
 * Account mapping based on the sample batch file and account list
 * Account structure remains unchanged
 */
const ACCOUNT_MAP = {

  // Income / Credit accounts (IsDebit = N)
  offering: { account: '4500', description: 'OFFERING', isDebit: 'N' },
  tithe: { account: '4510', description: 'TITHE', isDebit: 'N' },
  seedOffering: { account: '4550', description: 'SEED OFFERING', isDebit: 'N' },
  thanksgiving: { account: '4550', description: 'THANKSGIVING', isDebit: 'N' },
  annualThanksgiving: { account: '4550', description: 'ANNUAL THANKSGIVING', isDebit: 'N' },
  otherProject: { account: '4550', description: 'OTHER PROJECTS', isDebit: 'N' },
  donationReceived: { account: '4560', description: 'DONATION RECEIVED', isDebit: 'N' },

  // Expense / Debit accounts (IsDebit = Y)
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

/**
 * Convert month name to a transaction date
 * Uses the 4th day of the month by convention
 */
const getDateFromMonth = (monthName, year = new Date().getFullYear()) => {
  const monthMap = {
    JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4,
    MAY: 5, JUNE: 6, JULY: 7, AUGUST: 8,
    SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12
  };

  const month = monthMap[monthName.toUpperCase()];
  return new Date(year, month - 1, 4);
};

/**
 * Format date as M/D/YYYY
 * CSV-style date format
 */
const formatDate = (date) => {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
};

/**
 * Create batch file (CSV output)
 * Structure mirrors the Excel batch file exactly
 */
const createBatch = async (form) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Batch');

    /**
     * Define column headers
     * These headers are written as the first row in the CSV
     */
    worksheet.columns = [
      { header: 'TxDate', key: 'txDate', width: 12 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Reference', key: 'reference', width: 12 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'UseTax', key: 'useTax', width: 8 },
      { header: 'TaxType', key: 'taxType', width: 10 },
      { header: 'TaxAccount', key: 'taxAccount', width: 12 },
      { header: 'TaxAmount', key: 'taxAmount', width: 12 },
      { header: 'Project', key: 'project', width: 10 },
      { header: 'Account', key: 'account', width: 10 },
      { header: 'IsDebit', key: 'isDebit', width: 8 }
    ];

    /**
     * Excel-only formatting
     * --------------------------------------------------
     * CSV does NOT support formatting.
     * This block is intentionally commented out
     * in case XLSX output is reintroduced later.
     */

    /*
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    */


    const txDate = formatDate(getDateFromMonth(form.month));
    const reference = form.branch.toUpperCase();

    let totalCredit = 0;
    let totalDebit = 0;

    /**
     * Iterate through form fields
     * Only mapped numeric values are processed
     */
    for (const [field, value] of Object.entries(form.toObject())) {

      if (typeof value !== 'number' || value === 0 || !ACCOUNT_MAP[field]) {
        continue;
      }

      const mapping = ACCOUNT_MAP[field];

      worksheet.addRow({
        txDate,
        description: mapping.description,
        reference,
        amount: value,
        useTax: 'N',
        taxType: '0',
        taxAccount: '',
        taxAmount: '',
        project: '',
        account: mapping.account,
        isDebit: mapping.isDebit
      });

      // Track totals for petty cash balancing
      if (mapping.isDebit === 'N') {
        totalCredit += value;
      } else {
        totalDebit += value;
      }
    }

    /**
     * PETTY CASH balancing entry
     */
    const pettyCashAmount = totalCredit - totalDebit;

    if (pettyCashAmount !== 0) {
      const pettyCashDate = new Date(getDateFromMonth(form.month));
      pettyCashDate.setDate(pettyCashDate.getDate() + 1);

      worksheet.addRow({
        txDate: formatDate(pettyCashDate),
        description: 'PETTY CASH',
        reference,
        amount: Math.abs(pettyCashAmount),
        useTax: 'N',
        taxType: '0',
        taxAccount: '',
        taxAmount: '',
        project: '',
        account: '1300',
        isDebit: pettyCashAmount < 0 ? 'N' : 'Y'
      });
    }

    /**
     * Ensure export directory exists
     */
    const exportDir = path.join(process.cwd(), process.env.EXPORT_DIR || 'exports');
    await fs.mkdir(exportDir, { recursive: true });

    /**
     * MODIFIED SECTION
     * --------------------------------------------------
     * Output format switched from XLSX to CSV
     * Structure and data remain unchanged
     */
    const filename = `${form.branch}_${form.month}_${form._id}.csv`;
    const filepath = path.join(exportDir, filename);

    // CSV files are written from the worksheet, not the workbook
    await worksheet.csv.writeFile(filepath);

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


