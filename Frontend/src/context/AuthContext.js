import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, ...user } = response.data;
      setUserInfo(user);
      setUserToken(token);
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
    } catch (e) {
      console.log('Login error details:', e.response?.data || e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { token, ...user } = response.data;
      setUserInfo(user);
      setUserToken(token);
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
    } catch (e) {
      console.log('Register error details:', e.response?.data || e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  // Admin-only: register a staff or admin account via protected endpoint
  const registerStaff = async (name, email, password, role, department) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register-staff', { name, email, password, role, department });
      return response.data;
    } catch (e) {
      console.log('Staff register error:', e.response?.data || e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };


  const logout = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userInfo');
      setUserToken(null);
      setUserInfo(null);
    } catch (e) {
      console.log(`Logout error ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      let userToken = await AsyncStorage.getItem('userToken');
      let userInfo = await AsyncStorage.getItem('userInfo');

      if (userToken) {
        setUserToken(userToken);
        setUserInfo(JSON.parse(userInfo));
      }
    } catch (e) {
      console.log(`isLoggedIn error ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    isLoggedIn();
  }, []);

  return (
    <AuthContext.Provider value={{ login, logout, register, registerStaff, isLoading, userToken, userInfo }}>
      {children}
    </AuthContext.Provider>
  );
};
