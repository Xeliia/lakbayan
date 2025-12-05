"use client"

import { X, Clock, DollarSign, Navigation, CheckCircle, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export interface RouteStep {
  instruction: string
  location?: [number, number] // Optional: [lat, lng]
}

export interface RouteData {
  id: string
  name: string
  type: string
  fare: { regular: number; discounted: number }
  distance: string
  time: string
  steps: RouteStep[]
}

interface RoutePanelProps {
  route: RouteData
  onClose: () => void
  onStepClick?: (location: [number, number]) => void
}

export function RoutePanel({ route, onClose, onStepClick }: RoutePanelProps) {
  return (
    <>
      {/* Mobile & Desktop Wrapper */}
      <div className="fixed inset-x-0 bottom-0 md:top-20 md:right-6 md:left-auto md:bottom-auto md:w-96 z-30">
        <div className="bg-card md:rounded-2xl rounded-t-3xl shadow-2xl border border-border max-h-[70vh] md:max-h-[calc(100vh-7rem)] overflow-y-auto custom-scrollbar">
          <div className="p-6">
            {/* Mobile Handle */}
            <div className="md:hidden w-12 h-1 bg-muted rounded-full mx-auto mb-4" />

            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">{route.name}</h3>
                <p className="text-sm text-muted-foreground">{route.type}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-2 gap-3 mb-6">
              <Card className="p-3 text-center md:flex md:items-center md:gap-3 md:text-left md:px-4">
                <DollarSign className="w-5 h-5 text-primary mx-auto md:mx-0" />
                <div>
                  <p className="text-lg font-bold text-foreground">₱{route.fare.regular}</p>
                  <p className="text-xs text-muted-foreground hidden md:block">Regular Fare</p>
                </div>
              </Card>
              <Card className="p-3 text-center md:flex md:items-center md:gap-3 md:text-left md:px-4">
                <Clock className="w-5 h-5 text-primary mx-auto md:mx-0" />
                <div>
                  <p className="text-lg font-bold text-foreground">{route.time}</p>
                  <p className="text-xs text-muted-foreground hidden md:block">{route.distance}</p>
                </div>
              </Card>
              {/* Mobile Only Distance Card */}
              <Card className="p-3 text-center md:hidden">
                <Navigation className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{route.distance}</p>
              </Card>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Route Stops
              </h4>
              <div className="space-y-2">
                {route.steps.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => step.location && onStepClick?.(step.location)}
                    className={`flex gap-3 w-full text-left p-2 rounded-lg transition-colors ${
                      step.location ? "hover:bg-muted cursor-pointer active:bg-primary/10" : ""
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{index + 1}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{step.instruction}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" size="lg">
                <CheckCircle className="w-4 h-4 mr-2" />
                Go Now
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent" size="lg">
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}