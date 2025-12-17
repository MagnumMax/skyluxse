"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Pencil, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { updateKommoStage } from "@/app/actions/kommo-stages"
import type { KommoStageConfig } from "@/lib/domain/entities"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const stageSchema = z.object({
  label: z.string().min(1, "Label is required"),
  description: z.string().optional(),
  header_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  border_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
})

type StageFormValues = z.infer<typeof stageSchema>

interface KommoStagesManagerProps {
  initialStages: KommoStageConfig[]
}

export function KommoStagesManager({ initialStages }: KommoStagesManagerProps) {
  const [stages, setStages] = useState<KommoStageConfig[]>(initialStages)
  const [isOpen, setIsOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<KommoStageConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<StageFormValues>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      label: "",
      description: "",
      header_color: "#ffffff",
      border_color: "#e5e7eb",
    },
  })

  const openEdit = (stage: KommoStageConfig) => {
    setEditingStage(stage)
    form.reset({
      label: stage.label,
      description: stage.description || "",
      header_color: stage.header_color || "#ffffff",
      border_color: stage.border_color || "#e5e7eb",
    })
    setIsOpen(true)
  }

  const onSubmit = async (data: StageFormValues) => {
    if (!editingStage) return

    setIsLoading(true)
    try {
      await updateKommoStage(editingStage.id, data)
      setStages(stages.map((s) => (s.id === editingStage.id ? { ...s, ...data } : s)))
      toast.success("Stage updated")
      setIsOpen(false)
      setEditingStage(null)
    } catch (error) {
      toast.error("Failed to save stage")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kommo Pipeline Stages</CardTitle>
        <CardDescription>Manage display names and colors for Kommo stages.</CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Stage: {editingStage?.id}</DialogTitle>
              <DialogDescription>
                Customize how this stage appears in Skylux.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="header_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Header Color</FormLabel>
                        <div className="flex gap-2">
                            <FormControl>
                                <Input {...field} type="color" className="w-12 p-1 h-9" />
                            </FormControl>
                            <Input {...field} placeholder="#RRGGBB" />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="border_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Border Color</FormLabel>
                        <div className="flex gap-2">
                            <FormControl>
                                <Input {...field} type="color" className="w-12 p-1 h-9" />
                            </FormControl>
                            <Input {...field} placeholder="#RRGGBB" />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stage ID</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stages.map((stage) => (
              <TableRow key={stage.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{stage.id}</TableCell>
                <TableCell className="font-medium">{stage.label}</TableCell>
                <TableCell>{stage.group_name}</TableCell>
                <TableCell>
                    <Badge variant="outline">{stage.booking_status}</Badge>
                </TableCell>
                <TableCell>
                  <div 
                    className="h-6 w-16 rounded border text-xs flex items-center justify-center"
                    style={{ 
                        backgroundColor: stage.header_color || 'white',
                        borderColor: stage.border_color || 'gray'
                    }}
                  >
                    Preview
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(stage)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
