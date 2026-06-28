const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const fs = require('fs/promises');
const { CompanyCredential, User, Sequelize } = require('../models');
const { isCompanyAuthenticated } = require('../middleware/auth');
const { withTheme } = require('../utils/themes');
const { buildUserContext, applyProfileToSession } = require('../utils/sessionUser');
const {
  saveAvatar,
  deleteAvatar,
  getAvatarAbsolutePath,
} = require('../services/avatarService');
const {
  isAllowedAvatarMimeType,
  MAX_UPLOAD_BYTES,
} = require('../utils/avatarImages');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (isAllowedAvatarMimeType(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image files are allowed.'));
  },
});

async function findOwnCredential(req) {
  return CompanyCredential.findOne({
    where: {
      id: req.session.credentialId,
      companyId: req.session.companyId,
    },
  });
}

async function emailInUse(email, excludeCredentialId = null) {
  const normalizedEmail = email.toLowerCase();
  const credentialWhere = { email: normalizedEmail };
  if (excludeCredentialId) {
    credentialWhere.id = { [Sequelize.Op.ne]: excludeCredentialId };
  }

  const existingCredential = await CompanyCredential.findOne({ where: credentialWhere });
  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  return !!(existingCredential || existingUser);
}

function profileFormValues(credential) {
  return {
    adminName: credential.adminName,
    email: credential.email,
  };
}

function renderProfile(req, res, { error = null, values = {}, success = null } = {}) {
  return res.render('profile/index', withTheme(req, {
    user: buildUserContext(req),
    error,
    success,
    values,
    activeNav: 'profile',
  }));
}

router.get('/', isCompanyAuthenticated, async (req, res) => {
  const credential = await findOwnCredential(req);
  if (!credential) {
    return res.redirect('/dashboard');
  }

  return renderProfile(req, res, {
    success: req.query.success || null,
    values: profileFormValues(credential),
  });
});

router.post('/', isCompanyAuthenticated, async (req, res) => {
  const credential = await findOwnCredential(req);
  if (!credential) {
    return res.redirect('/dashboard');
  }

  const { adminName, email } = req.body;
  const values = {
    adminName: adminName || '',
    email: email || '',
  };

  if (!adminName || !adminName.trim()) {
    return renderProfile(req, res, { error: 'Name is required.', values });
  }

  if (!email || !email.trim()) {
    return renderProfile(req, res, { error: 'Email is required.', values });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return renderProfile(req, res, { error: 'Please enter a valid email address.', values });
  }

  if (await emailInUse(normalizedEmail, credential.id)) {
    return renderProfile(req, res, { error: 'That email is already in use.', values });
  }

  try {
    await credential.update({
      adminName: adminName.trim(),
      email: normalizedEmail,
    });

    await credential.reload();
    applyProfileToSession(req, credential);

    return res.redirect('/profile?success=Profile updated successfully.');
  } catch (error) {
    console.error('Profile update error:', error);
    return renderProfile(req, res, { error: 'Unable to update profile. Please try again.', values });
  }
});

router.post('/password', isCompanyAuthenticated, async (req, res) => {
  const credential = await findOwnCredential(req);
  if (!credential) {
    return res.redirect('/dashboard');
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;
  const values = profileFormValues(credential);

  if (!currentPassword || !newPassword || !confirmPassword) {
    return renderProfile(req, res, { error: 'All password fields are required.', values });
  }

  if (newPassword !== confirmPassword) {
    return renderProfile(req, res, { error: 'New passwords do not match.', values });
  }

  if (newPassword.length < 8) {
    return renderProfile(req, res, { error: 'New password must be at least 8 characters.', values });
  }

  const passwordMatches = await bcrypt.compare(currentPassword, credential.password);
  if (!passwordMatches) {
    return renderProfile(req, res, { error: 'Current password is incorrect.', values });
  }

  try {
    await credential.update({
      password: await bcrypt.hash(newPassword, 10),
    });

    return res.redirect('/profile?success=Password changed successfully.');
  } catch (error) {
    console.error('Password change error:', error);
    return renderProfile(req, res, { error: 'Unable to change password. Please try again.', values });
  }
});

router.post('/avatar', isCompanyAuthenticated, upload.single('avatar'), async (req, res) => {
  const credential = await findOwnCredential(req);
  if (!credential) {
    return res.redirect('/dashboard');
  }

  const values = profileFormValues(credential);

  if (!req.file) {
    return renderProfile(req, res, { error: 'Please choose an image to upload.', values });
  }

  try {
    const avatarPath = await saveAvatar(
      req.session.companyId,
      credential.id,
      req.file.buffer
    );

    if (credential.avatarPath && credential.avatarPath !== avatarPath) {
      await deleteAvatar(credential.avatarPath);
    }

    await credential.update({ avatarPath });
    await credential.reload();
    applyProfileToSession(req, credential);

    return res.redirect('/profile?success=Avatar updated successfully.');
  } catch (error) {
    console.error('Avatar upload error:', error);
    return renderProfile(req, res, { error: 'Unable to upload avatar. Please try again.', values });
  }
});

router.delete('/avatar', isCompanyAuthenticated, async (req, res) => {
  const credential = await findOwnCredential(req);
  if (!credential) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    if (credential.avatarPath) {
      await deleteAvatar(credential.avatarPath);
    }

    await credential.update({ avatarPath: null });
    applyProfileToSession(req, credential);

    return res.json({ success: true });
  } catch (error) {
    console.error('Avatar remove error:', error);
    return res.status(500).json({ error: 'Unable to remove avatar.' });
  }
});

router.get('/avatar', isCompanyAuthenticated, async (req, res) => {
  const credential = await findOwnCredential(req);
  if (!credential?.avatarPath) {
    return res.status(404).end();
  }

  const absolutePath = getAvatarAbsolutePath(credential.avatarPath);
  if (!absolutePath) {
    return res.status(404).end();
  }

  try {
    await fs.access(absolutePath);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.sendFile(absolutePath);
  } catch {
    return res.status(404).end();
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error.message === 'Only image files are allowed.') {
    if (req.method === 'POST' && req.path === '/avatar') {
      return findOwnCredential(req).then((credential) => {
        const values = credential ? profileFormValues(credential) : {};

        const message = error.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be 5 MB or smaller.'
          : error.message;

        return renderProfile(req, res, { error: message, values });
      });
    }
  }

  return next(error);
});

module.exports = router;
