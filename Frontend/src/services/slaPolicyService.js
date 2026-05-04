import api from './api';

export const getSLAPolicies = async () => {
  const response = await api.get('/sla-policies');
  return response.data;
};

export const getSLAPolicyById = async (id) => {
  const response = await api.get(`/sla-policies/${id}`);
  return response.data;
};

// Admin only
export const createSLAPolicy = async (policyData) => {
  const response = await api.post('/sla-policies', policyData);
  return response.data;
};

export const updateSLAPolicy = async (id, policyData) => {
  const response = await api.put(`/sla-policies/${id}`, policyData);
  return response.data;
};

export const deleteSLAPolicy = async (id) => {
  const response = await api.delete(`/sla-policies/${id}`);
  return response.data;
};