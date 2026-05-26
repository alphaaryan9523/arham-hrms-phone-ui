import axiosClient from './axiosClient.js';

export const reimbursementApi = {
  getMyReimbursements: () => axiosClient.get('/api/reimbursements/my/').then((res) => res.data),
  requestReimbursement: (payload) => axiosClient.post('/api/reimbursements/request/', payload).then((res) => res.data)
};
