import { z } from 'zod';

/** Publish input schemas using Zod's native, draft-7 JSON Schema converter. */
export const jsonSchema = schema => z.toJSONSchema(schema, { target: 'draft-7', io: 'input' });
