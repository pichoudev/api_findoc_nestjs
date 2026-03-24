
// ============================================================
// WASO — prisma.config.ts
// Prisma 6+ — avec url obligatoire pour migrate
// ============================================================

// import 'dotenv/config'
// import { defineConfig } from 'prisma/config'

// export default defineConfig({
//   schema: 'prisma/schema.prisma',

//   datasource: {
//     url: process.env.DATABASE_URL!,
//   },
// })

// prisma.config.js
require('dotenv/config');
const { defineConfig, env } = require('prisma/config');

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_URL'),
  },
});
