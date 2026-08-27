const jwt = require('jsonwebtoken');
const { Admin } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization header required' });
    }
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'kp4-secret-key-2024';
    const decoded = jwt.verify(token, secret);
    const admin = await Admin.findByPk(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
