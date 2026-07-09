import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'rawResponse';

/**
 * Opt a handler out of the `{ data, meta }` envelope produced by
 * {@link TransformInterceptor}. Useful for file downloads, redirects,
 * or endpoints returning a third-party contract verbatim.
 */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
