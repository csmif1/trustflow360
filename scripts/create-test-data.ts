#!/usr/bin/env -S deno run --allow-env --allow-net

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = "https://fnivqabphgbmkzpwowwg.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseServiceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set");
  console.error("   Get it from: https://supabase.com/dashboard/project/fnivqabphgbmkzpwowwg/settings/api");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🚀 Creating test data for TrustFlow360...\n");

// Get the user ID - either from argument or query
const args = Deno.args;
let userId: string | null = null;

if (args.length > 0) {
  userId = args[0];
  console.log(`📝 Using provided user_id: ${userId}`);
} else {
  console.log("📝 No user_id provided, querying for users...");

  // Get first user from auth.users
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();

  if (userError || !users || users.users.length === 0) {
    console.error("❌ No users found. Please provide user_id as argument:");
    console.error("   deno run --allow-env --allow-net scripts/create-test-data.ts <user_id>");
    Deno.exit(1);
  }

  userId = users.users[0].id;
  console.log(`📝 Using first available user: ${userId}`);
  console.log(`   Email: ${users.users[0].email}\n`);
}

try {
  // 1. Create Test Trust
  console.log("1️⃣ Creating test trust...");
  const { data: trust, error: trustError } = await supabase
    .from("trusts")
    .insert({
      user_id: userId,
      trust_name: "Test Family ILIT",
      grantor_name: "Robert Test",
      grantor_email: "chris@ssgrowthadvisors.com",
      trustee_name: "Professional Trustee Services LLC",
      trust_type: "ILIT",
      status: "active",
    })
    .select()
    .single();

  if (trustError) throw trustError;
  console.log(`   ✅ Trust created: ${trust.id}`);
  console.log(`      Name: ${trust.trust_name}\n`);

  // 2. Create Beneficiaries
  console.log("2️⃣ Creating beneficiaries...");
  const { data: beneficiaries, error: benError } = await supabase
    .from("beneficiaries")
    .insert([
      {
        trust_id: trust.id,
        name: "John Test",
        relationship: "Child",
        email: "john.test@example.com",
      },
      {
        trust_id: trust.id,
        name: "Jane Test",
        relationship: "Child",
        email: "jane.test@example.com",
      },
    ])
    .select();

  if (benError) throw benError;
  console.log(`   ✅ Beneficiary 1: ${beneficiaries[0].id} (John Test)`);
  console.log(`   ✅ Beneficiary 2: ${beneficiaries[1].id} (Jane Test)\n`);

  // 3. Create Test Policy (due in 45 days)
  console.log("3️⃣ Creating insurance policy...");
  const premiumDueDate = new Date();
  premiumDueDate.setDate(premiumDueDate.getDate() + 45);
  const premiumDueDateStr = premiumDueDate.toISOString().split("T")[0];

  const policyNumber = `TEST-POL-${Math.floor(Math.random() * 1000000)}`;

  const { data: policy, error: policyError } = await supabase
    .from("insurance_policies")
    .insert({
      user_id: userId,
      trust_id: trust.id,
      policy_number: policyNumber,
      carrier_name: "Test Insurance Company",
      death_benefit: 500000,
      annual_premium: 2000,
      premium_due_date: premiumDueDateStr,
      next_premium_due: premiumDueDateStr,
      policy_status: "active",
    })
    .select()
    .single();

  if (policyError) throw policyError;
  console.log(`   ✅ Policy created: ${policy.id}`);
  console.log(`      Policy #: ${policy.policy_number}`);
  console.log(`      Death Benefit: $${policy.death_benefit.toLocaleString()}`);
  console.log(`      Annual Premium: $${policy.annual_premium.toLocaleString()}`);
  console.log(`      Due Date: ${policy.premium_due_date} (45 days from now)\n`);

  // Summary
  console.log("═══════════════════════════════════════════════════════");
  console.log("✅ TEST DATA CREATED SUCCESSFULLY");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`User ID:         ${userId}`);
  console.log(`Trust ID:        ${trust.id}`);
  console.log(`Trust Name:      ${trust.trust_name}`);
  console.log(`Grantor:         ${trust.grantor_name} <${trust.grantor_email}>`);
  console.log(`Beneficiary 1:   ${beneficiaries[0].id} (John Test)`);
  console.log(`Beneficiary 2:   ${beneficiaries[1].id} (Jane Test)`);
  console.log(`Policy ID:       ${policy.id}`);
  console.log(`Policy Number:   ${policy.policy_number}`);
  console.log(`Death Benefit:   $500,000`);
  console.log(`Annual Premium:  $2,000`);
  console.log(`Premium Due:     ${policy.premium_due_date}`);
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n📋 Copy these IDs for testing:");
  console.log(`   TRUST_ID="${trust.id}"`);
  console.log(`   POLICY_ID="${policy.id}"`);
  console.log(`   BEN1_ID="${beneficiaries[0].id}"`);
  console.log(`   BEN2_ID="${beneficiaries[1].id}"`);

} catch (error) {
  console.error("\n❌ Error creating test data:");
  console.error(error);
  Deno.exit(1);
}
