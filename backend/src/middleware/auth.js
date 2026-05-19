const jwt = require('jsonwebtoken');
const { User } = require('../models');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}

async function checkActiveAccount(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.is_active) {
      return res.status(403).json({ error: 'Account is not active. Please wait for admin activation.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
}

module.exports = { authenticate, authorize, checkActiveAccount };
