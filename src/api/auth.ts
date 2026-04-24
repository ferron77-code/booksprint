import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { sendEmail } from "@runablehq/website-runtime/server";
import * as schema from "./database/schema";

export const createAuth = (baseURL: string) => {
  const db = drizzle(env.DB, { schema });
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
      usePlural: true,
    }),
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ url, user }) => {
        const runableUrl = (env as any).RUNABLE_URL || "";
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset Your Password</title></head>
<body style="margin:0;padding:0;background:#0e0e0e;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="margin-bottom:32px;">
      <span style="background:#e85d26;color:#fff;font-weight:700;font-size:18px;padding:8px 16px;letter-spacing:2px;display:inline-block;">BOOKSPRINT</span>
      <p style="color:#a09890;font-size:12px;margin:4px 0 0 0;text-transform:uppercase;letter-spacing:1px;">by Into All The World Digital Products</p>
    </div>
    <div style="background:#161616;border:1px solid #2a2a2a;padding:32px;margin-bottom:24px;">
      <h1 style="color:#f5f0eb;font-size:24px;font-weight:700;margin:0 0 12px 0;">Reset your password</h1>
      <p style="color:#a09890;margin:0 0 24px 0;">Hi ${user.email}, click the button below to set a new password. This link expires in 1 hour.</p>
      <a href="${url}" style="display:inline-block;background:#e85d26;color:#fff;text-decoration:none;padding:14px 28px;font-weight:700;font-size:14px;letter-spacing:0.5px;">
        Reset Password
      </a>
      <p style="color:#a09890;font-size:12px;margin:20px 0 0 0;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div style="border-top:1px solid #2a2a2a;padding-top:20px;">
      <p style="color:#a09890;font-size:12px;margin:0;">Into All The World Digital Products — AI-Powered Digital Publishing</p>
    </div>
  </div>
</body>
</html>`;
        await sendEmail({
          url: runableUrl,
          to: user.email,
          subject: "Reset your BookSprint password",
          html,
        });
      },
    },
    secret: env.BETTER_AUTH_SECRET || "booksprint-secret-key-dev",
    baseURL,
    trustedOrigins: async (request) => {
      const origin = request?.headers.get("origin");
      if (origin) return [origin];
      return [];
    },
  });
};

export const auth = createAuth("http://localhost:6997");
