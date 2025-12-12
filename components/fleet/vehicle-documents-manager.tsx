"use client"

import { useRef, useState } from "react"
import type { VehicleDocument } from "@/lib/domain/entities"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"

type VehicleDocumentsManagerProps = {
  vehicleId: string
  documents: VehicleDocument[]
}

const docTypeOptions = ["insurance", "mulkiya", "registration", "other"] as const

export function VehicleDocumentsManager({ vehicleId, documents }: VehicleDocumentsManagerProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<VehicleDocument[]>(documents)
  const [docType, setDocType] = useState<(typeof docTypeOptions)[number]>("insurance")
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState<string>("Choose file")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleUpload = async (selectedFile: File | null) => {
    if (!selectedFile) {
      toast({ title: "No file selected", variant: "destructive" })
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("doc_type", docType)
    const response = await fetch(`/api/fleet/vehicles/${vehicleId}/documents`, {
      method: "POST",
      body: formData,
    })

    setUploading(false)

    if (!response.ok) {
      const message = await readError(response)
      toast({ title: "Failed to upload document", description: message ?? undefined, variant: "destructive" })
      return
    }

    const { document } = (await response.json()) as { document: VehicleDocument }
    setItems((prev) => [...prev, document])
    toast({ title: "Document added", variant: "success" })
    setFileName("Choose file")
    setDocType("insurance")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDelete = async (documentId: string) => {
    const prevItems = items
    setItems((current) => current.filter((doc) => doc.id !== documentId))

    const response = await fetch(`/api/fleet/vehicles/${vehicleId}/documents/${documentId}`, { method: "DELETE" })
    if (!response.ok) {
      const message = await readError(response)
      toast({
        title: "Failed to delete document",
        description: message ?? undefined,
        variant: "destructive",
      })
      setItems(prevItems)
      return
    }
    toast({ title: "Document deleted", variant: "success" })
  }

  return (
    <Card className="rounded-[28px] border-border/60 bg-muted/70">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">Documents upload</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Already uploaded</p>
          <div className="space-y-3">
            {items.filter((doc) => doc.type !== "gallery" && doc.type !== "photo").length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-card/80 px-3 py-2 text-sm text-muted-foreground">
                No documents
              </div>
            ) : (
              items
                .filter((doc) => doc.type !== "gallery" && doc.type !== "photo")
                .map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card/80 px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{doc.name ?? doc.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {labelize(doc.type)} · {doc.status ?? "uploaded"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Open
                      </a>
                    ) : null}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Document</p>
          <div className="grid gap-3 md:grid-cols-[1.3fr_1fr] md:items-end">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Document type *</Label>
              <Select value={docType} onValueChange={(value) => setDocType(value as (typeof docTypeOptions)[number])}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Not selected" />
                </SelectTrigger>
                <SelectContent>
                  {docTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {labelize(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">File *</Label>
              <label className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/30 px-4 py-3 text-sm font-semibold text-foreground hover:border-primary">
                <span className="truncate">{fileName}</span>
                <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Choose file
                </Button>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null
                    setFileName(nextFile ? nextFile.name : "Choose file")
                    void handleUpload(nextFile)
                  }}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Maximum size — 10 MB per file.</p>
            {uploading ? <span className="text-xs text-muted-foreground">Uploading...</span> : null}
          </div>
        </section>
      </CardContent>
    </Card>
  )
}

function labelize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ")
}

async function readError(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { error?: string }
    return data.error ?? null
  } catch {
    return null
  }
}
