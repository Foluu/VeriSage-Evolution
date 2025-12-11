
/**
 * Seed script to populate branch data
 * Run: node scripts/seed-branches.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const branches = [
  "1004", "72 ROAD FESTAC TOWN", "ABAKALIKI", "ABAKPA/ NEW HAVEN", "ABARRA OBODO",
  "ABEOKUTA", "ABORU", "ABRAKA", "ADAMO", "ADARANIJO G12", "ADIGBE", "ADO EKITI",
  "AGBANI", "AGBEDE", "AGBOOLA", "AGBOR", "AGBOYI", "AGUDA", "AIRPORT ROAD PH",
  "AIT ALAGBADO", "AJAH", "AJANGBADI", "AJAO ESTATE", "AJEGUNLE", "AKOKA",
  "AKOKA 3", "AKOKA ZONE 1", "AKOKA ZONE 2", "AKURE MAIN.", "AKUTE", "ALABA",
  "ALAPERE", "ALAPERE ZONE", "ALPHA BEACH", "AMUWO ODOFIN", "ANFANI", "ANTHONY",
  "APAPA", "APAPA 2", "AREA 5", "ASABA", "AWKA", "AWODIORA", "AYOBO", "BADAGRY",
  "BARANGONI", "BARIGA", "BARIGA 2", "BARIGA ZONE 1", "BARUWA-LAGOS", "BASSA",
  "BENIN", "BERGER /UTAKO", "BOGIGE", "BONNY ISLAND", "BUCKNOR", "BWARI ABUJA",
  "CALABAR", "CHALLENGE", "COCONUT", "COMMAND", "DAPE", "DOPEMU", "EBUTE META",
  "EBUTE METTA", "EDE", "EGAN", "EGBEDA", "EJIGBO", "EKET", "EKORE-OWORO",
  "ELEWERAN", "EPE", "EPE 2", "EVWRENI", "FADEYI", "FELELE", "FESTAC",
  "FOLA AGORO", "GBABA", "GBAGADA", "GBAGADA 1", "GBAGADA 3", "GBONGAN",
  "GWAGWALADA ABUJA", "IBA 3- GLORY HOUSE", "IBA CENTRAL", "IBA NEW TOWN",
  "IBUSA", "IDDAH", "IDIARABA", "IDIMU", "IDIROKO", "IDUMUJIE UGBOKO",
  "IFA ATTAI UYO", "IFAKO", "IGANDO", "IHEORJI", "IHIAGWA", "IHIE NDUME",
  "IJANIKIN", "IJEBU IGBO", "IJEBU ODE", "IJEDE RD", "IJESHA EXPRESS", "IJU",
  "IKEJA", "IKORODU", "IKOTA", "IKOTUN", "IKWERRE RD. P/H", "ILARO",
  "ILESHA-OWO EXPRESS", "ILORIN", "ILUPEJU", "IPAJA", "IPOYEWA", "ISASHI",
  "ISAWO IKORODU", "ISHASHI RD.", "ISHEFUN", "ISHERI", "ISOLO", "ISUTI RD- EGAN",
  "ITA ELEGA", "ITA OSHIN", "IWAYA", "JALINGO", "JIKWOYI - ABUJA", "JOS"
];

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String },
  active: { type: Boolean, default: true }
});

const Branch = mongoose.model('Branch', branchSchema);

async function seedBranches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing branches
    await Branch.deleteMany({});
    console.log('Cleared existing branches');
    
    // Insert branches
    const branchDocs = branches.map(name => ({
      name,
      code: name.replace(/[^A-Z0-9]/g, '').substring(0, 10),
      active: true
    }));
    
    await Branch.insertMany(branchDocs);
    console.log(`✅ Successfully seeded ${branches.length} branches`);
    
    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error seeding branches:', error);
    process.exit(1);
  }
}

seedBranches();