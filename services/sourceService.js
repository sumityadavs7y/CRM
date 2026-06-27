const { Op, fn, col, where } = require('sequelize');
const { Source, sequelize } = require('../models');
const { DEFAULT_SOURCES } = require('../constants/defaultSources');

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function caseInsensitiveNameMatch(fieldName, value) {
  return where(fn('lower', col(fieldName)), fn('lower', value.trim()));
}

async function findCompanySource(companyId, sourceId, options = {}) {
  return Source.findOne({
    where: { id: sourceId, companyId },
    ...options,
  });
}

async function sourceNameExists(companyId, name, excludeSourceId = null, transaction = null) {
  const whereClause = {
    companyId,
    [Op.and]: [caseInsensitiveNameMatch('name', name)],
  };

  if (excludeSourceId) {
    whereClause.id = { [Op.ne]: excludeSourceId };
  }

  const count = await Source.count({ where: whereClause, transaction });
  return count > 0;
}

async function generateUniqueSourceSlug(companyId, baseSlug, excludeId, transaction) {
  let slug = baseSlug;
  let suffix = 1;

  while (await Source.count({
    where: {
      companyId,
      slug,
      ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
    },
    transaction,
  })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function seedDefaultSources(companyId, transaction = null) {
  const run = async (tx) => {
    const existingCount = await Source.count({ where: { companyId }, transaction: tx });
    if (existingCount > 0) {
      return [];
    }

    const sources = [];

    for (let i = 0; i < DEFAULT_SOURCES.length; i += 1) {
      const config = DEFAULT_SOURCES[i];
      const source = await Source.create({
        companyId,
        name: config.name,
        slug: config.slug,
        sortOrder: i,
        isSystem: true,
        isActive: true,
      }, { transaction: tx });
      sources.push(source);
    }

    return sources;
  };

  if (transaction) {
    return run(transaction);
  }

  return sequelize.transaction(run);
}

async function listCompanySources(companyId, { activeOnly = false } = {}) {
  const whereClause = { companyId };
  if (activeOnly) {
    whereClause.isActive = true;
  }

  return Source.findAll({
    where: whereClause,
    order: [['sortOrder', 'ASC'], ['name', 'ASC']],
  });
}

function normalizeIdList(value) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function normalizeSyncItems(items) {
  if (!items) {
    return [];
  }

  if (!Array.isArray(items) && typeof items === 'object') {
    const names = items.name;
    if (names !== undefined) {
      const ids = items.id !== undefined
        ? (Array.isArray(items.id) ? items.id : [items.id])
        : [];
      const nameList = Array.isArray(names) ? names : [names];
      const length = Math.max(nameList.length, ids.length);

      return Array.from({ length }, (_, index) => ({
        id: ids[index] ? Number(ids[index]) : null,
        name: String(nameList[index] ?? '').trim(),
      })).filter((item) => item.name);
    }
  }

  const list = Array.isArray(items) ? items : [items];
  const merged = [];
  let pending = null;

  list.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const hasId = item.id !== undefined && item.id !== null && String(item.id).trim() !== '';
    const hasName = item.name !== undefined && item.name !== null && String(item.name).trim() !== '';

    if (hasId && !hasName) {
      if (pending) {
        merged.push(pending);
      }
      pending = {
        id: Number(item.id) || null,
        name: '',
      };
      return;
    }

    const entry = {
      id: hasId ? Number(item.id) || null : (pending?.id ?? null),
      name: hasName ? String(item.name).trim() : (pending?.name ?? ''),
    };

    if (pending && !hasId) {
      entry.id = pending.id;
      pending = null;
    }

    if (entry.name) {
      merged.push(entry);
    } else if (hasId) {
      pending = entry;
    }
  });

  if (pending?.name) {
    merged.push(pending);
  }

  return merged;
}

function validateUniqueNames(items, entityLabel) {
  const seen = new Set();

  items.forEach((item) => {
    if (!item.name) {
      throw new Error(`${entityLabel} name is required.`);
    }

    const key = item.name.toLowerCase();
    if (seen.has(key)) {
      throw new Error(`A ${entityLabel.toLowerCase()} with this name already exists.`);
    }

    seen.add(key);
  });
}

async function syncSources(companyId, { items, deletedIds }) {
  const normalizedItems = normalizeSyncItems(items);
  const normalizedDeletedIds = normalizeIdList(deletedIds);

  if (normalizedItems.length > 0) {
    validateUniqueNames(normalizedItems, 'Source');
  }

  return sequelize.transaction(async (transaction) => {
    if (normalizedDeletedIds.length > 0) {
      await Source.destroy({
        where: {
          id: normalizedDeletedIds,
          companyId,
        },
        transaction,
      });
    }

    for (let i = 0; i < normalizedItems.length; i += 1) {
      const item = normalizedItems[i];
      const baseSlug = slugify(item.name);

      if (!baseSlug) {
        throw new Error('Source name must contain at least one letter or number.');
      }

      if (item.id) {
        const source = await Source.findOne({
          where: { id: item.id, companyId },
          transaction,
        });

        if (!source) {
          throw new Error('Source not found.');
        }

        if (await sourceNameExists(companyId, item.name, source.id, transaction)) {
          throw new Error('A source with this name already exists.');
        }

        const slug = await generateUniqueSourceSlug(
          companyId,
          baseSlug,
          source.id,
          transaction,
        );

        source.name = item.name;
        source.slug = slug;
        source.sortOrder = i;
        await source.save({ transaction });
      } else {
        if (await sourceNameExists(companyId, item.name, null, transaction)) {
          throw new Error('A source with this name already exists.');
        }

        const slug = await generateUniqueSourceSlug(
          companyId,
          baseSlug,
          null,
          transaction,
        );

        await Source.create({
          companyId,
          name: item.name,
          slug,
          sortOrder: i,
          isSystem: false,
          isActive: true,
        }, { transaction });
      }
    }

    return listCompanySources(companyId);
  });
}

module.exports = {
  slugify,
  findCompanySource,
  seedDefaultSources,
  listCompanySources,
  syncSources,
};
