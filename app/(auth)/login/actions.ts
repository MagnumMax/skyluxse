"use server"

import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { serviceClient } from "@/lib/supabase/service-client"

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  // 1. Authenticate using a fresh client (to avoid side effects on serviceClient)
  // We use the anon/publishable key for auth typically
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  const authClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })

  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    return { error: "Invalid credentials" }
  }

  // 2. Fetch user role from staff_accounts using serviceClient (bypassing RLS)
  const { data: staffData, error: staffError } = await serviceClient
    .from("staff_accounts")
    .select("role")
    .eq("id", authData.user.id)
    .single()

  if (staffError || !staffData) {
    console.error("Login successful but no staff account found", staffError)
    return { error: "Account not configured properly" }
  }

  const role = staffData.role

  // 3. Set cookies
  const cookieStore = await cookies()
  
  // Set the role cookie (used by layout)
  cookieStore.set("skyluxse_role", role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  })

  // If driver, set the driver email cookie (legacy support)
  if (role === "driver") {
    cookieStore.set("skyluxse_driver_email", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
  }

  // 4. Return session tokens to allow client to set Supabase browser session
  const tokens = authData.session
    ? {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      }
    : null

  return { success: true, role, session: tokens }
}

export async function loginAsDriver(email: string) {
  const cookieStore = await cookies()
  cookieStore.set("skyluxse_driver_email", email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  })
}

export async function loginAsRole(role: string) {
  const cookieStore = await cookies()
  cookieStore.set("skyluxse_role", role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  })
}
