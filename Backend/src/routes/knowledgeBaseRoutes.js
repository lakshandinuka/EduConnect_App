const express = require('express');
const multer = require('multer');
const {
  getKnowledgeBaseHome,
  listKnowledgeBaseItems,
  listRecommendedItems,
  listTrendingItems,
  listFeaturedItems,
  getKnowledgeBaseItem,
  getRelatedKnowledgeBaseItems,
  submitKnowledgeBaseFeedback,
  listAdminKnowledgeBaseItems,
  createKnowledgeBaseItem,
  updateKnowledgeBaseItem,
  setKnowledgeBaseItemStatus,
  deleteKnowledgeBaseItem,
  uploadKnowledgeBasePdf,
  downloadKnowledgeBasePdf,
  getKnowledgeBasePdfFile,
  listCategories,
  getCategory,
  listCategoryItems,
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listPublishedFaqs,
  listAdminFaqs,
  createFaq,
  updateFaq,
  reorderFaqs,
  deleteFaq,
  sendChatMessage,
} = require('../controllers/knowledgeBaseController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(protect);

router.get('/', getKnowledgeBaseHome);

router.get('/items/recommended', listRecommendedItems);
router.get('/items/trending', listTrendingItems);
router.get('/items/featured', listFeaturedItems);
router.get('/items', listKnowledgeBaseItems);
router.get('/items/:id/download', downloadKnowledgeBasePdf);
router.get('/items/:id/related', getRelatedKnowledgeBaseItems);
router.post('/items/:id/feedback', submitKnowledgeBaseFeedback);
router.get('/items/:id', getKnowledgeBaseItem);

router.get('/files/:fileName', getKnowledgeBasePdfFile);

router.get('/categories', listCategories);
router.get('/categories/:id/items', listCategoryItems);
router.get('/categories/:id', getCategory);

router.get('/faqs', listPublishedFaqs);

router.post('/chat/message', authorize('student'), sendChatMessage);

router.get('/admin/items', authorize('admin'), listAdminKnowledgeBaseItems);
router.post('/admin/upload-pdf', authorize('admin'), upload.single('file'), uploadKnowledgeBasePdf);
router.post('/admin/items', authorize('admin'), createKnowledgeBaseItem);
router.put('/admin/items/:id', authorize('admin'), updateKnowledgeBaseItem);
router.patch('/admin/items/:id/archive', authorize('admin'), setKnowledgeBaseItemStatus('ARCHIVED'));
router.patch('/admin/items/:id/unarchive', authorize('admin'), setKnowledgeBaseItemStatus('PUBLISHED'));
router.patch('/admin/items/:id/publish', authorize('admin'), setKnowledgeBaseItemStatus('PUBLISHED'));
router.patch('/admin/items/:id/unpublish', authorize('admin'), setKnowledgeBaseItemStatus('DRAFT'));
router.delete('/admin/items/:id', authorize('admin'), deleteKnowledgeBaseItem);

router.get('/admin/categories', authorize('admin'), listAdminCategories);
router.post('/admin/categories', authorize('admin'), createCategory);
router.put('/admin/categories/:id', authorize('admin'), updateCategory);
router.delete('/admin/categories/:id', authorize('admin'), deleteCategory);

router.get('/admin/faqs', authorize('admin'), listAdminFaqs);
router.post('/admin/faqs', authorize('admin'), createFaq);
router.put('/admin/faqs/:id', authorize('admin'), updateFaq);
router.post('/admin/faqs/reorder', authorize('admin'), reorderFaqs);
router.delete('/admin/faqs/:id', authorize('admin'), deleteFaq);

module.exports = router;
