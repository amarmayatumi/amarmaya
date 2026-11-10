// Date keys must use the device's local calendar, not UTC (Bangladesh is UTC+6).
export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalMonthKey(date = new Date()) {
  return getLocalDateKey(date).slice(0, 7);
}
