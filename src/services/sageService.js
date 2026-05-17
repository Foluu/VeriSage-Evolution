const { sagePoolPromise, sql } = require('../config/database');

// We duplicate the ACCOUNT_MAP from batchGenerator to know which fields to process.
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

const getDateFromMonth = (monthName, year = new Date().getFullYear()) => {
  const monthMap = {
    'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3, 'APRIL': 4,
    'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8,
    'SEPTEMBER': 9, 'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12
  };
  const month = monthMap[monthName.toUpperCase()];
  return new Date(year, month - 1, 25);
};

const extractFormLines = (form) => {
  const txDate = getDateFromMonth(form.month);
  const reference = form.branch.toUpperCase();
  const lines = [];
  let totalCredit = 0;
  let totalDebit = 0;

  for (const [field, value] of Object.entries(form.toObject ? form.toObject() : form)) {
    if (typeof value !== 'number' || value === 0 || !ACCOUNT_MAP[field]) {
      continue;
    }
    const mapping = ACCOUNT_MAP[field];
    lines.push({
      date: txDate,
      description: mapping.description,
      reference: reference,
      amount: value,
      account: mapping.account,
      isDebit: mapping.isDebit === 'Y'
    });
    if (mapping.isDebit === 'N') {
      totalCredit += value;
    } else {
      totalDebit += value;
    }
  }

  const pettyCashAmount = totalCredit - totalDebit;
  if (pettyCashAmount !== 0) {
    const pettyCashDate = new Date(txDate);
    lines.push({
      date: pettyCashDate,
      description: 'PETTY CASH',
      reference: reference,
      amount: Math.abs(pettyCashAmount),
      account: '1300',
      isDebit: pettyCashAmount > 0
    });
  }

  return lines;
};

async function postJournalsToSage(forms) {
  const pool = await sagePoolPromise;
  if (!pool) {
    throw new Error('SAGE database connection is not configured or unavailable.');
  }

  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();

    // Grouping all forms into a single journal batch
    // Create the Journal Batch Header
    const batchReq = new sql.Request(transaction);
    const batchName = `Batch_${Date.now()}`;
    batchReq.input('cBatchName', sql.VarChar, batchName);
    batchReq.input('cDescription', sql.VarChar, 'Auto-synced forms');

    // Note: The specific table names _btblJnlBatches and _btblJnlLines are illustrative 
    // based on typical Sage Evolution schemas for Journal batches.
    const batchResult = await batchReq.query(`
      DECLARE @Ins TABLE (idJnlBatch INT);
      INSERT INTO _btblJnlBatches (cBatchName, cDescription)
      OUTPUT INSERTED.idJnlBatch INTO @Ins
      VALUES (@cBatchName, @cDescription);
      SELECT idJnlBatch FROM @Ins;
    `);

    const batchId = batchResult.recordset[0].idJnlBatch;

    // Process all lines for all forms
    for (const form of forms) {
      const lines = extractFormLines(form);
      
      for (const line of lines) {
        const lineReq = new sql.Request(transaction);
        lineReq.input('iBatchID', sql.Int, batchId);
        lineReq.input('dTxDate', sql.DateTime, line.date);
        lineReq.input('cDescription', sql.VarChar, line.description);
        lineReq.input('cReference', sql.VarChar, line.reference);
        lineReq.input('fAmount', sql.Decimal(18, 2), line.amount);
        lineReq.input('cAccount', sql.VarChar, line.account);
        lineReq.input('bIsDebit', sql.Bit, line.isDebit ? 1 : 0);

        await lineReq.query(`
          INSERT INTO _btblJnlLines (iBatchID, dTxDate, cDescription, cReference, fAmount, cAccount, bIsDebit)
          VALUES (@iBatchID, @dTxDate, @cDescription, @cReference, @fAmount, @cAccount, @bIsDebit)
        `);
      }
    }

    await transaction.commit();
    return { sageBatchRef: String(batchId) };
  } catch (err) {
    await transaction.rollback();
    console.error('Sage posting failed, transaction rolled back:', err);
    throw err;
  }
}

module.exports = {
  postJournalsToSage
};
