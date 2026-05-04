const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const KnowledgeBaseCategory = require('../models/KnowledgeBaseCategory');
const KnowledgeBaseFAQ = require('../models/KnowledgeBaseFAQ');
const KnowledgeBaseItem = require('../models/KnowledgeBaseItem');

const FALLBACK_RESPONSE = "Sorry, I can't help you with that. Please refer the knowledgebase for more information.";
const CHAT_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'for', 'how', 'i', 'in', 'is', 'it',
  'me', 'my', 'of', 'on', 'or', 'please', 'the', 'that', 'to', 'what', 'where',
]);
const SOURCE_PATTERN = /\[(KB|FAQ)-([a-fA-F0-9]{24})\]/g;

const pdfUploadDir = path.join(__dirname, '../../uploads/kb-pdfs');

const idOf = (doc) => {
  if (!doc) return null;
  if (doc._id) return doc._id.toString();
  if (doc.id) return doc.id.toString();
  return null;
};

const plain = (doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc);

const mapCategory = (category, itemCount) => {
  const body = plain(category);
  if (!body) return null;
  const mapped = {
    _id: idOf(body),
    id: idOf(body),
    name: body.name,
    description: body.description || '',
    createdAt: body.createdAt,
    updatedAt: body.updatedAt,
  };
  if (typeof itemCount === 'number') {
    mapped.itemCount = itemCount;
  }
  return mapped;
};

const mapFaq = (faq) => {
  const body = plain(faq);
  if (!body) return null;
  return {
    _id: idOf(body),
    id: idOf(body),
    question: body.question,
    answer: body.answer,
    category: body.category || 'General',
    status: body.status || 'PUBLISHED',
    sortOrder: body.sortOrder || 0,
    sort_order: body.sortOrder || 0,
    createdAt: body.createdAt,
    updatedAt: body.updatedAt,
  };
};

