import { redirect } from 'next/navigation';

import { CALCULATORS } from '@/lib/calculators';

/** There is no home yet: the site opens on its first calculator. */
export default function HomePage() {
  redirect(CALCULATORS[0].href);
}
