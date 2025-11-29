import type { LinkProps } from "next/link"

type LinkHref = LinkProps<unknown>["href"]

export const toRoute = (href: string) => href as LinkHref

export function isActiveLink(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  if (pathname === href) return true
  return pathname.startsWith(`${href}/`)
}
