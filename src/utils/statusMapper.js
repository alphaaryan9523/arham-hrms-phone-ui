export const ATTENDANCE_STATUS = {
  NOT_CLOCKED_IN: 'NOT_CLOCKED_IN',
  CLOCKED_IN: 'CLOCKED_IN',
  CLOCKED_OUT: 'CLOCKED_OUT'
};

export function normalizeList(data) {
  return Array.isArray(data)
    ? data
    : data?.results ||
      data?.records ||
      data?.payslips ||
      data?.leaves ||
      data?.balances ||
      data?.reimbursements ||
      data?.announcements ||
      data?.items ||
      data?.data ||
      [];
}

export function normalizeAttendanceStatus(record) {
  const rawStatus = String(record?.status || '').toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (rawStatus === ATTENDANCE_STATUS.CLOCKED_OUT) return ATTENDANCE_STATUS.CLOCKED_OUT;
  if (rawStatus === ATTENDANCE_STATUS.CLOCKED_IN) return ATTENDANCE_STATUS.CLOCKED_IN;
  if (rawStatus === ATTENDANCE_STATUS.NOT_CLOCKED_IN) return ATTENDANCE_STATUS.NOT_CLOCKED_IN;
  return ATTENDANCE_STATUS.NOT_CLOCKED_IN;
}

export function titleFromStatus(status) {
  return String(status || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
