const prisma = require('../../prisma');

function monthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

async function buildSignupChart() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const end = addMonths(new Date(now.getFullYear(), now.getMonth(), 1), 1);
  const months = Array.from({ length: 7 }, (_, index) => addMonths(start, index));
  const counts = new Map(months.map((date) => [monthKey(date), 0]));

  const users = await prisma.appUser.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { createdAt: true },
  });

  for (const user of users) {
    const key = monthKey(user.createdAt);
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }

  return months.map((date) => ({
    key: monthKey(date),
    date: `${monthKey(date)}-01T12:00:00.000Z`,
    users: counts.get(monthKey(date)) || 0,
  }));
}

function calculateReadinessScore(totalBusinesses, quality) {
  if (!totalBusinesses) return 0;
  const totalChecks = totalBusinesses * 4;
  const missingChecks =
    quality.missingLogo +
    quality.missingSlideshow +
    quality.missingWorkingHours +
    quality.missingContact;
  const score = Math.round(((totalChecks - missingChecks) / totalChecks) * 100);
  return Math.max(0, Math.min(100, score));
}

async function getAdminDashboard() {
  const [
    totalBusinesses,
    pendingReviews,
    businessUsers,
    offerings,
    missingLogo,
    missingSlideshow,
    missingWorkingHours,
    missingContact,
    signupChart,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { publicationStatus: 'PENDING_REVIEW' } }),
    prisma.businessUser.count({ where: { isActive: true } }),
    prisma.businessOffering.count({ where: { isActive: true } }),
    prisma.business.count({ where: { OR: [{ logoImage: null }, { logoImage: '' }] } }),
    prisma.business.count({ where: { slideshows: { none: {} } } }),
    prisma.business.count({ where: { workingHours: { none: {} } } }),
    prisma.business.count({
      where: {
        contactLinks: {
          none: {
            isActive: true,
            OR: [
              { value: { not: null } },
              { url: { not: null } },
            ],
          },
        },
      },
    }),
    buildSignupChart(),
  ]);

  const quality = {
    missingLogo,
    missingSlideshow,
    missingWorkingHours,
    missingContact,
  };

  return {
    readinessScore: calculateReadinessScore(totalBusinesses, quality),
    stats: {
      totalBusinesses,
      pendingReviews,
      businessUsers,
      offerings,
    },
    quality,
    signupChart,
  };
}

module.exports = {
  getAdminDashboard,
};
