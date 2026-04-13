/**
 * src/app/assets/page.tsx  —  Server Component
 *
 * Fetches initial data from D1 on every request and passes it down to the
 * interactive Client Component. All mutations happen via Server Actions in
 * AssetsManager; this file stays clean and small.
 */

import { checkAuth } from '@/actions/auth.actions';
import { getInitialData } from '@/actions/assets.actions';
import AssetsManager      from './AssetsManager';

export const runtime = 'edge'; // required for Cloudflare Pages + D1

export default async function AssetsPage() {
  await checkAuth();
  const initialData = await getInitialData();

  return <AssetsManager initialData={initialData} />;
}