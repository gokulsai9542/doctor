const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  next();
};

const providerOrAdmin = (req, res, next) => {
  if (!['admin', 'provider'].includes(req.user.role))
    return res.status(403).json({ message: 'Provider or Admin only' });
  next();
};

const doctorOnly = (req, res, next) => {
  if (req.user.role !== 'doctor') return res.status(403).json({ message: 'Doctors only' });
  next();
};

module.exports = { auth, adminOnly, providerOrAdmin, doctorOnly };
