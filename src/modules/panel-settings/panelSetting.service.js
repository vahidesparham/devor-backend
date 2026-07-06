const prisma = require('../../prisma');
const { audit } = require('../../shared/audit/audit');

const SINGLETON_ID = 1;
const DEFAULT_SETTINGS = {
  id: SINGLETON_ID,
  panelTitle: 'Devor',
  panelLogo: null,
  panelFavicon: null,
};

function normalize(item) {
  return {
    id: item.id,
    panelTitle: item.panelTitle,
    panelLogo: item.panelLogo,
    panelFavicon: item.panelFavicon,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function ensurePanelSettings() {
  const item = await prisma.panelSetting.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: DEFAULT_SETTINGS,
  });
  return normalize(item);
}

async function getPanelSettings() {
  return ensurePanelSettings();
}

async function updatePanelSettings(data, req) {
  const existing = await ensurePanelSettings();
  const updated = await prisma.panelSetting.update({
    where: { id: SINGLETON_ID },
    data: {
      ...(data.panelTitle !== undefined ? { panelTitle: data.panelTitle } : {}),
      ...(data.panelLogo !== undefined ? { panelLogo: data.panelLogo || null } : {}),
      ...(data.panelFavicon !== undefined ? { panelFavicon: data.panelFavicon || null } : {}),
    },
  });

  await audit(req, {
    action: 'UPDATE',
    entity: 'PanelSetting',
    entityId: String(SINGLETON_ID),
    before: existing,
    after: normalize(updated),
  });

  return normalize(updated);
}

module.exports = {
  getPanelSettings,
  updatePanelSettings,
};
