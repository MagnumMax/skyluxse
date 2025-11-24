import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type VehicleGalleryCardProps = {
  images?: string[]
}

export function VehicleGalleryCard({ images = [] }: VehicleGalleryCardProps) {
  const hasImages = images.length > 0
  return (
    <Card className="rounded-[26px] border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Gallery</CardTitle>
        <CardDescription>Preview thumbnails for uploaded files.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasImages ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {images.map((image) => (
              <div key={image} className="overflow-hidden rounded-2xl border border-border/60 bg-muted/50">
                <a href={image} target="_blank" rel="noreferrer">
                  <Image src={image} alt="Vehicle media" width={320} height={180} className="h-32 w-full object-cover" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No media</p>
        )}
      </CardContent>
    </Card>
  )
}
