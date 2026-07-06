import Link from "next/link"
import { Button, type buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"

function ButtonLink({
  href,
  children,
  variant = "default",
  testId,
  className,
  ...props
}: {
  href: string
  children: React.ReactNode
  variant?: "primary" | "secondary" | VariantProps<typeof buttonVariants>["variant"]
  testId?: string
  className?: string
}) {
  // Map legacy "primary" variant to "default"
  const mappedVariant = variant === "primary" ? "default" : variant === "secondary" ? "outline" : variant

  return (
    <Button
      nativeButton={false}
      variant={mappedVariant}
      render={<Link href={href} data-testid={testId} />}
      className={className}
      {...props}
    >
      {children}
    </Button>
  )
}

export { ButtonLink }
