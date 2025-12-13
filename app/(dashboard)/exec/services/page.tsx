
import { Suspense } from "react"
import { getAdditionalServices } from "@/app/actions/additional-services"
import { ServicesManager } from "./services-manager"

export default async function ServicesPage() {
  const services = await getAdditionalServices()

  return (
    <div className="container mx-auto py-10">
      <ServicesManager initialServices={services} />
    </div>
  )
}
