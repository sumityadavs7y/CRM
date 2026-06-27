const ADMIN_CAPABILITIES = [];

const AVAILABLE_CAPABILITIES = [];

function getAvailableCapabilities() {
  return AVAILABLE_CAPABILITIES;
}

function hasCapability(capabilities, capabilityKey) {
  return Array.isArray(capabilities) && capabilities.includes(capabilityKey);
}

function parseSelectedCapabilities(body) {
  const selected = body?.capabilities;
  if (!selected) {
    return [];
  }

  const selectedList = Array.isArray(selected) ? selected : [selected];
  const validKeys = new Set(AVAILABLE_CAPABILITIES.map((capability) => capability.key));

  return selectedList.filter((key) => validKeys.has(key));
}

module.exports = {
  ADMIN_CAPABILITIES,
  AVAILABLE_CAPABILITIES,
  getAvailableCapabilities,
  hasCapability,
  parseSelectedCapabilities,
};
