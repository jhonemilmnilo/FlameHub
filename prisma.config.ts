import dotenv from "dotenv";
import { defineConfig } from "@prisma/config";

dotenv.config({ path: ".env.local" });
dotenv.config();

// Use pooled database url (Port 6543 / Session mode) for networks with IPv6 issues
const url = process.env.DATABASE_URL || process.env.DIRECT_URL || "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: url,
  },
});
