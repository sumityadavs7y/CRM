function getPrimaryAdmin(credentials) {
  if (!credentials || credentials.length === 0) {
    return null;
  }

  const admins = credentials
    .filter((credential) => {
      if (credential.companyRole) {
        return credential.companyRole.isSystem && credential.companyRole.slug === 'administrator';
      }
      return credential.role === 'ADMIN';
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return admins[0] || credentials[0];
}

function countActiveAdmins(credentials) {
  return credentials.filter((credential) => {
    if (credential.companyRole) {
      return credential.companyRole.isSystem
        && credential.companyRole.slug === 'administrator'
        && credential.isActive;
    }
    return credential.role === 'ADMIN' && credential.isActive;
  }).length;
}

module.exports = {
  getPrimaryAdmin,
  countActiveAdmins,
};
