"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowUpDown, CalendarDays, RotateCcw } from "lucide-react"

import { DashboardHeaderSearch } from "@/components/dashboard-header-search"
import { SalesBookingsBoard, type BookingSortOption } from "@/components/sales-bookings-board"
import { StageFilterPopover } from "@/components/stage-filter-popover"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createDefaultBookingStageFilters, type BookingStageKey } from "@/lib/constants/bookings"
import type { Booking, Driver, KommoStageConfig } from "@/lib/domain/entities"

type BookingsClientProps = {
  bookings: Booking[]
  drivers: Driver[]
  stages: KommoStageConfig[]
  readOnly?: boolean
}

export function BookingsClient({ bookings, drivers, stages, readOnly }: BookingsClientProps) {
  const [search, setSearch] = useState("")
  const [stageFilters, setStageFilters] = useState<Record<BookingStageKey, boolean>>(
    () => createDefaultBookingStageFilters()
  )
  const [sortOption, setSortOption] = useState<BookingSortOption>("start-date")

  const handleReset = () => {
    setSearch("")
    setStageFilters(createDefaultBookingStageFilters())
    setSortOption("start-date")
  }

  return (
    <>
      <DashboardHeaderSearch
        className="ml-4"
        value={search}
        onChange={setSearch}
        placeholder="Search booking, client, vehicle"
        actions={
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <StageFilterPopover
              filters={stageFilters}
              onToggle={(key) => setStageFilters((prev) => ({ ...prev, [key]: !prev[key] }))}
            />
            <BookingsSortButton value={sortOption} onValueChange={setSortOption} />
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-white/20 bg-slate-900/60 text-slate-100"
              aria-label="Open fleet calendar"
              title="Open fleet calendar"
            >
              <Link href="/fleet-calendar">
                <CalendarDays className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-white/20 bg-slate-900/60 text-slate-100"
              onClick={handleReset}
              aria-label="Reset filters"
              title="Reset filters"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <SalesBookingsBoard
        bookings={bookings}
        drivers={drivers}
        stages={stages}
        readOnly={readOnly}
        searchTerm={search}
        onSearchTermChange={setSearch}
        showSearchInput={false}
        stageFilters={stageFilters}
        sortOption={sortOption}
        showFilters={false}
      />
    </>
  )
}

function BookingsSortButton({
  value,
  onValueChange,
}: {
  value: BookingSortOption
  onValueChange: (value: BookingSortOption) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full border border-white/20 bg-slate-900/60 text-slate-100"
          aria-label="Sort bookings"
          title="Sort bookings"
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 space-y-1 rounded-2xl border border-border/70 bg-card/95 p-2 shadow-lg" align="end">
        <Select value={value} onValueChange={(v) => onValueChange(v as BookingSortOption)}>
          <SelectTrigger className="h-10 w-full rounded-xl">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="start-date">Start date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="value">Value</SelectItem>
            <SelectItem value="code">Code</SelectItem>
          </SelectContent>
        </Select>
      </PopoverContent>
    </Popover>
  )
}
