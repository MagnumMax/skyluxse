"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Camera, Loader2, Trash2, Upload, X, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Task, TaskRequiredInput, TaskInputValue } from "@/lib/domain/entities"
import { submitTaskInputs, deleteTaskPhoto } from "@/app/(driver)/driver/tasks/actions"

const sanitizeLabel = (s: string) => s.replace(/\s*\((before|after)\)\s*$/i, "")
const formatSigned = (n: number) => (n > 0 ? `+${n}` : String(n))

interface DriverTaskFormProps {
  task: Task
  signedPhotoUrls?: Record<string, string[]>
  minOdometer?: number
  baselineOdometer?: number
  baselineFuel?: number
}

export function DriverTaskForm({ task, signedPhotoUrls, minOdometer, baselineOdometer, baselineFuel }: DriverTaskFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<Record<string, File[]>>({})
  const [previews, setPreviews] = useState<Record<string, string[]>>({})

  const inputs = task.requiredInputs ?? []
  const values = task.inputValues ?? []

  const isReadOnly = task.status === "done"

  if (inputs.length === 0) return null
  
  const getInputValue = (key: string) => values.find((v) => v.key === key)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    try {
      // Append pending files to formData
      Object.entries(pendingFiles).forEach(([key, files]) => {
        files.forEach((file) => {
          formData.append(key, file)
        })
      })

      const result = await submitTaskInputs(formData)
      if (result.success) {
        toast.success("Saved successfully")
        setPendingFiles({})
        // Optional: clear file inputs visually or handle optimistic updates
      } else {
        toast.error(result.message ?? "Failed to save")
      }
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSelect = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      
      // Create previews
      const newPreviews = newFiles.map(file => URL.createObjectURL(file))
      
      setPendingFiles((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), ...newFiles],
      }))
      setPreviews((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), ...newPreviews],
      }))
    }
  }

  const removePendingFile = (key: string, index: number) => {
    setPendingFiles((prev) => {
      const newFiles = [...(prev[key] || [])]
      newFiles.splice(index, 1)
      return { ...prev, [key]: newFiles }
    })
    setPreviews((prev) => {
        const current = prev[key] || []
        const toRemove = current[index]
        if (toRemove) URL.revokeObjectURL(toRemove)
        
        const newPreviews = [...current]
        newPreviews.splice(index, 1)
        return { ...prev, [key]: newPreviews }
    })
  }

  async function handleDeletePhoto(path: string) {
    if (!window.confirm("Are you sure you want to delete this file?")) return
    try {
      const result = await deleteTaskPhoto({ taskId: String(task.id), path, bucket: "task-media" })
      if (result.success) {
        toast.success("File deleted")
        window.location.reload()
      } else {
        toast.error(result.message ?? "Failed to delete")
      }
    } catch {
      toast.error("Failed to delete file")
    }
  }

  return (
    <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border bg-muted/30 pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Task Data
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form
          ref={formRef}
          action={handleSubmit}
          className="space-y-6"
        >
          <input type="hidden" name="taskId" value={String(task.id)} />

          {inputs.map((input) => {
            const normalizedKey = input.key.toLowerCase()
            const valueEntry = getInputValue(input.key)

            // Odometer
            if (normalizedKey.startsWith("odo") || normalizedKey === "odometer") {
              const currentOdo = valueEntry?.valueNumber ?? (valueEntry?.valueText ? Number(valueEntry.valueText) : undefined)
              
              return (
                <OdometerInput
                  key={input.key}
                  input={input}
                  defaultValue={currentOdo}
                  baselineOdometer={task.type === "pickup" ? baselineOdometer : undefined}
                  minOdometer={minOdometer}
                  disabled={isReadOnly}
                />
              )
            }

            // Fuel
            if (normalizedKey.startsWith("fuel") || normalizedKey === "fuel_level") {
              const currentValue = valueEntry?.valueNumber ?? valueEntry?.valueText
              // Default to 8 (Full) if not set
              const defaultValue = currentValue !== undefined && currentValue !== null ? Number(currentValue) : 8
              
              return (
                <FuelInput 
                  key={input.key} 
                  input={input} 
                  defaultValue={defaultValue} 
                  baseline={task.type === "pickup" ? baselineFuel : undefined} 
                  disabled={isReadOnly}
                />
              )
            }

            // Agreement Number
            if (normalizedKey.includes("agreement") && input.type !== "file") {
               const displayLabel = sanitizeLabel(input.label)
               return (
                <div key={input.key} className="space-y-2">
                  <Label htmlFor="agreementNumber">{displayLabel} {input.required && "*"}</Label>
                  <Input
                    id="agreementNumber"
                    name="agreementNumber"
                    placeholder="Enter agreement number"
                    defaultValue={valueEntry?.valueText ?? ""}
                    required={input.required}
                    disabled={isReadOnly}
                  />
                </div>
              )
            }

             // Notes
            if (normalizedKey.includes("note") || normalizedKey === "damage_notes") {
               const displayLabel = sanitizeLabel(input.label)
               return (
                <div key={input.key} className="space-y-2">
                  <Label htmlFor="notes">{displayLabel} {input.required && "*"}</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Add notes..."
                    defaultValue={valueEntry?.valueText ?? ""}
                    required={input.required}
                    className="min-h-[100px]"
                    disabled={isReadOnly}
                  />
                </div>
              )
            }

            // Files
            if (input.type === "file") {
               const savedPaths = valueEntry?.storagePaths ?? []
               const savedUrls = signedPhotoUrls?.[input.key] ?? []
               const pending = pendingFiles[input.key] || []
               const pendingPreviews = previews[input.key] || []
               const displayLabel = sanitizeLabel(input.label)

               return (
                <div key={input.key} className="space-y-3">
                  <Label>{displayLabel} {input.required && "*"}</Label>
                  
                  {/* Gallery Grid: Saved + Pending */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {/* Saved Files */}
                    {savedPaths.map((path, idx) => {
                        const url = savedUrls[idx]
                        const isPdf = path.toLowerCase().endsWith(".pdf")
                        
                        return (
                         <div key={`saved-${idx}`} className="relative group aspect-square rounded-md border border-border bg-muted overflow-hidden">
                           {url ? (
                               isPdf ? (
                                 <a 
                                   href={url} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="flex h-full w-full flex-col items-center justify-center p-2 text-muted-foreground hover:bg-muted/80"
                                 >
                                   <FileText className="h-8 w-8 mb-2" />
                                   <span className="text-[10px] text-center w-full truncate px-1">PDF Document</span>
                                 </a>
                               ) : (
                                 <a 
                                   href={url} 
                                   target="_blank" 
                                   rel="noopener noreferrer" 
                                   className="block h-full w-full cursor-zoom-in"
                                 >
                                   {/* eslint-disable-next-line @next/next/no-img-element */}
                                   <img src={url} alt={`Saved ${idx}`} className="h-full w-full object-cover" />
                                 </a>
                               )
                           ) : (
                               <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                 <Upload className="h-6 w-6" />
                               </div>
                           )}
                           {!isReadOnly && (
                             <button
                               type="button"
                               onClick={() => handleDeletePhoto(path)}
                               className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                             >
                               <Trash2 className="h-4 w-4" />
                             </button>
                           )}
                         </div>
                        )
                    })}

                    {/* Pending Files */}
                    {pending.map((file, idx) => {
                        const preview = pendingPreviews[idx]
                        const isPdf = file.type === "application/pdf"
                        
                        return (
                          <div key={`pending-${idx}`} className="relative group aspect-square rounded-md border border-border bg-muted overflow-hidden">
                             {preview ? (
                                 isPdf ? (
                                   <div className="flex h-full w-full flex-col items-center justify-center p-2 text-muted-foreground">
                                      <FileText className="h-8 w-8 mb-2" />
                                      <span className="text-[10px] text-center w-full truncate px-1">{file.name}</span>
                                   </div>
                                 ) : (
                                   // eslint-disable-next-line @next/next/no-img-element
                                   <img src={preview} alt={`Pending ${file.name}`} className="h-full w-full object-cover opacity-80" />
                                 )
                             ) : (
                                 <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    <span className="text-xs">{file.name}</span>
                                 </div>
                             )}
                             <div className="absolute inset-0 bg-black/10 pointer-events-none" /> {/* Overlay to indicate pending */}
                             {!isReadOnly && (
                               <button
                                 type="button"
                                 onClick={() => removePendingFile(input.key, idx)}
                                 className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                               >
                                 <X className="h-4 w-4" />
                               </button>
                             )}
                          </div>
                        )
                    })}

                    {/* Add Button */}
                    {!isReadOnly && (
                      <div 
                          className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-muted-foreground/50 bg-muted/20 hover:bg-muted/40"
                          onClick={() => document.getElementById(`file-${input.key}`)?.click()}
                      >
                          <Camera className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{input.multiple ? "Add" : "Upload"}</span>
                      </div>
                    )}
                  </div>

                  <Input
                    id={`file-${input.key}`}
                    type="file"
                    accept={input.accept ?? "image/*,.pdf"}
                    multiple={input.multiple}
                    className="hidden"
                    onChange={(e) => handleFileSelect(input.key, e)}
                    disabled={isReadOnly}
                  />
                </div>
              )
            }

            // Fallback for text inputs
            if (input.type === "text" || input.type === "number") {
               const displayLabel = sanitizeLabel(input.label)
               return (
                <div key={input.key} className="space-y-2">
                  <Label htmlFor={input.key}>{displayLabel} {input.required && "*"}</Label>
                  <Input
                    id={input.key}
                    name={input.key} // Warning: standard submitTaskInputs might not catch generic keys unless modified
                    type={input.type}
                    defaultValue={valueEntry?.valueText ?? valueEntry?.valueNumber ?? ""}
                    required={input.required}
                    disabled={isReadOnly}
                  />
                </div>
              )
            }

            return null
          })}

          <Button type="submit" className="w-full" disabled={isSubmitting || task.status === "done"}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {task.status === "done" ? "Completed" : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function FuelInput({ input, defaultValue, baseline, disabled }: { input: TaskRequiredInput, defaultValue?: number, baseline?: number, disabled?: boolean }) {
  const [value, setValue] = useState(defaultValue ?? 8)
  const label = sanitizeLabel(input.label)
  const delta = baseline !== undefined ? value - baseline : undefined

  const getLabel = (v: number) => {
    if (baseline !== undefined && delta !== undefined) {
      return delta === 0 ? "Δ 0" : `Δ ${delta > 0 ? `+${delta}` : delta}`
    }

    if (v === 8) return "Full (8/8)"
    if (v === 6) return "3/4 (6/8)"
    if (v === 4) return "1/2 (4/8)"
    if (v === 2) return "1/4 (2/8)"
    if (v === 0) return "Empty (0/8)"
    return `${v}/8`
  }

  const percentage = (value / 8) * 100
  const activeColor = disabled ? "var(--muted-foreground)" : "var(--primary)"

  return (
    <div className={cn("space-y-3", disabled && "opacity-60 pointer-events-none")}>
      <div className="flex items-center justify-between">
        <Label htmlFor="fuel">{label} {input.required && "*"}</Label>
        <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-right">
            {getLabel(value)}
        </span>
      </div>
      <div className="relative flex items-center w-full touch-none select-none py-2">
          <input
            id="fuel"
            name="fuel"
            type="range"
            min="0"
            max="8"
            step="1"
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, ${activeColor} ${percentage}%, var(--secondary) ${percentage}%)`
            }}
          />
      </div>
       <div className="flex justify-between px-1 text-[10px] text-muted-foreground">
        <span className="w-4 text-center">E</span>
        <span className="w-4 text-center">·</span>
        <span className="w-4 text-center">1/4</span>
        <span className="w-4 text-center">·</span>
        <span className="w-4 text-center">1/2</span>
        <span className="w-4 text-center">·</span>
        <span className="w-4 text-center">3/4</span>
        <span className="w-4 text-center">·</span>
        <span className="w-4 text-center">F</span>
      </div>
    </div>
  )
}

function OdometerInput({
  input,
  defaultValue,
  baselineOdometer,
  minOdometer,
  disabled
}: {
  input: TaskRequiredInput
  defaultValue?: number
  baselineOdometer?: number
  minOdometer?: number
  disabled?: boolean
}) {
  const [value, setValue] = useState<number | undefined>(defaultValue)
  const displayLabel = sanitizeLabel(input.label)
  
  const deltaOdo = baselineOdometer !== undefined && value !== undefined
    ? value - baselineOdometer
    : undefined

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="odometer">
          {displayLabel}
          {baselineOdometer !== undefined ? (
            <span className="text-muted-foreground font-normal"> (on delivery {baselineOdometer.toLocaleString()})</span>
          ) : minOdometer ? (
            <span className="text-muted-foreground font-normal"> (min {minOdometer.toLocaleString()})</span>
          ) : (
            ""
          )}
          {input.required && "*"}
        </Label>
        {baselineOdometer !== undefined && (
          <span className="text-xs text-muted-foreground">
            {deltaOdo !== undefined
              ? `Δ ${formatSigned(deltaOdo)}`
              : `Delivery ${baselineOdometer.toLocaleString()}`}
          </span>
        )}
      </div>
      <Input
        id="odometer"
        name="odometer"
        type="number"
        min={minOdometer}
        placeholder="Enter odometer reading"
        defaultValue={defaultValue}
        required={input.required}
        disabled={disabled}
        onChange={(e) => {
          const val = e.target.value === "" ? undefined : Number(e.target.value)
          setValue(val)
        }}
      />
    </div>
  )
}
