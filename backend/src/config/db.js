const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  paginate: async (baseSql, countSql, params, { page = 1, limit = 20 } = {}) => {
    const offset = (page - 1) * limit;
    const countResult = await pool.query(countSql, params);
    const total = parseInt(countResult.rows[0].count);
    let dataResult;
    if (limit === -1) {
      dataResult = await pool.query(baseSql, params);
    } else {
      dataResult = await pool.query(`${baseSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
    }
    return { data: dataResult.rows, total, page, limit: limit === -1 ? total : limit };
  }
};
