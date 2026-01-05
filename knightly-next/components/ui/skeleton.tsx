import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded", className)}
      {...props}
    />
  )
}

const SVGSkeleton = ({ className }) => (
  <svg
    className={
      className + " animate-pulse rounded bg-accent"
    }
  />
)

export { Skeleton, SVGSkeleton }
