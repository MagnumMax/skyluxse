
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AdditionalService } from "@/lib/domain/additional-services"
import { createAdditionalService, updateAdditionalService, deleteAdditionalService } from "@/app/actions/additional-services"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  default_price: z.number().min(0, "Price must be positive"),
})

type ServiceFormValues = z.infer<typeof serviceSchema>

interface ServicesManagerProps {
  initialServices: AdditionalService[]
}

export function ServicesManager({ initialServices }: ServicesManagerProps) {
  const [services, setServices] = useState<AdditionalService[]>(initialServices)
  const [isOpen, setIsOpen] = useState(false)
  const [editingService, setEditingService] = useState<AdditionalService | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      default_price: 0,
    },
  })

  const onSubmit = async (data: ServiceFormValues) => {
    setIsLoading(true)
    try {
      if (editingService) {
        const updated = await updateAdditionalService(editingService.id, data)
        setServices(services.map((s) => (s.id === updated.id ? updated : s)))
        toast.success("Service updated")
      } else {
        const created = await createAdditionalService(data)
        setServices([...services, created])
        toast.success("Service created")
      }
      setIsOpen(false)
      form.reset()
      setEditingService(null)
    } catch (error) {
      toast.error("Failed to save service")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return
    
    try {
      await deleteAdditionalService(id)
      setServices(services.filter((s) => s.id !== id))
      toast.success("Service deleted")
    } catch (error) {
      toast.error("Failed to delete service")
    }
  }

  const openEdit = (service: AdditionalService) => {
    setEditingService(service)
    form.reset({
      name: service.name,
      description: service.description || "",
      default_price: service.default_price,
    })
    setIsOpen(true)
  }

  const openCreate = () => {
    setEditingService(null)
    form.reset({
      name: "",
      description: "",
      default_price: 0,
    })
    setIsOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
            <CardTitle>Services List</CardTitle>
            <CardDescription>Manage additional services available for bookings and tasks.</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
              <DialogDescription>
                Configure the service details.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Child Seat" {...field} />
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
                        <Textarea placeholder="Service description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="default_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Price (AED)</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            step="0.01" 
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        No services found. Add one to get started.
                    </TableCell>
                </TableRow>
            ) : (
                services.map((service) => (
                <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.description}</TableCell>
                    <TableCell>{Number(service.default_price).toFixed(2)} AED</TableCell>
                    <TableCell>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(service)}>
                        <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(service.id)}>
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
