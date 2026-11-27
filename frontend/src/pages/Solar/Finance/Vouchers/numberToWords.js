/**
 * Converts numeric currency amount into formal English words.
 * Example: 45250.75 -> "Forty-Five Thousand Two Hundred Fifty Sri Lankan Rupees and Seventy-Five Cents Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertGroup(n) {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)];
    if (n % 10 > 0) {
      str += '-' + ONES[n % 10];
    }
    str += ' ';
  } else if (n > 0) {
    str += ONES[n] + ' ';
  }
  return str.trim();
}

export function numberToWords(amount) {
  const num = Number(amount);
  if (isNaN(num) || num === 0) return 'Zero Rupees Only';

  const parts = Math.abs(num).toFixed(2).split('.');
  let integerPart = parseInt(parts[0], 10);
  const centsPart = parseInt(parts[1], 10);

  if (integerPart === 0 && centsPart === 0) return 'Zero Rupees Only';

  const scales = [
    { value: 10000000, name: 'Crore' },
    { value: 100000, name: 'Lakh' },
    { value: 1000, name: 'Thousand' },
    { value: 1, name: '' }
  ];

  let words = '';

  // Western standard scale if preferred for English vouchers:
  const billion = Math.floor(integerPart / 1000000000);
  integerPart %= 1000000000;
  const million = Math.floor(integerPart / 1000000);
  integerPart %= 1000000;
  const thousand = Math.floor(integerPart / 1000);
  const remainder = integerPart % 1000;

  if (billion > 0) {
    words += convertGroup(billion) + ' Billion ';
  }
  if (million > 0) {
    words += convertGroup(million) + ' Million ';
  }
  if (thousand > 0) {
    words += convertGroup(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    words += convertGroup(remainder) + ' ';
  }

  words = words.trim() + ' Sri Lankan Rupees';

  if (centsPart > 0) {
    words += ' and ' + convertGroup(centsPart) + ' Cents';
  }

  words += ' Only';

  return words;
}
