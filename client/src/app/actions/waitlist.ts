"use server";

import { createClient } from '@supabase/supabase-js';

// 1. Initialize Supabase strictly on the server using the Service Key
// This bypasses RLS safely because it's a server-to-server call.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function submitToWaitlist(email: string) {
  try {
    // 2. Validate input
    if (!email || !email.includes('@')) {
      return { success: false, error: "Invalid email signature." };
    }

    // 3. Insert into the Vault
    const { error } = await supabase
      .from('waitlist_leads')
      .insert([{ email }]);

    if (error) {
      // Handle Postgres unique constraint error (User already signed up)
      if (error.code === '23505') {
        return { success: true, message: "Clearance already pending for this signature." };
      }
      console.error("Waitlist DB Error:", error);
      return { success: false, error: "Vault link failed. Try again later." };
    }

    return { success: true };
  } catch (error) {
    console.error("Waitlist Action Error:", error);
    return { success: false, error: "Internal server anomaly." };
  }
}
