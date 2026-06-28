const DUMMY_PASSWORD = 'Password@123';

const DUMMY_ACCOUNTS = {
  companyAdminEmail: process.env.DEV_COMPANY_ADMIN_EMAIL || 'admin@acme.example.com',
  companyMemberEmail: process.env.DEV_COMPANY_MEMBER_EMAIL || 'employee@acme.example.com',
  globexAdminEmail: process.env.DEV_GLOBEX_ADMIN_EMAIL || 'admin@globex.example.com',
  globexMemberEmail: process.env.DEV_GLOBEX_MEMBER_EMAIL || 'employee@globex.example.com',
  password: DUMMY_PASSWORD,
};

module.exports = {
  DUMMY_PASSWORD,
  DUMMY_ACCOUNTS,
};
