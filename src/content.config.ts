import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const chapters = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/chapters' }),
  schema: z.object({
    title: z.string(),
    chapter: z.number(),
    description: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { chapters };
