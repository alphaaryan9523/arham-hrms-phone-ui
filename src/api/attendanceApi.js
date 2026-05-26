import axiosClient from './axiosClient.js';

export const attendanceApi = {
  getMyAttendance: () => axiosClient.get('/api/attendance/my/').then((res) => res.data),
  getTodayAttendance: () => axiosClient.get('/api/attendance/today/').then((res) => res.data),
  clockIn: () => axiosClient.post('/api/attendance/clock-in/', { source: 'PHONE_APP' }).then((res) => res.data),
  clockOut: () => axiosClient.post('/api/attendance/clock-out/', { source: 'PHONE_APP' }).then((res) => res.data)
};
