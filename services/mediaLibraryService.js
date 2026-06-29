const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const {
  MediaFolder,
  MediaFile,
  CompanySubscription,
  SubscriptionPlan,
  Sequelize,
} = require('../models');
const { isImageMimeType, formatBytes } = require('../constants/mediaLibrary');
const {
  createThumbnailForUpload,
  ensureThumbnailExists,
  deleteThumbnailIfExists,
  getAbsolutePath,
} = require('../utils/mediaThumbnails');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

function slugifyName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'folder';
}

async function uniqueFolderSlug(companyId, baseSlug, excludeFolderId = null) {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const where = { companyId, slug };
    if (excludeFolderId) {
      where.id = { [Sequelize.Op.ne]: excludeFolderId };
    }

    const existing = await MediaFolder.findOne({ where });
    if (!existing) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

function sanitizeOriginalName(name) {
  const base = path.basename(String(name || 'file'));
  return base.replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 255) || 'file';
}

function getExtension(filename, mimeType) {
  const ext = path.extname(filename).replace(/^\./, '').toLowerCase();
  if (ext) {
    return ext.slice(0, 20);
  }

  if (mimeType && mimeType.includes('/')) {
    const subtype = mimeType.split('/')[1] || '';
    if (subtype && subtype !== 'octet-stream') {
      return subtype.split('+')[0].slice(0, 20);
    }
  }

  return '';
}

function getSortOrder(sort) {
  switch (sort) {
    case 'date_asc':
      return [['createdAt', 'ASC']];
    case 'name_asc':
      return [['originalName', 'ASC']];
    case 'name_desc':
      return [['originalName', 'DESC']];
    case 'date_desc':
    default:
      return [['createdAt', 'DESC']];
  }
}

async function getCompanySubscription(companyId) {
  return CompanySubscription.findOne({
    where: { companyId },
    include: [{ model: SubscriptionPlan, as: 'plan' }],
  });
}

async function getUsedBytes(companyId) {
  const total = await MediaFile.sum('sizeBytes', { where: { companyId } });
  return Number(total) || 0;
}

async function getCompanyStorageStats(companyId) {
  const [usedBytes, fileCount, folderCount, subscription] = await Promise.all([
    getUsedBytes(companyId),
    MediaFile.count({ where: { companyId } }),
    MediaFolder.count({ where: { companyId } }),
    getCompanySubscription(companyId),
  ]);

  const limitMb = subscription?.plan?.maxStorageMb || 0;
  const limitBytes = limitMb * 1024 * 1024;
  const remainingBytes = Math.max(limitBytes - usedBytes, 0);

  return {
    usedBytes,
    limitBytes,
    remainingBytes,
    usedMb: usedBytes / (1024 * 1024),
    limitMb,
    remainingMb: remainingBytes / (1024 * 1024),
    fileCount,
    folderCount,
    usedFormatted: formatBytes(usedBytes),
    limitFormatted: formatBytes(limitBytes),
    remainingFormatted: formatBytes(remainingBytes),
  };
}

async function getFolderFileCounts(companyId) {
  const rows = await MediaFile.findAll({
    attributes: [
      'folderId',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'fileCount'],
    ],
    where: { companyId },
    group: ['folderId'],
    raw: true,
  });

  const counts = {};
  rows.forEach((row) => {
    const key = row.folderId === null ? 'root' : String(row.folderId);
    counts[key] = Number(row.fileCount) || 0;
  });

  return counts;
}

function serializeFile(file) {
  const isImage = isImageMimeType(file.mimeType);
  return {
    id: file.id,
    companyId: file.companyId,
    folderId: file.folderId,
    originalName: file.originalName,
    mimeType: file.mimeType,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    sizeFormatted: formatBytes(file.sizeBytes),
    isImage,
    url: `/company/media/files/${file.id}/serve`,
    previewUrl: isImage ? `/company/media/files/${file.id}/thumb` : null,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

function serializeFolder(folder, fileCounts = {}) {
  const key = String(folder.id);
  return {
    id: folder.id,
    name: folder.name,
    slug: folder.slug,
    fileCount: fileCounts[key] || 0,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

async function listFolders(companyId) {
  const [folders, fileCounts] = await Promise.all([
    MediaFolder.findAll({
      where: { companyId },
      order: [['name', 'ASC']],
    }),
    getFolderFileCounts(companyId),
  ]);

  return folders.map((folder) => serializeFolder(folder, fileCounts));
}

async function findFolder(companyId, folderId) {
  return MediaFolder.findOne({
    where: { id: folderId, companyId },
  });
}

async function listFiles(companyId, filters = {}) {
  const where = { companyId };

  if (filters.folderId) {
    where.folderId = filters.folderId;
  }

  if (filters.search) {
    where.originalName = {
      [Sequelize.Op.iLike]: `%${filters.search}%`,
    };
  }

  if (filters.imagesOnly) {
    where.mimeType = {
      [Sequelize.Op.like]: 'image/%',
    };
  }

  const files = await MediaFile.findAll({
    where,
    order: getSortOrder(filters.sort),
  });

  return files.map(serializeFile);
}

async function browseMedia(companyId, filters = {}) {
  const [folders, files, storage, fileCounts] = await Promise.all([
    listFolders(companyId),
    listFiles(companyId, filters),
    getCompanyStorageStats(companyId),
    getFolderFileCounts(companyId),
  ]);

  const imageCount = files.filter((file) => file.isImage).length;
  const viewSizeBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);

  return {
    folders,
    files,
    storage,
    fileCounts,
    rootFileCount: fileCounts.root || 0,
    viewStats: {
      fileCount: files.length,
      imageCount,
      totalSizeBytes: viewSizeBytes,
      totalSizeFormatted: formatBytes(viewSizeBytes),
    },
    filters,
    canEdit: Boolean(filters.canEdit),
  };
}

async function createFolder(companyId, name) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('Folder name is required.');
  }

  const baseSlug = slugifyName(trimmedName);
  const slug = await uniqueFolderSlug(companyId, baseSlug);

  const folder = await MediaFolder.create({
    companyId,
    name: trimmedName,
    slug,
  });

  const fileCounts = await getFolderFileCounts(companyId);
  return serializeFolder(folder, fileCounts);
}

async function renameFolder(companyId, folderId, name) {
  const folder = await findFolder(companyId, folderId);
  if (!folder) {
    throw new Error('Folder not found.');
  }

  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('Folder name is required.');
  }

  const baseSlug = slugifyName(trimmedName);
  const slug = await uniqueFolderSlug(companyId, baseSlug, folderId);

  await folder.update({ name: trimmedName, slug });

  const fileCounts = await getFolderFileCounts(companyId);
  return serializeFolder(folder, fileCounts);
}

