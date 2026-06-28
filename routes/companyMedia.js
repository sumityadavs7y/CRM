const express = require('express');
const multer = require('multer');
const path = require('path');
const { isCompanyAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/companyFeatures');
const { withTheme } = require('../utils/themes');
const { buildUserContext } = require('../utils/sessionUser');
const { parseBrowseFilters } = require('../utils/mediaLibraryFilters');
const { SORT_OPTIONS, DEFAULT_SORT, DEFAULT_VIEW } = require('../constants/mediaLibrary');
const {
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
} = require('../services/mediaLibraryService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

function canEditMedia(req) {
  const { roleHasPermission } = require('../utils/planFeatures');
  return roleHasPermission(req.session.permissions, 'media_library', 'edit');
}

function jsonError(res, status, message) {
  return res.status(status).json({ error: message });
}

router.get('/', isCompanyAuthenticated, requirePermission('media_library', 'view'), async (req, res) => {
  res.render('media/index', withTheme(req, {
    user: buildUserContext(req),
    activeNav: 'media-library',
    sortOptions: SORT_OPTIONS,
    defaultSort: DEFAULT_SORT,
    defaultView: DEFAULT_VIEW,
    canEdit: canEditMedia(req),
  }));
});

router.get('/api/browse', isCompanyAuthenticated, requirePermission('media_library', 'view'), async (req, res) => {
  try {
    const filters = parseBrowseFilters(req.query);
    const data = await browseMedia(req.session.companyId, {
      ...filters,
      canEdit: canEditMedia(req),
    });
    res.json(data);
  } catch (error) {
    console.error('Media browse failed:', error);
    jsonError(res, 500, 'Failed to load media library.');
  }
});

router.get('/api/storage', isCompanyAuthenticated, requirePermission('media_library', 'view'), async (req, res) => {
  try {
    const storage = await getCompanyStorageStats(req.session.companyId);
    res.json(storage);
  } catch (error) {
    console.error('Media storage stats failed:', error);
    jsonError(res, 500, 'Failed to load storage stats.');
  }
});

router.post('/folders', isCompanyAuthenticated, requirePermission('media_library', 'edit'), async (req, res) => {
  try {
    const folder = await createFolder(req.session.companyId, req.body.name);
    res.json({ folder });
  } catch (error) {
    jsonError(res, 400, error.message || 'Failed to create folder.');
  }
});

router.patch('/folders/:id', isCompanyAuthenticated, requirePermission('media_library', 'edit'), async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const folder = await renameFolder(req.session.companyId, folderId, req.body.name);
    res.json({ folder });
  } catch (error) {
    jsonError(res, 400, error.message || 'Failed to rename folder.');
  }
});

router.delete('/folders/:id', isCompanyAuthenticated, requirePermission('media_library', 'edit'), async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    await deleteFolder(req.session.companyId, folderId);
    res.json({ success: true });
  } catch (error) {
    jsonError(res, 400, error.message || 'Failed to delete folder.');
  }
});

router.post('/upload', isCompanyAuthenticated, requirePermission('media_library', 'edit'), upload.array('files'), async (req, res) => {
  try {
    const folderId = req.body.folderId ? parseInt(req.body.folderId, 10) : null;
    const created = await uploadFiles(
      req.session.companyId,
      folderId,
      req.files || [],
      req.session.credentialId
    );
    res.json({ files: created });
  } catch (error) {
    jsonError(res, 400, error.message || 'Failed to upload files.');
  }
});

router.delete('/files/:id', isCompanyAuthenticated, requirePermission('media_library', 'edit'), async (req, res) => {
  try {
    const fileId = parseInt(req.params.id, 10);
    await deleteFile(req.session.companyId, fileId);
    res.json({ success: true });
  } catch (error) {
    jsonError(res, 400, error.message || 'Failed to delete file.');
  }
});

router.get('/files/:id/thumb', isCompanyAuthenticated, requirePermission('media_library', 'view'), async (req, res) => {
  try {
    const fileId = parseInt(req.params.id, 10);
    const thumbnail = await getFileThumbnail(req.session.companyId, fileId);

    if (!thumbnail) {
      return res.status(404).send('Preview not available.');
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return res.sendFile(path.resolve(thumbnail.absolutePath));
  } catch (error) {
    console.error('Media thumbnail failed:', error);
    return res.status(500).send('Failed to serve preview.');
  }
});

router.get('/files/:id/serve', isCompanyAuthenticated, requirePermission('media_library', 'view'), async (req, res) => {
  try {
    const fileId = parseInt(req.params.id, 10);
    const file = await getFileForServe(req.session.companyId, fileId);

    if (!file) {
      return res.status(404).send('File not found.');
    }

    const absolutePath = getAbsoluteFilePath(file);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    return res.sendFile(path.resolve(absolutePath));
  } catch (error) {
    console.error('Media serve failed:', error);
    return res.status(500).send('Failed to serve file.');
  }
});

module.exports = router;
