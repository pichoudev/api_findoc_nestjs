
// ============================================================
// WASO — prisma.config.ts
// Prisma 7+ — configuration pour Supabase
// ============================================================

import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
   // url: process.env.DATABASE_URL!,
    url: env('DIRECT_URL'),
  },
})