import api from './api';

export const getTickets = async () => {
  const response = await api.get('/tickets');
  return response.data;
};

export const getTicketById = async (id) => {
  const response = await api.get(`/tickets/${id}`);
  return response.data;
};

export const createTicket = async (ticketData) => {
  const response = await api.post('/tickets', ticketData);
  return response.data;
};

export const addTicketComment = async (id, text) => {
  const response = await api.post(`/tickets/${id}/comments`, { text });
  return response.data;
};

export const escalateTicket = async (id, note) => {
  const response = await api.put(`/tickets/${id}/escalate`, { note });
  return response.data;
};

export const approveTicket = async (id, status, note) => {
  const response = await api.put(`/tickets/${id}/approve`, { status, note });
  return response.data;
};

export const updateTicketSLA = async (id, slaPolicyId) => {
  const response = await api.put(`/tickets/${id}/sla`, { slaPolicyId });
  return response.data;
};

export const rateTicket = async (id, rating, ratingComment = '') => {
  const response = await api.put(`/tickets/${id}/rate`, { rating, ratingComment });
  return response.data;
};
