const sequelize = require('../config/database');
const Pegawai = require('./Pegawai');
const Pasangan = require('./Pasangan');
const Anak = require('./Anak');
const Admin = require('./Admin');
const LogAktivitas = require('./LogAktivitas');

Pegawai.hasMany(Pasangan, { foreignKey: 'nip', sourceKey: 'nip', as: 'pasangan', onDelete: 'CASCADE' });
Pegawai.hasMany(Anak, { foreignKey: 'nip', sourceKey: 'nip', as: 'anak', onDelete: 'CASCADE' });
Pasangan.belongsTo(Pegawai, { foreignKey: 'nip', targetKey: 'nip', as: 'pegawai' });
Anak.belongsTo(Pegawai, { foreignKey: 'nip', targetKey: 'nip', as: 'pegawai' });
Admin.hasMany(LogAktivitas, { foreignKey: 'admin_id', as: 'logs' });
LogAktivitas.belongsTo(Admin, { foreignKey: 'admin_id', as: 'admin' });

module.exports = {
  sequelize,
  Pegawai,
  Pasangan,
  Anak,
  Admin,
  LogAktivitas
};
