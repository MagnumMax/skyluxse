"use server"

import { revalidatePath } from "next/cache"
import { serviceClient } from "@/lib/supabase/service-client"
import type { KommoStageConfig } from "@/lib/domain/entities"

export async function getKommoStages() {
  const { data, error } = await serviceClient
    .from("kommo_pipeline_stages")
    .select("*")
    .order("order_index", { ascending: true })

  if (error) {
    console.error("Error fetching Kommo stages:", error)
    return []
  }

  return data as KommoStageConfig[]
}

export async function updateKommoStage(
  id: string, 
  updates: { 
    label?: string; 
    description?: string; 
    header_color?: string; 
    border_color?: string 
  }
) {
  const { error } = await serviceClient
    .from("kommo_pipeline_stages")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)

  if (error) {
    throw new Error(`Failed to update stage: ${error.message}`)
  }

  revalidatePath("/exec/integrations")
  revalidatePath("/bookings")
}
