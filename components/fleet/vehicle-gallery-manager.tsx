"use client"

import Image from "next/image"
import { useRef, useState } from "react"

import type { VehicleDocument } from "@/lib/domain/entities"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"

type VehicleGalleryManagerProps = {
  vehicleId: string
  documents: VehicleDocument[]
}

type PendingUpload = {
  id: string
  name: string
}

export function VehicleGalleryManager({ vehicleId, documents }: VehicleGalleryManagerProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<VehicleDocument[]>(documents.filter((doc) => doc.type === "gallery" || doc.type === "photo"))
  const [uploading, setUploading] = useState(false)
  const [filesLabel, setFilesLabel] = useState("Choose files")
  const [pending, setPending] = useState<PendingUpload[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    const files = Array.from(fileList)
    const timestamp = Date.now()
    setPending((prev) => [...prev, ...files.map((file, index) => ({ id: `pending-${timestamp}-${index}`, name: file.name }))])
    await Promise.all(
      files.map(async (file, index) => {
        const tempUrl = URL.createObjectURL(file)
        const tempId = `temp-${timestamp}-${index}`
        const tempDoc: VehicleDocument = {
          id: tempId,
          type: "gallery",
          name: file.name,
          status: "uploading",
          url: tempUrl,
        }
        setItems((prev) => [...prev, tempDoc])

        const formData = new FormData()
        formData.append("file", file)
        formData.append("doc_type", "gallery")
        const response = await fetch(`/api/fleet/vehicles/${vehicleId}/documents`, { method: "POST", body: formData })
        if (!response.ok) {
          const msg = await readError(response)
          toast({ title: `Failed to upload ${file.name}`, description: msg ?? undefined, variant: "destructive" })
          URL.revokeObjectURL(tempUrl)
          setItems((prev) => prev.filter((doc) => doc.id !== tempId))
          setPending((prev) => prev.filter((p) => p.id !== `pending-${timestamp}-${index}`))
          return
        }
        const { document } = (await response.json()) as { document: VehicleDocument }
        URL.revokeObjectURL(tempUrl)
        setItems((prev) =>
          prev.map((doc) => (doc.id === tempId ? { ...document, status: "uploaded" } : doc))
        )
        setPending((prev) => prev.filter((p) => p.id !== `pending-${timestamp}-${index}`))
      })
    )
    toast({ title: "Photos added", variant: "success" })
    setFilesLabel("Choose files")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setUploading(false)
  }

  const handleDelete = async (doc: VehicleDocument) => {
    setItems((prev) => prev.filter((item) => item.id !== doc.id))
    const response = await fetch(`/api/fleet/vehicles/${vehicleId}/documents/${doc.id}`, { method: "DELETE" })
    if (!response.ok) {
      const message = await readError(response)
      toast({ title: "Failed to delete photo", description: message ?? undefined, variant: "destructive" })
      setItems((prev) => [...prev, doc])
      return
    }
    toast({ title: "Photo deleted", variant: "success" })
  }

  const handleSetHero = async (doc: VehicleDocument) => {
    if (!doc.bucket || !doc.storagePath) return
    const response = await fetch(`/api/fleet/vehicles/${vehicleId}/image`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket: doc.bucket, storagePath: doc.storagePath }),
    })
    if (!response.ok) {
      const message = await readError(response)
      toast({ title: "Failed to set as main", description: message ?? undefined, variant: "destructive" })
      return
    }
    toast({ title: "Main photo updated", variant: "success" })
  }

  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Photos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
              Gallery is empty
            </div>
          ) : (
            items.map((doc) => (
              <div key={doc.id} className="group relative h-40 overflow-hidden rounded-2xl border border-border/60 bg-muted/40">
                {doc.url ? (
                  <Image
                    src={doc.url}
                    alt={doc.name ?? "Photo"}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No preview</div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/60 px-3 py-2 text-xs text-white opacity-0 transition group-hover:opacity-100">
                  <span className="truncate">{doc.name ?? "Photo"}</span>
                  <div className="flex gap-2">
                    {doc.bucket && doc.storagePath ? (
                      <button className="underline" onClick={() => handleSetHero(doc)}>
                        Make main
                      </button>
                    ) : null}
                    <button className="underline" onClick={() => handleDelete(doc)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="space-y-2">
          <label className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/30 px-4 py-3 text-sm font-semibold text-foreground hover:border-primary">
            <span>{filesLabel}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Uploading..." : "Choose files"}
            </Button>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={(event) => {
                const files = event.target.files
                const label = files && files.length > 0 ? Array.from(files).map((f) => f.name).join(", ") : "Choose files"
                setFilesLabel(label)
                void handleUpload(files)
              }}
            />
          </label>
          <p className="text-xs text-muted-foreground">Images supported, up to 10 MB each.</p>
          {pending.length ? (
            <p className="text-xs text-muted-foreground">
              Uploading: {pending.map((p) => p.name).join(", ")}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

async function readError(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { error?: string }
    return data.error ?? null
  } catch {
    return null
  }
}
