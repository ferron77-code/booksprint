import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  role: text("role", { enum: ["buyer", "seller", "admin"] }).notNull().default("buyer"),
  tokenBalance: integer("token_balance").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  keyword: text("keyword").notNull(),
  price: real("price").notNull().default(0),
  coverUrl: text("cover_url"),
  pdfUrl: text("pdf_url"),
  valueEnhancerUrl: text("value_enhancer_url"),
  status: text("status", { enum: ["draft", "generating", "published", "unpublished"] }).notNull().default("draft"),
  category: text("category"),
  salesCount: integer("sales_count").notNull().default(0),
  offer: text("offer"),
  outline: text("outline"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  buyerId: text("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookId: text("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  sellerId: text("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  stripeSessionId: text("stripe_session_id"),
  status: text("status", { enum: ["pending", "completed", "refunded"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const generationJobs = sqliteTable("generation_jobs", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] }).notNull().default("pending"),
  currentStep: text("current_step"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  tier: text("tier", { enum: ["starter", "creator", "pro", "enterprise"] }).notNull().default("starter"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  monthlyBookLimit: integer("monthly_book_limit").notNull().default(5),
  booksGeneratedThisMonth: integer("books_generated_this_month").notNull().default(0),
  monthlyTokenAllowance: integer("monthly_token_allowance").notNull().default(150000),
  tokensUsedThisMonth: integer("tokens_used_this_month").notNull().default(0),
  monthResetDate: integer("month_reset_date", { mode: "timestamp" }),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const tokenPackages = sqliteTable("token_packages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tokens: integer("tokens").notNull(),
  priceInCents: integer("price_in_cents").notNull(),
  stripeProductId: text("stripe_product_id"),
});

export const tokenTransactions = sqliteTable("token_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: text("type", { enum: ["purchase", "generation", "refund"] }).notNull(),
  description: text("description"),
  stripeSessionId: text("stripe_session_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
