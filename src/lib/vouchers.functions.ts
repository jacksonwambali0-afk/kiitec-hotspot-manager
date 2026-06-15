import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { randomCode } from "@/lib/voucher-utils";

const generateSchema = z.object({
  packageId: z.string().uuid(),
  quantity: z.number().int().min(1).max(500),
  prefix: z
    .string()
    .trim()
    .max(8)
    .regex(/^[A-Za-z0-9-]*$/, "Prefix may only contain letters, numbers and dashes")
    .optional()
    .default(""),
  note: z.string().trim().max(200).optional().default(""),
});

/**
 * Generate a batch of vouchers for a package.
 * Runs as the signed-in user (RLS enforced); only admins/cashiers may insert.
 */
export const generateVouchers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => generateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isStaff } = await supabase.rpc("is_sales_staff", { _user_id: userId });
    if (!isStaff) throw new Error("You do not have permission to generate vouchers.");

    const { data: pkg, error: pkgError } = await supabase
      .from("packages")
      .select("id, price, name, is_active")
      .eq("id", data.packageId)
      .maybeSingle();
    if (pkgError) throw pkgError;
    if (!pkg) throw new Error("Package not found.");

    // Create the batch record first.
    const { data: batch, error: batchError } = await supabase
      .from("voucher_batches")
      .insert({
        package_id: pkg.id,
        quantity: data.quantity,
        prefix: data.prefix || null,
        note: data.note || null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (batchError) throw batchError;

    const prefix = data.prefix ? `${data.prefix}-` : "";
    const seen = new Set<string>();
    const rows: {
      code: string;
      username: string;
      password: string;
      package_id: string;
      batch_id: string;
      price: number;
      created_by: string;
    }[] = [];

    while (rows.length < data.quantity) {
      const code = `${prefix}${randomCode(8)}`;
      if (seen.has(code)) continue;
      seen.add(code);
      rows.push({
        code,
        username: code,
        password: code,
        package_id: pkg.id,
        batch_id: batch.id,
        price: Number(pkg.price),
        created_by: userId,
      });
    }

    // Insert in chunks; retry codes that collide with existing rows.
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error: insertError, count } = await supabase
        .from("vouchers")
        .insert(chunk, { count: "exact" });
      if (insertError) {
        // Roll back the empty batch if nothing inserted at all.
        if (inserted === 0) await supabase.from("voucher_batches").delete().eq("id", batch.id);
        throw insertError;
      }
      inserted += count ?? chunk.length;
    }

    return { batchId: batch.id, count: inserted, packageName: pkg.name };
  });
