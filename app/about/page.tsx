import { Navigation } from "@/components/navigation"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">Lakbayan</h1>
          </div>
        </section>
      </main>
    </div>
  )
}
