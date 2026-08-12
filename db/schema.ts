import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ritualStats = sqliteTable("ritual_stats", {
  ritual: text("ritual").primaryKey(),
  choices: integer("choices").notNull().default(0),
  successes: integer("successes").notNull().default(0),
});
