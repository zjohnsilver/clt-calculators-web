import { TrendingUp, type LucideIcon } from 'lucide-react';

export type Calculator = { href: string; label: string; icon: LucideIcon };

/** Every calculator the site has. A new one is a route plus a line here. */
export const CALCULATORS: readonly Calculator[] = [
  { href: '/reajuste-salarial', label: 'Reajuste salarial', icon: TrendingUp },
];
