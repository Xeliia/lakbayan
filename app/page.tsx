import { Navigation } from "@/components/navigation"
import { MapInterface } from "@/components/map-interface"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="relative z-0">
        <MapInterface />
      </main>
    </div>
  )
}
