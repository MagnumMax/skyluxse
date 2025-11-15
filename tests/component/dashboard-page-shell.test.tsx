import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard-page-shell"
import { Button } from "@/components/ui/button"

describe("DashboardPageShell", () => {
  it("wraps provided children and merges custom classes", () => {
    render(
      <DashboardPageShell className="bg-test">
        <section>Analytics</section>
      </DashboardPageShell>
    )

    const section = screen.getByText("Analytics")
    expect(section.parentElement).toHaveClass("bg-test")
  })
})

describe("DashboardPageHeader", () => {
  it("renders breadcrumbs, description, meta and actions", () => {
    render(
      <DashboardPageHeader
        title="Client workspace"
        description="Monitor priority clients"
        meta={<span>Updated 2 min ago</span>}
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Clients" },
        ]}
        actions={<Button>Invite client</Button>}
        align="between"
      />
    )

    expect(screen.getByText("Client workspace")).toBeVisible()
    expect(screen.getByText("Monitor priority clients")).toBeVisible()
    expect(screen.getByText("Updated 2 min ago")).toBeInTheDocument()

    const salesLink = screen.getByRole("link", { name: "Sales" })
    expect(salesLink).toHaveAttribute("href", "/sales")

    const currentPage = screen.getByRole("link", { name: "Clients" })
    expect(currentPage).toHaveAttribute("aria-current", "page")

    expect(screen.getByRole("button", { name: "Invite client" })).toBeVisible()
  })
})
