import axiosClient from './axiosClient.js';

export const leaveApi = {
  getMyLeaves: () => axiosClient.get('/api/leaves/my/').then((res) => res.data),
  applyLeave: (payload) => axiosClient.post('/api/leaves/apply/', payload).then((res) => res.data),
  getLeaveBalance: () => axiosClient.get('/api/leaves/balance/').then((res) => res.data)
};
