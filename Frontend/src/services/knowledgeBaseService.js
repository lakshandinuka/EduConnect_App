import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import api, { API_URL } from './api';

const normalizeItem = (item) => {
  if (!item) return item;
  const normalized = {
    ...item,
    id: item.id || item._id,
    _id: item._id || item.id,
  };
  if (normalized.category && !normalized.categories) {
    normalized.categories = [normalized.category];
  }
  if (Array.isArray(normalized.categories) && normalized.categories.length > 0) {
    normalized.category = normalized.categories[0];
  }
  return normalized;
};

const normalizeItems = (items = []) => items.map(normalizeItem);

export const getKBHome = async () => {
  const response = await api.get('/kb');
  return {
    recommended: normalizeItems(response.data?.recommended || []),
    trending: normalizeItems(response.data?.trending || []),
    featured: normalizeItems(response.data?.featured || []),
  };
};

export const getKBItems = async (params = {}) => {
  const response = await api.get('/kb/items', {
    params: {
      ...params,
      q: params.q || params.search,
      categoryId: params.categoryId || params.category,
    },
  });
  return {
    ...response.data,
    items: normalizeItems(response.data?.items || []),
  };
};

export const getKBItem = async (itemId) => {
  const response = await api.get(`/kb/items/${itemId}`);
  return normalizeItem(response.data);
};

export const getRelatedKBItems = async (itemId, limit = 5) => {
  const response = await api.get(`/kb/items/${itemId}/related`, { params: { limit } });
  return normalizeItems(response.data?.items || []);
};

export const submitKBFeedback = async (itemId, feedbackData = {}) => {
  const response = await api.post(`/kb/items/${itemId}/feedback`, feedbackData);
  return response.data;
};

export const getAdminKBItems = async (params = {}) => {
  const response = await api.get('/kb/admin/items', { params });
  return {
    ...response.data,
    items: normalizeItems(response.data?.items || []),
  };
};

export const createKBItem = async (itemData) => {
  const response = await api.post('/kb/admin/items', itemData);
  return normalizeItem(response.data);
};

export const updateKBItem = async (itemId, itemData) => {
  const response = await api.put(`/kb/admin/items/${itemId}`, itemData);
  return normalizeItem(response.data);
};

export const archiveKBItem = async (itemId) => {
  const response = await api.patch(`/kb/admin/items/${itemId}/archive`);
  return response.data;
};

export const unarchiveKBItem = async (itemId) => {
  const response = await api.patch(`/kb/admin/items/${itemId}/unarchive`);
  return response.data;
};

export const publishKBItem = async (itemId) => {
  const response = await api.patch(`/kb/admin/items/${itemId}/publish`);
  return response.data;
};

export const unpublishKBItem = async (itemId) => {
  const response = await api.patch(`/kb/admin/items/${itemId}/unpublish`);
  return response.data;
};

export const deleteKBItem = async (itemId) => {
  const response = await api.delete(`/kb/admin/items/${itemId}`);
  return response.data;
};

export const uploadKBPDF = async (asset) => {
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: asset.name || 'document.pdf',
    type: asset.mimeType || 'application/pdf',
  });
  const response = await api.post('/kb/admin/upload-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const downloadKBPDFToFile = async (item) => {
  const token = await AsyncStorage.getItem('userToken');
  const safeTitle = (item.title || `document-${item.id}`)
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'document';
  const fileUri = `${FileSystem.documentDirectory}${safeTitle}.pdf`;
  const result = await FileSystem.downloadAsync(`${API_URL}/kb/items/${item.id}/download`, fileUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (result.status < 200 || result.status >= 300) {
    const error = new Error(`PDF download failed with status ${result.status}`);
    error.status = result.status;
    throw error;
  }
  return result;
};

export const getKBCategories = async () => {
  const response = await api.get('/kb/categories');
  return response.data;
};

export const getKBCategory = async (categoryId) => {
  const response = await api.get(`/kb/categories/${categoryId}`);
  return response.data;
};

export const getKBCategoryItems = async (categoryId) => {
  const response = await api.get(`/kb/categories/${categoryId}/items`);
  return {
    ...response.data,
    items: normalizeItems(response.data?.items || []),
  };
};

export const getAdminKBCategories = async () => {
  const response = await api.get('/kb/admin/categories');
  return response.data;
};

export const createKBCategory = async (categoryData) => {
  const response = await api.post('/kb/admin/categories', categoryData);
  return response.data;
};

export const updateKBCategory = async (categoryId, categoryData) => {
  const response = await api.put(`/kb/admin/categories/${categoryId}`, categoryData);
  return response.data;
};

export const deleteKBCategory = async (categoryId) => {
  const response = await api.delete(`/kb/admin/categories/${categoryId}`);
  return response.data;
};

export const getKBFAQs = async () => {
  const response = await api.get('/kb/faqs');
  return response.data;
};

export const getAdminKBFAQs = async () => {
  const response = await api.get('/kb/admin/faqs');
  return response.data;
};

export const createKBFAQ = async (faqData) => {
  const response = await api.post('/kb/admin/faqs', faqData);
  return response.data;
};

export const updateKBFAQ = async (faqId, faqData) => {
  const response = await api.put(`/kb/admin/faqs/${faqId}`, faqData);
  return response.data;
};

export const deleteKBFAQ = async (faqId) => {
  const response = await api.delete(`/kb/admin/faqs/${faqId}`);
  return response.data;
};

export const sendKBChatMessage = async (message, conversationId = null) => {
  const response = await api.post('/kb/chat/message', { message, conversationId });
  return response.data;
};
