import { z } from "zod";

/**
 * Client Metadata
 *
 * @see https://www.rfc-editor.org/rfc/rfc7591.html#section-4.1.2
 * @see https://openid.net/specs/openid-connect-self-issued-v2-1_0.html#name-a-set-of-static-configuratio
 */
export const clientMetadataSchema = z.object({
  jwks_uri: z.string().url().optional(),
  authorization_endpoint: z.string().optional(),
});

export default clientMetadataSchema;
