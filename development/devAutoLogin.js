const { User } = require('../models');
const { isDevEnvMode } = require('../utils/helpers');

let devAutoLoginNoticeLogged = false;

function setPlatformSession(req, user) {
  req.session.authType = 'platform';
  req.session.userId = user.id;
  req.session.userName = user.name;
  req.session.userEmail = user.email;
  req.session.userRole = user.role;
  req.session.isSuperAdmin = user.role === 'SUPER_ADMIN';
}

async function findSuperAdminUser() {
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  if (email) {
    const user = await User.findOne({
      where: { email: email.toLowerCase(), role: 'SUPER_ADMIN', isActive: true },
    });
    if (user) {
      return user;
    }
  }

  return User.findOne({
    where: { role: 'SUPER_ADMIN', isActive: true },
    order: [['id', 'ASC']],
  });
}

async function devAutoLogin(req, res, next) {
  if (!isDevEnvMode()) {
    return next();
  }

  if (req.session?.userId || req.session?.companyId) {
    return next();
  }

  try {
    const user = await findSuperAdminUser();
    if (!user) {
      return next();
    }

    setPlatformSession(req, user);

    if (!devAutoLoginNoticeLogged) {
      console.log(`🧪 Dev auto-login enabled: signed in as SUPER_ADMIN (${user.email})`);
      devAutoLoginNoticeLogged = true;
    }

    next();
  } catch (error) {
    console.error('Dev auto-login failed:', error);
    next();
  }
}

module.exports = {
  devAutoLogin,
};
