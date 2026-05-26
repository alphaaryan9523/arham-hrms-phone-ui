import axiosClient from './axiosClient.js';

export const authApi = {
  login: ({ identifier, password }) => axiosClient.post('/api/auth/login/', { identifier, password }).then((res) => res.data),
  changePassword: (payload) => axiosClient.post('/api/auth/change-password/', payload).then((res) => res.data),
  logout: () => axiosClient.post('/api/auth/logout/').then((res) => res.data),
  me: () => axiosClient.get('/api/auth/me/').then((res) => res.data)
};
