import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(255));
const passwordSchema = z.string()
  .min(12)
  .max(72)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72);

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema
}).strict();

const campaignFields = {
  name: z.string().trim().min(1).max(255),
  system: z.string().trim().min(1).max(100),
  description: z.string().max(10000),
  status: z.enum(['pending', 'active', 'completed'])
};

export const createCampaignSchema = z.object({
  name: campaignFields.name,
  system: campaignFields.system.default('D&D 5e'),
  description: campaignFields.description.optional()
}).strict();

export const updateCampaignSchema = z.object(campaignFields)
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0);

export const addPlayerSchema = z.object({
  email: emailSchema
}).strict();

export const campaignIdSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const voiceTurnSchema = z.object({
  campaignId: z.coerce.number().int().positive(),
  turnId: z.uuid()
}).strict();

export const campaignCharacterSheetSchema = z.object({
  characterSheet: z.record(z.string(), z.unknown()).nullable()
}).strict();

export const narrativeResponseSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  newScene: z.boolean().optional(),
  imagePrompt: z.string().max(2000).optional(),
  characterSheet: z.record(z.string(), z.unknown()).nullable().optional(),
  diceRoll: z.object({
    type: z.enum(['d6', 'd20', 'd100']),
    count: z.number().int().positive().max(20).default(1)
  }).strict().nullable().optional()
});