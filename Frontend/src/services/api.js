import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getApiUrl = () => {
  // Use your machine's local IP address for testing on physical devices
  const LOCAL_IP = '192.168.1.4'; 
  
  if (Platform.OS === 'android') {
    // 10.0.2.2 is for Android Emulator, but LOCAL_IP is better for physical devices
    return `http://${LOCAL_IP}:5001/api`;
  }
  return `http://${LOCAL_IP}:5001/api`;
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
