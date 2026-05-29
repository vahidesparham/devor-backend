const prisma = require('../../prisma');

async function listPermissions(query) {
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;

  const where = {};
  if (query.q) {
    where.OR = [
      { key: { contains: query.q } },
      { description: { contains: query.q } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.permission.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ [query.sortBy]: query.sortDir }]
    }),
    prisma.permission.count({ where })
  ]);

  return {
    items,
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize)
    }
  };
}

module.exports = {
  listPermissions
};