async function deleteFolder(companyId, folderId) {
  const folder = await findFolder(companyId, folderId);
  if (!folder) {
    throw new Error('Folder not found.');
  }

  const fileCount = await MediaFile.count({
    where: { companyId, folderId },
  });

  if (fileCount > 0) {
    throw new Error('Folder must be empty before it can be deleted.');
  }

  await folder.destroy();
  return { success: true };
}

function buildStorageDir(companyId, folderSlug) {
  return path.join(UPLOADS_ROOT, 'companies', String(companyId), folderSlug || '_root');
}

async function ensureStorageDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function uploadFiles(companyId, folderId, files, uploadedById) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('No files were provided.');
  }

  let folder = null;
  if (folderId) {
    folder = await findFolder(companyId, folderId);
    if (!folder) {
      throw new Error('Folder not found.');
    }
  }

  const subscription = await getCompanySubscription(companyId);
  const limitMb = subscription?.plan?.maxStorageMb || 0;
  const limitBytes = limitMb * 1024 * 1024;
  const usedBytes = await getUsedBytes(companyId);
  const incomingBytes = files.reduce((sum, file) => sum + (file.size || 0), 0);
  const remainingBytes = limitBytes - usedBytes;

  if (incomingBytes > remainingBytes) {
    throw new Error(
      `Storage quota exceeded. Used ${formatBytes(usedBytes)} of ${formatBytes(limitBytes)}. `
      + `This upload needs ${formatBytes(incomingBytes)} but only ${formatBytes(Math.max(remainingBytes, 0))} remains.`
    );
  }

  const storageDir = buildStorageDir(companyId, folder?.slug);
  await ensureStorageDir(storageDir);

  const created = [];

  try {
    for (const file of files) {
      const originalName = sanitizeOriginalName(file.originalname);
      const extension = getExtension(originalName, file.mimetype);
      const storedName = `${crypto.randomUUID()}${extension ? `.${extension}` : ''}`;
      const absolutePath = path.join(storageDir, storedName);
      const relativePath = path.relative(path.join(__dirname, '..'), absolutePath);

      await fs.writeFile(absolutePath, file.buffer);

      if (isImageMimeType(file.mimetype)) {
        await createThumbnailForUpload(file, absolutePath, relativePath.split(path.sep).join('/'));
      }

      const record = await MediaFile.create({
        companyId,
        folderId: folder ? folder.id : null,
        originalName,
        storedName,
        mimeType: file.mimetype || 'application/octet-stream',
        extension,
        sizeBytes: file.size || 0,
        storagePath: relativePath.split(path.sep).join('/'),
        uploadedById,
      });

      created.push(serializeFile(record));
    }
  } catch (error) {
    await Promise.all(created.map(async (file) => {
      try {
        const record = await MediaFile.findByPk(file.id);
        if (record) {
          const absolutePath = path.join(__dirname, '..', record.storagePath);
          await fs.unlink(absolutePath).catch(() => {});
          await deleteThumbnailIfExists(record.storagePath);
          await record.destroy();
        }
      } catch {
        // best effort cleanup
      }
    }));
    throw error;
  }

  return created;
}

async function deleteFile(companyId, fileId) {
  const file = await MediaFile.findOne({
    where: { id: fileId, companyId },
  });

  if (!file) {
    throw new Error('File not found.');
  }

  const absolutePath = path.join(__dirname, '..', file.storagePath);
  await fs.unlink(absolutePath).catch(() => {});
  await deleteThumbnailIfExists(file.storagePath);
  await file.destroy();

  return { success: true };
}

async function getFileForServe(companyId, fileId) {
  return MediaFile.findOne({
    where: { id: fileId, companyId },
  });
}

async function getFileThumbnail(companyId, fileId) {
  const file = await getFileForServe(companyId, fileId);
  if (!file || !isImageMimeType(file.mimeType)) {
    return null;
  }

  const projectRoot = path.join(__dirname, '..');
  const thumbRelativePath = await ensureThumbnailExists(file, projectRoot);
  if (!thumbRelativePath) {
    return null;
  }

  return {
    file,
    absolutePath: getAbsolutePath(projectRoot, thumbRelativePath),
  };
}

function getAbsoluteFilePath(file) {
  return path.join(__dirname, '..', file.storagePath);
}

module.exports = {
  UPLOADS_ROOT,
  listFolders,
  listFiles,
  browseMedia,
  createFolder,
  renameFolder,
  deleteFolder,
  uploadFiles,
  deleteFile,
  getFileForServe,
  getFileThumbnail,
  getAbsoluteFilePath,
  getCompanyStorageStats,
  serializeFile,
  formatBytes,
};
