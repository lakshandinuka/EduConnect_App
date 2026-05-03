import api from './api';

export const getInquiryTypes = async () => {
  const response = await api.get('/inquiry-types');
  return response.data;
};

export const createInquiryType = async (data) => {
  const response = await api.post('/inquiry-types', data);
  return response.data;
};
