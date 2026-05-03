import api from './api';

export const getSLAPolicies = async () => {
  const response = await api.get('/sla-policies');
  return response.data;
};

// Admin only
export const createSLAPolicy = async (policyData) => {
  const response = await api.post('/sla-policies', policyData);
  return response.data;
};
