const { Roles } = require('../utils/constants');

// Check global system role (admin) or project-level role
function requireSystemRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ success: false, message: 'Forbidden' });
  };
}

module.exports = { requireSystemRole, Roles };