import { z } from "zod";

export const kycverifiedSchema = z
  .object({
    // Only validate that `kty` is present
    firstName: (z.string()),
    lastName: (z.string()),
    nationality: z.optional(z.string()),
    birthDate: z.optional(z.string()),
    personalId: z.optional(z.string()),
    address: z.optional(z.string()),
    salary: z.optional(z.string()),
    employer: z.optional(z.string()),
    telephone: z.optional(z.string()),
    email: z.optional(z.string()),
  }).strict()
 

// export const kycverifiedSchema = z.object({
//     keys: z.array(verifiedSchema).nonempty(),
//   });