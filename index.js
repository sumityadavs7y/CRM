require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();
const { envConfig } = require('./config');
const { testConnection, User } = require('./models');
const { runMigrations } = require('./utils/migrate');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: envConfig.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Development only (uncomment ONE block to enable):
// const { devAutoLogin } = require('./development/devAutoLogin');
// app.use(devAutoLogin);
const { devAutoLoginCompanyAdmin } = require('./development/devAutoLoginCompanyAdmin');
app.use(devAutoLoginCompanyAdmin);
// const { devAutoLoginCompanyMember } = require('./development/devAutoLoginCompanyMember');
// app.use(devAutoLoginCompanyMember);
// const { devAutoLoginGlobexAdmin } = require('./development/devAutoLoginGlobexAdmin');
// app.use(devAutoLoginGlobexAdmin);
// const { devAutoLoginGlobexMember } = require('./development/devAutoLoginGlobexMember');
// app.use(devAutoLoginGlobexMember);

const { refreshCompanyAccess } = require('./middleware/refreshCompanyAccess');
app.use(refreshCompanyAccess);

const { DEFAULT_THEME_ID } = require('./utils/themes');

app.set('view engine', 'ejs');
app.set('views', 'views');
app.locals.assetBase = `/style/Admin/dist/${DEFAULT_THEME_ID}`;

// Routes
const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/index');
const companyRoutes = require('./routes/companies');
const subscriptionPlanRoutes = require('./routes/subscriptionPlans');
const companyUserRoutes = require('./routes/companyUsers');
const companyRoleRoutes = require('./routes/companyRoles');
const accessDemoRoutes = require('./routes/accessDemo');
const companyCrmSetupRoutes = require('./routes/companyCrmSetup');
const companyProjectsRoutes = require('./routes/companyProjects');
const companyMediaRoutes = require('./routes/companyMedia');
const profileRoutes = require('./routes/profile');

app.use('/auth', authRoutes);
app.use('/companies', companyRoutes);
app.use('/subscription-plans', subscriptionPlanRoutes);
app.use('/company/users', companyUserRoutes);
app.use('/company/roles', companyRoleRoutes);
app.use('/company/crm-setup', companyCrmSetupRoutes);
app.use('/company/projects', companyProjectsRoutes);
app.use('/company/projects', require('./routes/companyProjectBudget'));
app.use('/company/media', companyMediaRoutes);
app.use('/profile', profileRoutes);
app.use('/access-demo', accessDemoRoutes);
app.use('/', indexRoutes);

const ensureDefaultSuperAdmin = async () => {
    const email = process.env.DEFAULT_ADMIN_EMAIL || 'superadmin@example.com';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'SuperAdmin@123';

    console.log('🔐 Checking for default SUPER_ADMIN...');
    const userCount = await User.count();
    if (userCount > 0) {
        console.log(`ℹ️ Existing users found (${userCount}); skipping default SUPER_ADMIN creation.`);
        return;
    }

    console.log(`ℹ️ No users found. Creating default SUPER_ADMIN with email: ${email}`);
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
        name: 'Platform Owner',
        email,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
    });
    console.log(`✅ Default SUPER_ADMIN created: ${email}`);
};

const startServer = async () => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🚀 Starting Server...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        await testConnection();
        await runMigrations();
        await ensureDefaultSuperAdmin();
        // Uncomment to seed dummy data
        await require('./development/seedDummyData').seedDummyData();

        app.listen(envConfig.port, () => {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`✅ Server is running on port ${envConfig.port}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
