import api from './api';

export const getAvailableTimeSlots = async () => {
  const response = await api.get('/bookings/timeslots');
  return response.data;
};

export const getAllTimeSlots = async () => {
  const response = await api.get('/bookings/timeslots/all');
  return response.data;
};

export const createTimeSlot = async (slotData) => {
  const response = await api.post('/bookings/timeslots', slotData);
  return response.data;
};

export const getBookings = async () => {
  const response = await api.get('/bookings');
  return response.data;
};

export const getAllBookings = async () => {
  const response = await api.get('/bookings/all');
  return response.data;
};

export const createBooking = async (bookingData) => {
  const response = await api.post('/bookings', bookingData);
  return response.data;
};

export const updateBookingStatus = async (id, status) => {
  const response = await api.put(`/bookings/${id}/status`, { status });
  return response.data;
};
