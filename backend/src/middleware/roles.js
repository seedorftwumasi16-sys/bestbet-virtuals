export const STAFF_ROLES = ['admin', 'super_admin', 'manager'];
export const ADMIN_ROLES = ['admin', 'super_admin'];

export function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

export function isAdmin(role) {
  return ADMIN_ROLES.includes(role);
}

export function requireStaff(req, res, next) {
  if (!isStaff(req.user?.role)) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
}

export function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

export function requireAdminRole(req, res, next) {
  if (!isAdmin(req.user?.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
