import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { DashboardHeader, type DashboardNavGroup } from "@/components/dashboard-header"
import { DashboardHeaderProvider, DashboardHeaderSlot } from "@/components/dashboard-header-context"

const navGroups: DashboardNavGroup[] = [
  {
    label: "Operations",
    links: [
      { href: "/fleet-calendar", label: "Fleet calendar", icon: "calendar" },
      { href: "/tasks", label: "Tasks", icon: "tasks" },
    ],
  },
]

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/fleet-calendar",
}))

vi.mock("@/components/profile-menu", () => ({
  ProfileMenu: () => <div data-testid="profile-menu" />,
}))

describe("DashboardHeader", () => {
  beforeAll(() => {
    class MockResizeObserver {
      observe() {}
      disconnect() {}
    }
    // @ts-expect-error jsdom env stub
    global.ResizeObserver = MockResizeObserver
  })

  beforeEach(() => {
    document.documentElement.style.removeProperty("--dashboard-header-height")
  })

  it("renders title from meta pattern", () => {
    render(
      <DashboardHeader
        navGroups={navGroups}
        meta={[
          { pattern: "/fleet-calendar", title: "Operations Control" },
          { pattern: "*", title: "Fallback" },
        ]}
      />
    )

    expect(screen.getByRole("heading", { name: "Operations Control" })).toBeInTheDocument()
  })

  it("toggles mobile navigation sheet", async () => {
    const user = userEvent.setup()
    render(<DashboardHeader navGroups={navGroups} />)

    const navToggle = screen.getByRole("button", { name: /open navigation/i })
    expect(navToggle).toHaveAttribute("aria-expanded", "false")

    await user.click(navToggle)

    expect(navToggle).toHaveAttribute("aria-expanded", "true")
    expect(await screen.findByRole("link", { name: "Fleet calendar" })).toBeVisible()
  })

  it("renders contextual controls from header slot", async () => {
    render(
      <DashboardHeaderProvider>
        <DashboardHeader navGroups={navGroups} />
        <DashboardHeaderSlot>
          <button type="button">Context search</button>
        </DashboardHeaderSlot>
      </DashboardHeaderProvider>
    )

    expect(await screen.findByRole("button", { name: "Context search" })).toBeVisible()
  })
})
