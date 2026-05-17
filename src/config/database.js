const sql = require('mssql');

const sageDbConfig = {
  user:     process.env.SAGE_DB_USER,
  password: process.env.SAGE_DB_PASSWORD,
  server:   process.env.SAGE_DB_SERVER,
  database: process.env.SAGE_DB_DATABASE,
  port:     parseInt(process.env.SAGE_DB_PORT || '1433'),
  options: {
    encrypt:                false,   // SAGE on-prem does not use SSL
    enableArithAbort:       true,    // required by mssql for SQL Server 2017+
    trustServerCertificate: true,    // accept self-signed certs on LAN
    connectTimeout:         30000,   // ms before connection attempt fails
    requestTimeout:         30000,   // ms before a query times out
  },
  pool: {
    max:                  10,
    min:                  0,         // release all connections when idle
    idleTimeoutMillis:    30000,
    acquireTimeoutMillis: 30000,
  },
};

let sagePoolPromise = null;

if (process.env.SAGE_DB_SERVER) {
  sagePoolPromise = new sql.ConnectionPool(sageDbConfig)
    .connect()
    .then(pool  => { console.log('SAGE connected'); return pool; })
    .catch(err  => { console.error('SAGE failed:', err.message); return null; });
} else {
  console.warn('SAGE_DB_SERVER not set. Sage direct integration disabled.');
  // Mock pool that resolves to null
  sagePoolPromise = Promise.resolve(null);
}

module.exports = { sagePoolPromise, sql };
