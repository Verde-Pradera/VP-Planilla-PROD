export function isLeapYear(year: Date) {
  const actualYear = year.getFullYear();
  return actualYear % 4 == 0 && (actualYear % 100 != 0 || actualYear % 400 == 0);
}