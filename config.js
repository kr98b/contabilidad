const dotenv = require('dotenv');
dotenv.config();
module.exports = {
  port: process.env.PORT,
  dbhost: process.env.DB_HOST,
  dbuser: process.env.DB_USER,
  dbpass: process.env.DB_PASS,
  dbport: process.env.DB_PORT,
  dbname: process.env.DB_BASE
};