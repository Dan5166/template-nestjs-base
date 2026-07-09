import { AuthProvider } from '../../users/entities/user.entity';

/** Provider-agnostic profile produced by the Google/GitHub strategies. */
export interface OAuthProfile {
  provider: AuthProvider;
  providerId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}
