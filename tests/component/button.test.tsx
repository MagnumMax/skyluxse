import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { Button, buttonVariants } from "@/components/ui/button"

describe("Button", () => {
  it("renders text content with default variant", () => {
    render(<Button>Primary</Button>)

    const button = screen.getByRole("button", { name: "Primary" })
    expect(button).toHaveClass(buttonVariants({ variant: "default" }))
  })

  it("supports outline variant and size modifiers", () => {
    render(
      <Button variant="outline" size="sm">
        Outline
      </Button>
    )

    const button = screen.getByRole("button", { name: "Outline" })
    expect(button).toHaveClass("border", { exact: false })
    expect(button.className).toContain("h-8")
  })

  it("delegates events to child elements when asChild is provided", async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(
      <Button asChild>
        <a href="/dashboard" onClick={handleClick}>
          Go to dashboard
        </a>
      </Button>
    )

    const link = screen.getByRole("link", { name: /dashboard/i })
    await user.click(link)

    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(link).toHaveAttribute("href", "/dashboard")
  })
})
