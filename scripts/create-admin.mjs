/**
 * Create (or promote) a CMS administrator.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
 *     npm run admin:create -- you@example.org "a-long-unique-password"
 *
 * Without a password, Supabase emails an invitation link instead.
 * Run this from your own machine only. Never expose the service-role key.
 */
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first (e.g. in .env.local, then: node --env-file=.env.local scripts/create-admin.mjs …).");
  process.exit(1);
}
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run admin:create -- you@example.org ["password"]');
  process.exit(1);
}
if (password && password.length < 12) {
  console.error("Use a password of at least 12 characters.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUser(address) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === address.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

let user = await findUser(email);
if (!user) {
  const res = password
    ? await db.auth.admin.createUser({ email, password, email_confirm: true })
    : await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/admin/auth/callback` });
  if (res.error) {
    console.error("Could not create the user:", res.error.message);
    process.exit(1);
  }
  user = res.data.user;
  console.log(password ? `Created user ${email}.` : `Invitation email sent to ${email}.`);
} else if (password) {
  const { error } = await db.auth.admin.updateUserById(user.id, { password });
  if (error) {
    console.error("Could not set the password:", error.message);
    process.exit(1);
  }
  console.log(`Updated the password for ${email}.`);
}

const { error } = await db.from("profiles").upsert({ id: user.id, email, role: "admin" });
if (error) {
  console.error("Could not grant administrator access:", error.message, "\nHave you run the migrations?");
  process.exit(1);
}
console.log(`✓ ${email} is now a VoltageAfrica CMS administrator. Sign in at /admin.`);
