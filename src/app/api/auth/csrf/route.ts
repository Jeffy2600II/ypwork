import { withPublic } from '@/lib/api';
import { issueCsrfToken } from '@/lib/security';

export const GET = withPublic(async () => {
  return issueCsrfToken();
});
