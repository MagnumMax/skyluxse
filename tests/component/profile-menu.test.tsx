import { render, screen, within } from "@testing-library/react"
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

  it("открывает меню и показывает профиль без Quick links", async () => {
    const user = userEvent.setup()

    render(<ProfileMenu />)

    await user.click(screen.getByRole("button", { name: /open profile menu/i }))

    const menu = await screen.findByRole("menu")

    expect(within(menu).getByText("Alex Kim")).toBeVisible()
    expect(within(menu).getByText("alex.kim@skyluxse.com")).toBeVisible()
    expect(within(menu).queryByText(/quick links/i)).not.toBeInTheDocument()
  })

  it("navigates to logout", async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(<ProfileMenu onNavigate={onNavigate} />)

    await user.click(screen.getByRole("button", { name: /open profile menu/i }))
    const logoutItem = await screen.findByRole("menuitem", { name: /sign out/i })
    await user.click(logoutItem)

    expect(pushMock).toHaveBeenCalledWith("/login")
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
})
