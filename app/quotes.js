// THE QUOTE OF THE DAY. Every page opens on one line of encouragement, the same line for
// every officer on the same day in Manila, and the next line the day after. Ethan asked for it
// on 2026-09-29. Every line is public domain or the Society's own, and every attribution names
// the work it comes from, because a misattributed quote on a finance society's page is worse
// than no quote. To change the list, edit this file: order is the order of the days.

export const QUOTES = [
  { text: 'Well done is better than well said.', who: 'Benjamin Franklin, Poor Richard\'s Almanack' },
  { text: 'Your first step towards financial freedom.', who: 'Investors\' Society' },
  { text: 'If you add only a little to a little and do this often, soon that little will become great.', who: 'Hesiod, Works and Days' },
  { text: 'Hold every hour in your grasp.', who: 'Seneca, Letters to Lucilius' },
  { text: 'Diligence is the mother of good luck.', who: 'Benjamin Franklin, The Way to Wealth' },
  { text: 'The beginning is the most important part of any work.', who: 'Plato, The Republic' },
  { text: 'Give a portion to seven, and also to eight.', who: 'Ecclesiastes 11:2' },
  { text: 'The reward of a thing well done is to have done it.', who: 'Ralph Waldo Emerson, New England Reformers' },
  { text: 'Little strokes fell great oaks.', who: 'Benjamin Franklin, The Way to Wealth' },
  { text: 'First say to yourself what you would be; and then do what you have to do.', who: 'Epictetus, Discourses' },
  { text: 'For a financially literate Lasallian community.', who: 'Investors\' Society' },
  { text: 'He who has begun has half done. Dare to be wise; begin!', who: 'Horace, Epistles' },
  { text: 'Beware of little expenses; a small leak will sink a great ship.', who: 'Benjamin Franklin, The Way to Wealth' },
  { text: 'Great works are performed, not by strength, but perseverance.', who: 'Samuel Johnson, Rasselas' },
  { text: 'The thoughts of the diligent tend only to plenteousness.', who: 'Proverbs 21:5' },
  { text: 'While we are postponing, life speeds by.', who: 'Seneca, Letters to Lucilius' },
  { text: 'Plough deep while sluggards sleep.', who: 'Benjamin Franklin, The Way to Wealth' },
  { text: 'The journey of a thousand li commenced with a single step.', who: 'Lao Tzu, Tao Te Ching' },
  { text: 'Nothing great was ever achieved without enthusiasm.', who: 'Ralph Waldo Emerson, Circles' },
  { text: 'If you would be wealthy, think of saving as well as of getting.', who: 'Benjamin Franklin, The Way to Wealth' },
  { text: 'Work is no disgrace: it is idleness which is a disgrace.', who: 'Hesiod, Works and Days' },
  { text: '9 years of growth, one legacy forward.', who: 'Investors\' Society' },
  { text: 'No longer talk at all about the kind of man that a good man ought to be, but be such.', who: 'Marcus Aurelius, Meditations' },
  { text: 'One today is worth two tomorrows.', who: 'Benjamin Franklin, The Way to Wealth' },
  { text: 'Dripping water hollows out a stone.', who: 'Ovid, Letters from the Black Sea' },
  { text: 'Do the duty which lies nearest thee.', who: 'Thomas Carlyle, Sartor Resartus' },
  { text: 'Wealth gotten by vanity shall be diminished: but he that gathereth by labour shall increase.', who: 'Proverbs 13:11' },
  { text: 'Remember that time is money.', who: 'Benjamin Franklin, Advice to a Young Tradesman' },
  { text: 'They can because they think they can.', who: 'Virgil, Aeneid' },
  { text: 'Let us, then, be up and doing, with a heart for any fate.', who: 'Henry Wadsworth Longfellow, A Psalm of Life' },
  { text: 'The used key is always bright.', who: 'Benjamin Franklin, The Way to Wealth' },
  { text: 'Do the thing, and you shall have the power.', who: 'Ralph Waldo Emerson, Compensation' },
  { text: 'Seize the day, trusting as little as possible in the next.', who: 'Horace, Odes' },
  { text: 'For age and want, save while you may; no morning sun lasts a whole day.', who: 'Benjamin Franklin, The Way to Wealth' },
  { text: 'Go to the ant, thou sluggard; consider her ways, and be wise.', who: 'Proverbs 6:6' },
  { text: 'Blessed is he who has found his work; let him ask no other blessedness.', who: 'Thomas Carlyle, Past and Present' },
  { text: 'Sloth makes all things difficult, but industry all easy.', who: 'Benjamin Franklin, The Way to Wealth' },
  { text: 'Whatsoever thy hand findeth to do, do it with thy might.', who: 'Ecclesiastes 9:10' },
  { text: 'Lost time is never found again.', who: 'Benjamin Franklin, The Way to Wealth' },
  { text: 'If one advances confidently in the direction of his dreams, and endeavors to live the life which he has imagined, he will meet with a success unexpected in common hours.', who: 'Henry David Thoreau, Walden' },
  { text: 'Have you somewhat to do tomorrow, do it today.', who: 'Benjamin Franklin, The Way to Wealth' },
  { text: 'Dost thou love life? Then do not squander time, for that\'s the stuff life is made of.', who: 'Benjamin Franklin, Poor Richard\'s Almanack' },
  { text: 'Early to bed and early to rise, makes a man healthy, wealthy, and wise.', who: 'Benjamin Franklin, Poor Richard\'s Almanack' },
  { text: 'Creditors have better memories than debtors.', who: 'Benjamin Franklin, The Way to Wealth' }
];

// Today in Manila as a day count, so the line turns over at Manila midnight wherever the phone
// is set, and every page agrees on it.
export function quoteForToday(now) {
  const d = now || new Date();
  let key = '';
  try {
    key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch (e) {
    key = d.toISOString().slice(0, 10);
  }
  const parts = key.split('-').map(Number);
  if (parts.length !== 3 || parts.some((x) => !isFinite(x))) return QUOTES[0];
  const day = Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
  return QUOTES[((day % QUOTES.length) + QUOTES.length) % QUOTES.length];
}
