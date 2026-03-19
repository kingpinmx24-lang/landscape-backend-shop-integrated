import {
  integer,
  varchar,
  text,
  timestamp,
  jsonb,
  pgEnum,
  pgTable,
  decimal,
  index,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * ============================================================================
 * ENUMS
 * ============================================================================
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const inventoryTypeEnum = pgEnum("inventory_type", ["flowering", "shrub", "tree", "groundcover", "decorative"]);
export const projectStatusEnum = pgEnum("project_status", ["draft", "active", "completed", "archived"]);
export const quotationStatusEnum = pgEnum("quotation_status", ["draft", "sent", "accepted", "rejected", "completed"]);

/**
 * ============================================================================
 * CORE TABLES
 * ============================================================================
 */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: roleEnum("role").default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({
    openIdIdx: index("users_openId_idx").on(table.openId),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const inventory = pgTable(
  "inventory",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: inventoryTypeEnum("type").notNull(),
    imageUrl: text("imageUrl").notNull(),
    purchasePrice: decimal("purchasePrice", { precision: 12, scale: 2 }).notNull(),
    sellingPrice: decimal("sellingPrice", { precision: 12, scale: 2 }).notNull(),
    stock: integer("stock").notNull().default(0),
    region: varchar("region", { length: 255 }),
    climate: varchar("climate", { length: 255 }),
    adultSize: jsonb("adultSize"), // { height, width }
    spacing: decimal("spacing", { precision: 5, scale: 2 }).notNull().default("1.00"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index("inventory_type_idx").on(table.type),
  })
);

export type InventoryItem = typeof inventory.$inferSelect;
export type InsertInventoryItem = typeof inventory.$inferInsert;

export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    terrain: jsonb("terrain").notNull(),
    status: projectStatusEnum("status").default("draft").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("projects_userId_idx").on(table.userId),
    userStatusIdx: index("projects_userId_status_idx").on(table.userId, table.status),
  })
);

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const plants = pgTable(
  "plants",
  {
    id: serial("id").primaryKey(),
    projectId: integer("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    inventoryId: integer("inventoryId")
      .references(() => inventory.id),
    name: varchar("name", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    position: jsonb("position").notNull(),
    metadata: jsonb("metadata").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("plants_projectId_idx").on(table.projectId),
  })
);

export type Plant = typeof plants.$inferSelect;
export type InsertPlant = typeof plants.$inferInsert;

export const measurements = pgTable(
  "measurements",
  {
    id: serial("id").primaryKey(),
    projectId: integer("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    data: jsonb("data").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("measurements_projectId_idx").on(table.projectId),
  })
);

export type Measurement = typeof measurements.$inferSelect;
export type InsertMeasurement = typeof measurements.$inferInsert;

export const quotations = pgTable(
  "quotations",
  {
    id: serial("id").primaryKey(),
    projectId: integer("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    totalCost: decimal("totalCost", { precision: 12, scale: 2 }).notNull(),
    items: jsonb("items").notNull(),
    status: quotationStatusEnum("status").default("draft").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("quotations_projectId_idx").on(table.projectId),
  })
);

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

/**
 * ============================================================================
 * RELATIONS
 * ============================================================================
 */

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const inventoryRelations = relations(inventory, ({ many }) => ({
  plants: many(plants),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  plants: many(plants),
  measurements: many(measurements),
  quotations: many(quotations),
}));

export const plantsRelations = relations(plants, ({ one }) => ({
  project: one(projects, {
    fields: [plants.projectId],
    references: [projects.id],
  }),
  inventoryItem: one(inventory, {
    fields: [plants.inventoryId],
    references: [inventory.id],
  }),
}));

export const measurementsRelations = relations(measurements, ({ one }) => ({
  project: one(projects, {
    fields: [measurements.projectId],
    references: [projects.id],
  }),
}));

export const quotationsRelations = relations(quotations, ({ one }) => ({
  project: one(projects, {
    fields: [quotations.projectId],
    references: [projects.id],
  }),
}));
