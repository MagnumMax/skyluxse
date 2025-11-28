import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ProfileMenu } from "@/components/profile-menu"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

describe("ProfileMenu", () => {
  beforeEach(() => {
    pushMock.mockReset()
  })

  it("navigates to profile settings and notifies parent", async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(<ProfileMenu onNavigate={onNavigate} />)

    await user.click(screen.getByRole("button", { name: /open profile menu/i }))
    const profileButton = await screen.findByRole("button", { name: /profile settings/i })
    await user.click(profileButton)

    expect(pushMock).toHaveBeenCalledWith("/fleet-calendar?role=operations")
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it("navigates to logout", async () => {
    const user = userEvent.setup()

    render(<ProfileMenu />)

    await user.click(screen.getByRole("button", { name: /open profile menu/i }))
    const logoutButton = await screen.findByRole("button", { name: /log out/i })
    await user.click(logoutButton)

    expect(pushMock).toHaveBeenCalledWith("/login")
  })
})
