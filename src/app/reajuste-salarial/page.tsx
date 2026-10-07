import type { Metadata } from 'next';

import { AdjustmentScreen } from '@/features/salary-adjustment/adjustment-screen';

export const metadata: Metadata = {
  title: 'Reajuste salarial',
  description: 'Quanto um reajuste muda no seu salário líquido e quanto vem de retroativo, com INSS, IRRF e FGTS.',
};

export default function SalaryAdjustmentPage() {
  return <AdjustmentScreen />;
}
