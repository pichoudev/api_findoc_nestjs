
// ============================================================
// WASO — prisma.config.ts
// Prisma 6+ — avec url obligatoire pour migrate
// ============================================================

import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',

  datasource: {
    url: process.env.DATABASE_URL!,
  },
})