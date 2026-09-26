export function formatCurrency(amount: number = 0, currencySymbol: string = '₹'): string {
  const rounded = Number(amount || 0).toFixed(2);
  const [integerPart, decimalPart] = rounded.split('.');
  
  // Format with Indian numbering system (e.g. 1,25,000.00)
  const isNegative = integerPart.startsWith('-');
  const cleanInt = isNegative ? integerPart.slice(1) : integerPart;
  
  let lastThree = cleanInt.slice(-3);
  const otherNumbers = cleanInt.slice(0, -3);
  
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const result = `${formattedInt}.${decimalPart}`;
  return `${isNegative ? '-' : ''}${currencySymbol}${result}`;
}

const INVOICE_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'June',
  'July',
  'Aug',
  'Sept',
  'Oct',
  'Nov',
  'Dec',
];

export function formatInvoiceDate(dateString?: string): string {
  if (!dateString) return '-';
  const trimmed = String(dateString).trim();
  
  // Directly parse YYYY-MM-DD to avoid timezone shift
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (isoMatch) {
    const year = isoMatch[1];
    const monthIndex = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${INVOICE_MONTHS[monthIndex]} ${year}`;
    }
  }

  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return trimmed;
    const day = d.getDate();
    const month = INVOICE_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return trimmed;
  }
}

export function formatDate(dateString?: string): string {
  return formatInvoiceDate(dateString);
}

export function numberToWords(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero Rupees Only';

  const roundNum = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - roundNum) * 100);

  function inWords(n: number): string {
    let str = '';
    if (n > 9999999) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n > 99) {
      str += inWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) str += a[n];
      else {
        str += b[Math.floor(n / 10)];
        if (n % 10 > 0) str += ' ' + a[n % 10];
        else str += ' ';
      }
    }
    return str;
  }

  let words = inWords(roundNum).trim() + ' Rupees';
  if (paise > 0) {
    words += ' and ' + inWords(paise).trim() + ' Paise';
  }
  return words + ' Only';
}

export const numberToWordsIndian = numberToWords;

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
}
