
import { Suspense } from "react"
import { getAdditionalServices } from "@/app/actions/additional-services"
import { getKommoStages } from "@/app/actions/kommo-stages"
import { ServicesManager } from "./services-manager"
import { KommoStagesManager } from "./kommo-stages-manager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function ServicesPage() {
  const [services, stages] = await Promise.all([
    getAdditionalServices(),
    getKommoStages()
  ])

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Service Management</h1>
      <Tabs defaultValue="additional-services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="additional-services">Additional Services</TabsTrigger>
          <TabsTrigger value="pipeline-stages">Kommo Stages</TabsTrigger>
        </TabsList>
        <TabsContent value="additional-services" className="space-y-4">
          <ServicesManager initialServices={services} />
        </TabsContent>
        <TabsContent value="pipeline-stages" className="space-y-4">
          <KommoStagesManager initialStages={stages} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
