/**
 * Authentication Middleware
 * Password-based auth for admin dashboard
 */

export const verifyAdminPassword = (req, res, next) => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const providedPassword = req.headers['x-admin-password'] || req.body?.password || null;

  if (!providedPassword || providedPassword !== adminPassword) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  next();
};

export default verifyAdminPassword;
