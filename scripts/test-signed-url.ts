
import { createSignedUrl } from "@/lib/storage/signed-url"

async function main() {
  const bucket = "task-media"
  const path = "4cac4934-ac00-46ab-9090-706474d02141/1765732386773-photo_2025-12-14 20.00.35.jpeg"
  
  console.log("Attempting to sign URL for:", { bucket, path })
  
  try {
    const url = await createSignedUrl(bucket, path)
    console.log("Result URL:", url)
  } catch (error) {
    console.error("Error:", error)
  }
}

main()
