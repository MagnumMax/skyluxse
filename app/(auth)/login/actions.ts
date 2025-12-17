"use server"

import { cookies } from "next/headers"

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
