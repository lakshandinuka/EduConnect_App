import api from './api';

export const getDepartments = async () => {
  const response = await api.get('/departments');
  return response.data;
};

export const createDepartment = async (data) => {
  const response = await api.post('/departments', data);
  return response.data;
};
