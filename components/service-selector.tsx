
"use client"

import { useState } from "react"
import { Plus, X, Pencil, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { AdditionalService, BookingAdditionalService, TaskAdditionalService } from "@/lib/domain/additional-services"
import { addServiceToBooking, removeServiceFromBooking, updateBookingService, addServiceToTask, removeServiceFromTask, updateTaskService } from "@/app/actions/additional-services"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ServiceLink = BookingAdditionalService | TaskAdditionalService

interface ServiceSelectorProps {
  entityId: string
  entityType: "booking" | "task"
  initialServices: ServiceLink[]
  availableServices: AdditionalService[]
}

export function ServiceSelector({ entityId, entityType, initialServices, availableServices }: ServiceSelectorProps) {
  const [services, setServices] = useState<ServiceLink[]>(initialServices)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // New service form state
  const [selectedServiceId, setSelectedServiceId] = useState<string>("")
  const [customPrice, setCustomPrice] = useState<string>("")
  const [customDescription, setCustomDescription] = useState<string>("")
  const [quantity, setQuantity] = useState<string>("1")

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleServiceSelect = (id: string) => {
    setSelectedServiceId(id)
    const service = availableServices.find(s => s.id === id)
    if (service) {
        setCustomPrice(service.default_price.toString())
        setCustomDescription(service.description || "")
    }
  }

  const handleAdd = async () => {
    if (!selectedServiceId) return
    setIsLoading(true)
    try {
        let newLink;
        const overrides = {
            price: customPrice ? parseFloat(customPrice) : undefined,
            description: customDescription,
            quantity: parseInt(quantity) || 1
        }

        if (entityType === "booking") {
            newLink = await addServiceToBooking(entityId, selectedServiceId, overrides)
        } else {
            newLink = await addServiceToTask(entityId, selectedServiceId, overrides)
        }
        
        // Optimistically add the service name if not returned fully populated
        const serviceDef = availableServices.find(s => s.id === selectedServiceId)
        if (serviceDef && !newLink.service) {
            newLink.service = serviceDef
        }

        setServices([...services, newLink as ServiceLink])
        setIsOpen(false)
        resetForm()
        toast.success("Service added")
    } catch (error) {
        toast.error("Failed to add service")
        console.error(error)
    } finally {
        setIsLoading(false)
    }
  }

  const handleDelete = async (linkId: string) => {
    if (!confirm("Remove this service?")) return
    try {
        if (entityType === "booking") {
            await removeServiceFromBooking(linkId, entityId)
        } else {
            await removeServiceFromTask(linkId, entityId)
        }
        setServices(services.filter(s => s.id !== linkId))
        toast.success("Service removed")
    } catch (error) {
        toast.error("Failed to remove service")
    }
  }

  const resetForm = () => {
    setSelectedServiceId("")
    setCustomPrice("")
    setCustomDescription("")
    setQuantity("1")
    setEditingId(null)
  }

  const openEdit = (link: ServiceLink) => {
      setEditingId(link.id)
      setSelectedServiceId(link.service_id)
      setCustomPrice(link.price.toString())
      setCustomDescription(link.description || "")
      setQuantity(link.quantity.toString())
      setIsOpen(true)
  }

  const handleUpdate = async () => {
      if (!editingId) return
      setIsLoading(true)
      try {
        const updates = {
            price: parseFloat(customPrice),
            description: customDescription,
            quantity: parseInt(quantity) || 1
        }
        
        let updatedLink;
        if (entityType === "booking") {
            updatedLink = await updateBookingService(editingId, entityId, updates)
        } else {
            updatedLink = await updateTaskService(editingId, entityId, updates)
        }

         // Restore service definition
         const serviceDef = availableServices.find(s => s.id === selectedServiceId)
         if (serviceDef && !updatedLink.service) {
             updatedLink.service = serviceDef
         }

        setServices(services.map(s => s.id === editingId ? updatedLink as ServiceLink : s))
        setIsOpen(false)
        resetForm()
        toast.success("Service updated")
      } catch (error) {
          toast.error("Failed to update service")
      } finally {
          setIsLoading(false)
      }
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base font-medium">Additional Services</CardTitle>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Service" : "Add Service"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Service</Label>
                <Select value={selectedServiceId} onValueChange={handleServiceSelect} disabled={!!editingId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableServices.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({Number(s.default_price).toFixed(2)} AED)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Price (AED)</Label>
                    <Input 
                        type="number" 
                        value={customPrice} 
                        onChange={(e) => setCustomPrice(e.target.value)} 
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Quantity</Label>
                    <Input 
                        type="number" 
                        value={quantity} 
                        onChange={(e) => setQuantity(e.target.value)} 
                    />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description (Optional override)</Label>
                <Textarea 
                    value={customDescription} 
                    onChange={(e) => setCustomDescription(e.target.value)} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={editingId ? handleUpdate : handleAdd} disabled={isLoading || !selectedServiceId}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Save Changes" : "Add Service"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No additional services added.</p>
        ) : (
            <div className="space-y-4">
                {services.map((link) => (
                    <div key={link.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{link.service?.name || "Unknown Service"}</span>
                                <Badge variant="secondary">x{link.quantity}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{link.description || link.service?.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-medium tabular-nums">
                                {(Number(link.price) * link.quantity).toFixed(2)} AED
                            </span>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(link)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(link.id)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  )
}
