"use client"

import { useState } from "react"

import { DashboardHeaderSearch } from "@/components/dashboard-header-search"
import { SalesBookingsBoard } from "@/components/sales-bookings-board"
import type { Booking, Driver } from "@/lib/domain/entities"

type BookingsClientProps = {
  bookings: Booking[]
  drivers: Driver[]
  readOnly?: boolean
}

export function BookingsClient({ bookings, drivers, readOnly }: BookingsClientProps) {
  const [search, setSearch] = useState("")

  return (
    <>
      <DashboardHeaderSearch
        value={search}
        onChange={setSearch}
        placeholder="Search booking, client, vehicle"
      />
      <SalesBookingsBoard
        bookings={bookings}
        drivers={drivers}
        readOnly={readOnly}
        searchTerm={search}
        onSearchTermChange={setSearch}
        showSearchInput={false}
      />
    </>
  )
}
