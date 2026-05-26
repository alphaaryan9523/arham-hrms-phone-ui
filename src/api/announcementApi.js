import axiosClient from './axiosClient.js';

export const announcementApi = {
  getAnnouncements: () => axiosClient.get('/api/announcements/').then((res) => res.data)
};
