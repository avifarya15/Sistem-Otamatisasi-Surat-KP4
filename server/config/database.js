const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let sequelize;

// 1. Koneksi via URL (Cloud PostgreSQL: Supabase, Neon.tech, Railway, Render, dll.)
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: process.env.DB_SSL === 'false' ? {} : {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  });
}
// 2. Koneksi via parameter terpisah (Localhost PostgreSQL / pgAdmin)
else if (process.env.DB_DIALECT === 'postgres' || process.env.DB_CLIENT === 'postgres') {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'kp4_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      dialect: 'postgres',
      dialectOptions: process.env.DB_SSL === 'true' ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      } : {},
      logging: process.env.NODE_ENV === 'development' ? console.log : false
    }
  );
}
// 3. Default fallback ke SQLite (kp4.sqlite) jika belum mengatur environment PostgreSQL
else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'kp4.sqlite'),
    logging: false
  });
}

module.exports = sequelize;
