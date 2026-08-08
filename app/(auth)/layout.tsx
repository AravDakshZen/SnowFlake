import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session?.user?.id) redirect('/dashboard');
  return <>{children}</>;
}