const mapItem = (item, includeDetail = false) => {
  const body = plain(item);
  if (!body) return null;
  const mappedCategory = mapCategory(body.category);
  const mapped = {
    _id: idOf(body),
    id: idOf(body),
    title: body.title,
    description: body.description || '',
    type: body.type || 'ARTICLE',
    status: body.status || 'DRAFT',
    category: mappedCategory,
    categories: mappedCategory ? [mappedCategory] : [],
    categoryId: mappedCategory?.id || idOf(body.category),
    isFeatured: Boolean(body.isFeatured),
    isRecommended: Boolean(body.isRecommended),
    recommended: Boolean(body.isRecommended),
    pdfUrl: body.pdfUrl || '',
    createdAt: body.createdAt,
    updatedAt: body.updatedAt,
  };

  if (includeDetail) {
    mapped.content = body.content || '';
  }

  return mapped;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeEnum = (value, allowed, fallback = undefined) => {
  if (!value) return fallback;
  const normalized = String(value).toUpperCase();
  return allowed.includes(normalized) ? normalized : fallback;
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripHtml = (value = '') => String(value).replace(/<[^>]+>/g, ' ');

const searchable = (value = '') => stripHtml(value).toLowerCase();

const tokenizeForChat = (query) => searchable(query)
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .split(/\s+/)
  .filter((term) => term.length > 2 && !CHAT_STOP_WORDS.has(term));

const chatScoreItem = (item, terms) => {
  const title = searchable(item.title);
  const description = searchable(item.description);
  const content = searchable(item.content);
  const category = searchable(item.category?.name);
  return terms.reduce((score, term) => {
    let nextScore = score;
    if (title.includes(term)) nextScore += 6;
    if (description.includes(term)) nextScore += 4;
    if (category.includes(term)) nextScore += 3;
    if (content.includes(term)) nextScore += 1;
    return nextScore;
  }, 0);
};

const chatScoreFaq = (faq, terms) => {
  const question = searchable(faq.question);
  const answer = searchable(faq.answer);
  const category = searchable(faq.category);
  return terms.reduce((score, term) => {
    let nextScore = score;
    if (question.includes(term)) nextScore += 6;
    if (category.includes(term)) nextScore += 3;
    if (answer.includes(term)) nextScore += 1;
    return nextScore;
  }, 0);
};

const handleControllerError = (error, res, next) => {
  if (error.code === 11000) {
    return res.status(409).json({ message: 'A record with this name already exists' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === 'CastError') {
    return res.status(404).json({ message: 'Not found' });
  }
  return next(error);
};

const createItemQuery = (req, forcePublished) => {
  const status = normalizeEnum(req.query.status, ['DRAFT', 'PUBLISHED', 'ARCHIVED']);
  const type = normalizeEnum(req.query.type, ['ARTICLE', 'PDF']);
  const categoryId = req.query.categoryId || req.query.category;
  const q = req.query.q || req.query.search;
  const query = {};

  if (forcePublished) {
    query.status = 'PUBLISHED';
  } else if (status) {
    query.status = status;
  }

  if (type) {
    query.type = type;
  }

  if (categoryId) {
    query.category = isValidObjectId(categoryId) ? categoryId : null;
  }

  if (q && String(q).trim()) {
    const regex = new RegExp(escapeRegExp(String(q).trim()), 'i');
    query.$or = [
      { title: regex },
      { description: regex },
      { content: regex },
    ];
  }

  return query;
};

const findItemById = async (id) => {
  if (!isValidObjectId(id)) return null;
  return KnowledgeBaseItem.findById(id)
    .populate('category');
};

const ensurePdfUploadDir = async () => {
  await fs.promises.mkdir(pdfUploadDir, { recursive: true });
};

const sanitizePdfBaseName = (fileName = 'document.pdf') => {
  const parsed = path.parse(path.basename(fileName));
  const safeBase = parsed.name
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return safeBase || 'document';
};

const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

const extractStoredFileName = (pdfUrl = '') => {
  const marker = '/api/kb/files/';
  const markerIndex = pdfUrl.indexOf(marker);
  if (markerIndex >= 0) {
    return decodeURIComponent(pdfUrl.substring(markerIndex + marker.length));
  }
  if (/^[a-zA-Z0-9_.-]+\.pdf$/i.test(pdfUrl)) {
    return pdfUrl;
  }
  return null;
};

const serveStoredPdf = async (res, fileName, attachment, downloadName) => {
  const safeName = path.basename(fileName || '');
  if (!safeName || safeName !== fileName || !safeName.toLowerCase().endsWith('.pdf')) {
    return res.status(404).json({ message: 'PDF not found' });
  }

  const root = path.resolve(pdfUploadDir);
  const filePath = path.resolve(root, safeName);
  if (!filePath.startsWith(root)) {
    return res.status(404).json({ message: 'PDF not found' });
  }

  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    return res.status(404).json({ message: 'PDF not found' });
  }

  const responseName = `${(downloadName || safeName).replace(/["\r\n]/g, '')}`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${attachment ? 'attachment' : 'inline'}; filename="${responseName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.sendFile(filePath);
};

const searchItemsForChat = async (queryText) => {
  const query = String(queryText || '').trim();
  if (!query) return [];

  const regex = new RegExp(escapeRegExp(query), 'i');
  const directMatches = await KnowledgeBaseItem.find({
    status: 'PUBLISHED',
    $or: [{ title: regex }, { description: regex }, { content: regex }],
  })
    .populate('category')
    .sort({ updatedAt: -1 })
    .limit(5);

  if (directMatches.length >= 5) {
    return directMatches;
  }

  const terms = tokenizeForChat(query);
  if (terms.length === 0) {
    return directMatches;
  }

  const recentItems = await KnowledgeBaseItem.find({ status: 'PUBLISHED' })
    .populate('category')
    .sort({ updatedAt: -1 })
    .limit(200);

  const merged = new Map(directMatches.map((item) => [idOf(item), item]));
  recentItems
    .map((item) => ({ item, score: chatScoreItem(item, terms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .forEach(({ item }) => {
      if (merged.size < 5) {
        merged.set(idOf(item), item);
      }
    });

  return Array.from(merged.values()).slice(0, 5);
};

const searchFaqsForChat = async (queryText) => {
  const query = String(queryText || '').trim();
  if (!query) return [];

  const regex = new RegExp(escapeRegExp(query), 'i');
  const directMatches = await KnowledgeBaseFAQ.find({
    status: 'PUBLISHED',
    $or: [{ question: regex }, { answer: regex }],
  })
    .sort({ sortOrder: 1, updatedAt: -1 })
    .limit(5);

  if (directMatches.length >= 5) {
    return directMatches;
  }

  const terms = tokenizeForChat(query);
  if (terms.length === 0) {
    return directMatches;
  }

  const allFaqs = await KnowledgeBaseFAQ.find({ status: 'PUBLISHED' })
    .sort({ sortOrder: 1, updatedAt: -1 })
    .limit(200);

  const merged = new Map(directMatches.map((faq) => [idOf(faq), faq]));
  allFaqs
    .map((faq) => ({ faq, score: chatScoreFaq(faq, terms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .forEach(({ faq }) => {
      if (merged.size < 5) {
        merged.set(idOf(faq), faq);
      }
    });

  return Array.from(merged.values()).slice(0, 5);
};

const buildChatContext = (items, faqs) => {
  let context = 'KNOWLEDGE BASE CONTEXT:\n\n';

  if (items.length > 0) {
    context += 'KB ARTICLES:\n';
    items.forEach((item) => {
      context += `[KB-${idOf(item)}] ${item.title}\n`;
      if (item.description) context += `Description: ${item.description.slice(0, 600)}\n`;
      if (item.content) context += `Content: ${stripHtml(item.content).slice(0, 800)}\n`;
      context += '\n';
    });
  }

  if (faqs.length > 0) {
    context += 'FREQUENTLY ASKED QUESTIONS:\n';
    faqs.forEach((faq) => {
      context += `[FAQ-${idOf(faq)}] Q: ${faq.question}\n`;
      context += `A: ${faq.answer.slice(0, 800)}\n\n`;
    });
  }

  return context;
};

const callGemini = async (apiKey, prompt) => {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    throw new Error('Gemini request failed');
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

const extractSources = (generated, items, faqs) => {
  const sources = [];
  const seen = new Set();
  const mappedItems = items.map((item) => mapItem(item, true));
  const mappedFaqs = faqs.map(mapFaq);

  let match;
  while ((match = SOURCE_PATTERN.exec(generated || '')) !== null) {
    const [, type, id] = match;
    const key = `${type}-${id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (type === 'KB') {
      const item = mappedItems.find((candidate) => candidate.id === id);
      if (item) {
        sources.push({
          type: 'KB Article',
          id,
          title: item.title,
          category: item.category?.name,
          url: `kb:item:${id}`,
        });
      }
    }

    if (type === 'FAQ') {
      const faq = mappedFaqs.find((candidate) => candidate.id === id);
      if (faq) {
        sources.push({
          type: 'FAQ',
          id,
          title: faq.question,
          category: faq.category,
          url: `kb:faq:${id}`,
        });
      }
    }
  }

  return sources;
};

const isFallbackAnswer = (answer) => {
  const lower = String(answer || '').toLowerCase();
  return !lower
    || lower.includes('not in the context')
    || lower.includes('cannot answer')
    || lower.includes("can't answer")
    || lower.includes('do not have that information')
    || lower.includes("don't have that information");
};

const getKnowledgeBaseHome = async (req, res, next) => {
  try {
    const [recommended, trending, featured] = await Promise.all([
      KnowledgeBaseItem.find({ status: 'PUBLISHED', isRecommended: true }).populate('category').sort({ updatedAt: -1 }).limit(6),
      KnowledgeBaseItem.find({ status: 'PUBLISHED' }).populate('category').sort({ updatedAt: -1 }).limit(6),
      KnowledgeBaseItem.find({ status: 'PUBLISHED', isFeatured: true }).populate('category').sort({ updatedAt: -1 }).limit(6),
    ]);

    res.json({
      recommended: recommended.map(mapItem),
      trending: trending.map(mapItem),
      featured: featured.map(mapItem),
    });
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

const listKnowledgeBaseItems = async (req, res, next) => {
  try {
    const items = await KnowledgeBaseItem.find(createItemQuery(req, true))
      .populate('category')
      .sort({ updatedAt: -1 })
      .limit(200);
    res.json({ items: items.map(mapItem), total: items.length });
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

const listRecommendedItems = async (req, res, next) => {
  try {
    const items = await KnowledgeBaseItem.find({ status: 'PUBLISHED', isRecommended: true })
      .populate('category')
      .sort({ updatedAt: -1 })
      .limit(12);
    res.json({ items: items.map(mapItem) });
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

const listTrendingItems = async (req, res, next) => {
  try {
    const items = await KnowledgeBaseItem.find({ status: 'PUBLISHED' })
      .populate('category')
      .sort({ updatedAt: -1 })
      .limit(12);
    res.json({ items: items.map(mapItem) });
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

const listFeaturedItems = async (req, res, next) => {
  try {
    const items = await KnowledgeBaseItem.find({ status: 'PUBLISHED', isFeatured: true })
      .populate('category')
      .sort({ updatedAt: -1 })
      .limit(12);
    res.json({ items: items.map(mapItem) });
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

const getKnowledgeBaseItem = async (req, res, next) => {
  try {
    const item = await findItemById(req.params.id);
    if (!item || (item.status !== 'PUBLISHED' && req.user.role !== 'admin')) {
      return res.status(404).json({ message: 'Knowledgebase item not found' });
    }
    return res.json(mapItem(item, true));
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const getRelatedKnowledgeBaseItems = async (req, res, next) => {
  try {
    const item = await findItemById(req.params.id);
    if (!item || item.status !== 'PUBLISHED') {
      return res.status(404).json({ message: 'Knowledgebase item not found' });
    }

    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 5, 20));
    const items = await KnowledgeBaseItem.find({
      _id: { $ne: item._id },
      category: item.category?._id,
      status: 'PUBLISHED',
    })
      .populate('category')
      .sort({ updatedAt: -1 })
      .limit(limit);

    return res.json({ items: items.map(mapItem) });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const submitKnowledgeBaseFeedback = async (req, res, next) => {
  try {
    const item = await findItemById(req.params.id);
    if (!item || item.status !== 'PUBLISHED') {
      return res.status(404).json({ message: 'Knowledgebase item not found' });
    }
    return res.json({ ok: true });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const listAdminKnowledgeBaseItems = async (req, res, next) => {
  try {
    const items = await KnowledgeBaseItem.find(createItemQuery(req, false))
      .populate('category')
      .sort({ updatedAt: -1 })
      .limit(500);
    res.json({ items: items.map(mapItem), total: items.length });
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

const createKnowledgeBaseItem = async (req, res, next) => {
  try {
    const { title, description, type, status, categoryId, content, pdfUrl, isFeatured, isRecommended } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!categoryId || !isValidObjectId(categoryId)) {
      return res.status(400).json({ message: 'Category is required' });
    }
    const category = await KnowledgeBaseCategory.findById(categoryId);
    if (!category) {
      return res.status(400).json({ message: 'Category not found' });
    }

    const normalizedType = normalizeEnum(type, ['ARTICLE', 'PDF'], 'ARTICLE');
    if (normalizedType === 'PDF' && !String(pdfUrl || '').trim()) {
      return res.status(400).json({ message: 'PDF URL is required for PDF items' });
    }

    const item = await KnowledgeBaseItem.create({
      title: String(title).trim(),
      description: description || '',
      type: normalizedType,
      status: normalizeEnum(status, ['DRAFT', 'PUBLISHED', 'ARCHIVED'], 'DRAFT'),
      category: category._id,
      content: normalizedType === 'ARTICLE' ? content || '' : '',
      pdfUrl: normalizedType === 'PDF' ? String(pdfUrl || '').trim() : '',
      isFeatured: Boolean(isFeatured),
      isRecommended: Boolean(isRecommended),
    });

    const populated = await findItemById(item._id);
    return res.status(201).json(mapItem(populated, true));
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const updateKnowledgeBaseItem = async (req, res, next) => {
  try {
    const item = await KnowledgeBaseItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Knowledgebase item not found' });
    }

    const { title, description, type, status, categoryId, content, pdfUrl, isFeatured, isRecommended } = req.body;
    const normalizedType = normalizeEnum(type, ['ARTICLE', 'PDF'], item.type);

    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ message: 'Title is required' });
      item.title = String(title).trim();
    }
    if (description !== undefined) item.description = description || '';
    if (status !== undefined) item.status = normalizeEnum(status, ['DRAFT', 'PUBLISHED', 'ARCHIVED'], item.status);
    if (type !== undefined) item.type = normalizedType;
    if (content !== undefined) item.content = normalizedType === 'ARTICLE' ? content || '' : '';
    if (pdfUrl !== undefined) item.pdfUrl = normalizedType === 'PDF' ? String(pdfUrl || '').trim() : '';
    if (isFeatured !== undefined) item.isFeatured = Boolean(isFeatured);
    if (isRecommended !== undefined) item.isRecommended = Boolean(isRecommended);

    if (categoryId !== undefined) {
      if (!categoryId || !isValidObjectId(categoryId)) return res.status(400).json({ message: 'Category is required' });
      const category = await KnowledgeBaseCategory.findById(categoryId);
      if (!category) return res.status(400).json({ message: 'Category not found' });
      item.category = category._id;
    }

    if (item.type === 'PDF' && !item.pdfUrl) {
      return res.status(400).json({ message: 'PDF URL is required for PDF items' });
    }

    await item.save();
    const populated = await findItemById(item._id);
    return res.json(mapItem(populated, true));
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const setKnowledgeBaseItemStatus = (status) => async (req, res, next) => {
  try {
    const item = await KnowledgeBaseItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Knowledgebase item not found' });
    }
    item.status = status;
    await item.save();
    return res.json({ ok: true });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const deleteKnowledgeBaseItem = async (req, res, next) => {
  try {
    const item = await KnowledgeBaseItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Knowledgebase item not found' });
    }
    await item.deleteOne();
    return res.json({ ok: true });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const uploadKnowledgeBasePdf = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'PDF file is required' });
    }

    const original = req.file.originalname || 'document.pdf';
    const mimetype = req.file.mimetype || '';
    const isPdf = original.toLowerCase().endsWith('.pdf')
      && mimetype.toLowerCase() === 'application/pdf'
      && req.file.buffer?.slice(0, 5).toString() === '%PDF-';

    if (!isPdf) {
      return res.status(400).json({ message: 'Only PDF files are supported' });
    }

    await ensurePdfUploadDir();
    const fileName = `${Date.now()}-${crypto.randomUUID()}-${sanitizePdfBaseName(original)}.pdf`;
    await fs.promises.writeFile(path.join(pdfUploadDir, fileName), req.file.buffer);

    return res.status(201).json({
      url: `${getBaseUrl(req)}/api/kb/files/${encodeURIComponent(fileName)}`,
      fileName: original,
      storedFileName: fileName,
      size: req.file.size,
    });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const downloadKnowledgeBasePdf = async (req, res, next) => {
  try {
    const item = await findItemById(req.params.id);
    if (!item || (item.status !== 'PUBLISHED' && req.user.role !== 'admin')) {
      return res.status(404).json({ message: 'Knowledgebase item not found' });
    }
    if (item.type !== 'PDF' || !item.pdfUrl) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    const storedFileName = extractStoredFileName(item.pdfUrl);
    if (storedFileName) {
      return serveStoredPdf(res, storedFileName, true, `${item.title}.pdf`);
    }

    return res.redirect(item.pdfUrl);
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const getKnowledgeBasePdfFile = async (req, res, next) => {
  try {
    return serveStoredPdf(res, req.params.fileName, false, req.params.fileName);
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const listCategories = async (req, res, next) => {
  try {
    const categories = await KnowledgeBaseCategory.find().sort({ name: 1 });
    const counts = await KnowledgeBaseItem.aggregate([
      { $match: { status: 'PUBLISHED' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((entry) => [entry._id.toString(), entry.count]));
    return res.json(categories.map((category) => mapCategory(category, countMap.get(idOf(category)) || 0)));
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const getCategory = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Category not found' });
    const category = await KnowledgeBaseCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    const itemCount = await KnowledgeBaseItem.countDocuments({ category: category._id, status: 'PUBLISHED' });
    return res.json(mapCategory(category, itemCount));
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const listCategoryItems = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Category not found' });
    const items = await KnowledgeBaseItem.find({ category: req.params.id, status: 'PUBLISHED' })
      .populate('category')
      .sort({ updatedAt: -1 })
      .limit(200);
    return res.json({ items: items.map(mapItem), total: items.length });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const listAdminCategories = async (req, res, next) => {
  try {
    const categories = await KnowledgeBaseCategory.find().sort({ name: 1 });
    return res.json(categories.map((category) => mapCategory(category)));
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: 'Category name is required' });
    const category = await KnowledgeBaseCategory.create({ name: String(name).trim(), description: description || '' });
    return res.status(201).json(mapCategory(category));
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Category not found' });
    const category = await KnowledgeBaseCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    if (!req.body.name || !String(req.body.name).trim()) return res.status(400).json({ message: 'Category name is required' });
    category.name = String(req.body.name).trim();
    category.description = req.body.description || '';
    await category.save();
    return res.json(mapCategory(category));
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Category not found' });
    const inUse = await KnowledgeBaseItem.exists({ category: req.params.id });
    if (inUse) return res.status(400).json({ message: 'Category is in use by knowledgebase items' });
    const deleted = await KnowledgeBaseCategory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Category not found' });
    return res.json({ ok: true });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const listPublishedFaqs = async (req, res, next) => {
  try {
    const faqs = await KnowledgeBaseFAQ.find({ status: 'PUBLISHED' }).sort({ sortOrder: 1, updatedAt: -1 });
    return res.json(faqs.map(mapFaq));
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const listAdminFaqs = async (req, res, next) => {
  try {
    const faqs = await KnowledgeBaseFAQ.find().sort({ sortOrder: 1, updatedAt: -1 });
    return res.json({ items: faqs.map(mapFaq) });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const createFaq = async (req, res, next) => {
  try {
    const { question, answer, category, status, sortOrder, sort_order: sortOrderAlias } = req.body;
    if (!question || !String(question).trim()) return res.status(400).json({ message: 'Question is required' });
    if (!answer || !String(answer).trim()) return res.status(400).json({ message: 'Answer is required' });
    const faq = await KnowledgeBaseFAQ.create({
      question: String(question).trim(),
      answer,
      category: category && String(category).trim() ? String(category).trim() : 'General',
      status: normalizeEnum(status, ['DRAFT', 'PUBLISHED'], 'PUBLISHED'),
      sortOrder: Number.isFinite(Number(sortOrder ?? sortOrderAlias)) ? Number(sortOrder ?? sortOrderAlias) : 0,
    });
    return res.status(201).json(mapFaq(faq));
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const updateFaq = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'FAQ not found' });
    const faq = await KnowledgeBaseFAQ.findById(req.params.id);
    if (!faq) return res.status(404).json({ message: 'FAQ not found' });
    const { question, answer, category, status, sortOrder, sort_order: sortOrderAlias } = req.body;
    if (!question || !String(question).trim()) return res.status(400).json({ message: 'Question is required' });
    if (!answer || !String(answer).trim()) return res.status(400).json({ message: 'Answer is required' });
    faq.question = String(question).trim();
    faq.answer = answer;
    faq.category = category && String(category).trim() ? String(category).trim() : 'General';
    faq.status = normalizeEnum(status, ['DRAFT', 'PUBLISHED'], faq.status);
    if (sortOrder !== undefined || sortOrderAlias !== undefined) {
      faq.sortOrder = Number.isFinite(Number(sortOrder ?? sortOrderAlias)) ? Number(sortOrder ?? sortOrderAlias) : faq.sortOrder;
    }
    await faq.save();
    return res.json(mapFaq(faq));
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const reorderFaqs = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    await Promise.all(items.map((item) => {
      const id = item.id || item._id;
      const sortOrder = item.sortOrder ?? item.sort_order;
      if (!isValidObjectId(id) || !Number.isFinite(Number(sortOrder))) return null;
      return KnowledgeBaseFAQ.findByIdAndUpdate(id, { sortOrder: Number(sortOrder) });
    }));
    return res.json({ ok: true });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const deleteFaq = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'FAQ not found' });
    const deleted = await KnowledgeBaseFAQ.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'FAQ not found' });
    return res.json({ ok: true });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

const sendChatMessage = async (req, res, next) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const [items, faqs] = await Promise.all([
      searchItemsForChat(message),
      searchFaqsForChat(message),
    ]);

    if (items.length === 0 && faqs.length === 0) {
      return res.json({ id: Date.now(), response: FALLBACK_RESPONSE, sources: [], timestamp: new Date().toISOString() });
    }

    const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return res.json({ id: Date.now(), response: FALLBACK_RESPONSE, sources: [], timestamp: new Date().toISOString() });
    }

    const context = buildChatContext(items, faqs);
    const prompt = `You are a helpful student support chatbot. Answer the student's question using only the knowledge base context below.
If the answer is not in the context, answer exactly: ${FALLBACK_RESPONSE}
Include source references in brackets like [KB-<id>] or [FAQ-<id>] when you use a source.
Keep the answer concise and student-friendly.

${context}

Question: ${message}`;

    let generated = '';
    try {
      generated = await callGemini(apiKey, prompt);
    } catch (error) {
      return res.json({ id: Date.now(), response: FALLBACK_RESPONSE, sources: [], timestamp: new Date().toISOString() });
    }

    const cleaned = String(generated || '').replace(SOURCE_PATTERN, '').trim();
    if (isFallbackAnswer(cleaned)) {
      return res.json({ id: Date.now(), response: FALLBACK_RESPONSE, sources: [], timestamp: new Date().toISOString() });
    }

    return res.json({
      id: Date.now(),
      response: cleaned,
      sources: extractSources(generated, items, faqs),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
};

module.exports = {
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
};
