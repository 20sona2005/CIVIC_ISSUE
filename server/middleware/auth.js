const jwt = require('jsonwebtoken');

// Verifies JWT; attaches decoded payload to req.user
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token is not valid' });
  }
}

// Must be used after verifyToken; rejects non-admin users
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: admins only' });
  }
  next();
}

module.exports = { verifyToken, requireAdmin };
