import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ProfileMenu } from "@/components/profile-menu"

const pushMock = vi.fn()
const setThemeMock = vi.fn()
let forcedTheme: string | undefined
let activeTheme = "light"
let resolvedTheme = "light"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: activeTheme,
    resolvedTheme,
    forcedTheme,
    setTheme: setThemeMock,
  }),
}))

describe("ProfileMenu", () => {
  beforeEach(() => {
    pushMock.mockReset()
    setThemeMock.mockReset()
    forcedTheme = undefined
    activeTheme = "light"
    resolvedTheme = "light"
  })

  it("navigates to profile settings and notifies parent", async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(<ProfileMenu onNavigate={onNavigate} />)

    await user.click(screen.getByRole("button", { name: /anna koval/i }))
    const profileButton = await screen.findByRole("button", { name: /profile settings/i })
    await user.click(profileButton)

    expect(pushMock).toHaveBeenCalledWith("/fleet-calendar?role=operations")
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it("switches theme when selecting a non-active option", async () => {
    const user = userEvent.setup()

    render(<ProfileMenu />)

    await user.click(screen.getByRole("button", { name: /anna koval/i }))
    const darkButton = await screen.findByRole("button", { name: "Dark" })
    await user.click(darkButton)

    expect(setThemeMock).toHaveBeenCalledWith("dark")
  })

  it("disables theme toggles when a forced theme is set", async () => {
    forcedTheme = "system"
    const user = userEvent.setup()

    render(<ProfileMenu />)

    await user.click(screen.getByRole("button", { name: /anna koval/i }))
    const autoButton = await screen.findByRole("button", { name: "Auto" })

    expect(autoButton).toBeDisabled()
    await user.click(autoButton)
    expect(setThemeMock).not.toHaveBeenCalled()
  })
})
