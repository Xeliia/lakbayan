"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, NavigationIcon, Plus, Compass, Map as MapIcon, Loader2, Settings2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { RoutePanel, RouteData, RouteStep } from "@/components/route-panel"
import "leaflet/dist/leaflet.css"

interface Coordinates {
  lat: number
  lng: number
  name: string
}

interface RouteFare {
  regular: number
  discounted: number
}

interface MockRouteData {
  id: string
  name: string
  type: string
  fare: RouteFare
  distance: string
  time: string
  from: Coordinates
  to: Coordinates
  steps: string[] | { instruction: string; location?: [number, number] }[]
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180)
}

function parseTime(timeStr: string): number {
  return parseInt(timeStr.split(" ")[0])
}

function parseDist(distStr: string): number {
  return parseFloat(distStr.split(" ")[0])
}

export function MapInterface() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [L, setLeaflet] = useState<any>(null)
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null)
  
  const [fromLocation, setFromLocation] = useState("")
  const [toLocation, setToLocation] = useState("")
  const [pinnedStart, setPinnedStart] = useState<Coordinates | null>(null)
  const [pinnedEnd, setPinnedEnd] = useState<Coordinates | null>(null)
  
  const [isSearching, setIsSearching] = useState(false)
  const [pinningMode, setPinningMode] = useState<'from' | 'to' | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const [maxWalk, setMaxWalk] = useState(2)
  const [maxTransfers, setMaxTransfers] = useState(1)
  
  const userRouteRef = useRef<any>(null)
  const routeLayersRef = useRef<any[]>([])

  useEffect(() => {
    if (!mapRef.current || map) return

    import("leaflet").then((LeafletModule) => {
      const LeafletLib = LeafletModule.default
      setLeaflet(LeafletLib)

      const newMap = LeafletLib.map(mapRef.current!, {
        zoomControl: false,
      }).setView([14.5995, 121.0], 12)

      LeafletLib.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(newMap)

      LeafletLib.control.zoom({ position: "bottomright" }).addTo(newMap)

      setMap(newMap)

      newMap.on('click', async (e: any) => {
        const container = mapRef.current
        if (container && container.classList.contains('cursor-crosshair')) {
             handleMapClick(e.latlng, newMap, LeafletLib)
        }
      })

      mockRoutes.forEach(route => {
        addTerminalMarker(LeafletLib, newMap, route.from, "Start Terminal")
        addTerminalMarker(LeafletLib, newMap, route.to, "End Terminal")
      })

      const loadRoutesSequentially = async () => {
        for (const route of mockRoutes) {
          await fetchRoute(LeafletLib, newMap, route)
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }
      loadRoutesSequentially()
    })

    return () => {
      if (map) map.remove()
    }
  }, [])

  useEffect(() => {
    if (mapRef.current) {
        if (pinningMode) {
            mapRef.current.classList.add('cursor-crosshair')
        } else {
            mapRef.current.classList.remove('cursor-crosshair')
        }
    }
    if (map) {
        map.off('click')
        map.on('click', (e: any) => {
            if (pinningMode) {
                handleMapClick(e.latlng, map, L)
            }
        })
    }
  }, [pinningMode, map, L])

  const handleMapClick = async (latlng: any, mapInstance: any, LeafletLib: any) => {
      if (!pinningMode) return

      const tempMarker = LeafletLib.marker([latlng.lat, latlng.lng]).addTo(mapInstance)
      
      try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`)
          const data = await response.json()
          
          const name = data.display_name || `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`
          const coords = { lat: latlng.lat, lng: latlng.lng, name }

          if (pinningMode === 'from') {
              setFromLocation(name)
              setPinnedStart(coords)
          } else {
              setToLocation(name)
              setPinnedEnd(coords)
          }
      } catch (e) {
          if (pinningMode === 'from') setFromLocation(`${latlng.lat}, ${latlng.lng}`)
          else setToLocation(`${latlng.lat}, ${latlng.lng}`)
      } finally {
          mapInstance.removeLayer(tempMarker)
          setPinningMode(null)
      }
  }

  const clearUserRoute = () => {
    if (userRouteRef.current && map) {
      map.removeLayer(userRouteRef.current)
      userRouteRef.current = null
    }
    if (routeLayersRef.current.length > 0) {
      routeLayersRef.current.forEach(layer => map.removeLayer(layer))
      routeLayersRef.current = []
    }
  }

  const addTerminalMarker = (LeafletLib: any, mapInstance: any, coords: Coordinates, label: string) => {
    const icon = LeafletLib.divIcon({
        className: "terminal-marker",
        html: `<div class="w-4 h-4 bg-white rounded-full border-4 border-slate-700 shadow-md"></div>`,
        iconSize: [16, 16],
    })
    LeafletLib.marker([coords.lat, coords.lng], { icon })
        .addTo(mapInstance)
        .bindPopup(`<strong>${coords.name}</strong><br/>${label}`)
  }

  const fetchRoute = async (LeafletLib: any, mapInstance: any, route: MockRouteData) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${route.from.lng},${route.from.lat};${route.to.lng},${route.to.lat}?overview=full&geometries=geojson`,
      )
      if (!response.ok) { drawStraightLine(LeafletLib, mapInstance, route); return }
      const data = await response.json()
      if (!data.routes || data.routes.length === 0) { drawStraightLine(LeafletLib, mapInstance, route); return }
      const coordinates = data.routes[0].geometry.coordinates
      drawPolyline(LeafletLib, mapInstance, coordinates, route)
    } catch {
      drawStraightLine(LeafletLib, mapInstance, route)
    }
  }

  const drawPolyline = (LeafletLib: any, mapInstance: any, coordinates: any[], route: MockRouteData) => {
    const latLngs = coordinates.map((coord: number[]) => [coord[1], coord[0]])
    const polyline = LeafletLib.polyline(latLngs, { color: "#94a3b8", weight: 3, opacity: 0.5 })
      .addTo(mapInstance)
      .on("click", () => handleRouteSelect(route))
    routeLayersRef.current.push(polyline)
  }

  const drawStraightLine = (LeafletLib: any, mapInstance: any, route: MockRouteData) => {
    const polyline = LeafletLib.polyline(
      [[route.from.lat, route.from.lng], [route.to.lat, route.to.lng]],
      { color: "#94a3b8", weight: 3, opacity: 0.5, dashArray: "5, 10" }
    ).addTo(mapInstance).on("click", () => handleRouteSelect(route))
    routeLayersRef.current.push(polyline)
  }

  const handleRouteSelect = (route: MockRouteData) => {
    clearUserRoute()
    const formattedSteps = route.steps.map(s => ({
        instruction: typeof s === 'string' ? s : s.instruction,
        location: typeof s === 'string' ? undefined : s.location
    }))
    setSelectedRoute({ ...route, steps: formattedSteps } as RouteData)
  }

  const geocodeLocation = async (locationName: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&countrycodes=ph&format=json&limit=1`
      )
      const data = await response.json()
      if (data && data.length > 0) {
        return {
          lat: Number.parseFloat(data[0].lat),
          lng: Number.parseFloat(data[0].lon),
          name: data[0].display_name,
        }
      }
      return null
    } catch {
      return null
    }
  }

  const handleStepClick = (location: [number, number]) => {
    if (map) map.flyTo(location, 16, { animate: true, duration: 1.5 })
  }

  const handleSearch = async () => {
    if (!fromLocation || !toLocation || !map || !L) return

    setIsSearching(true)
    clearUserRoute()
    setSelectedRoute(null)

    try {
      let fromCoords = pinnedStart
      if (!fromCoords || fromLocation !== fromCoords.name) {
          fromCoords = await geocodeLocation(fromLocation)
      }

      let toCoords = pinnedEnd
      if (!toCoords || toLocation !== toCoords.name) {
          toCoords = await geocodeLocation(toLocation)
      }

      if (!fromCoords || !toCoords) {
        alert("Locations not found.")
        setIsSearching(false)
        return
      }

      let bestPath = null
      let minCost = Infinity 

      for (const route of mockRoutes) {
        const d1 = getDistance(fromCoords.lat, fromCoords.lng, route.from.lat, route.from.lng)
        const d2 = getDistance(route.to.lat, route.to.lng, toCoords.lat, toCoords.lng)
        const totalCost = (d1 * 12) + parseTime(route.time) + (d2 * 12)

        if (d1 <= maxWalk && totalCost < minCost) {
          minCost = totalCost
          bestPath = { type: "direct", route1: route, d1, d2 }
        }
      }

      if (maxTransfers >= 1) {
        for (const r1 of mockRoutes) {
            const dStart = getDistance(fromCoords.lat, fromCoords.lng, r1.from.lat, r1.from.lng)
            
            if (dStart > maxWalk) continue 

            for (const r2 of mockRoutes) {
                if (r1.id === r2.id) continue
                const dTransfer = getDistance(r1.to.lat, r1.to.lng, r2.from.lat, r2.from.lng)
                
                if (dTransfer > 2) continue 

                const dEnd = getDistance(r2.to.lat, r2.to.lng, toCoords.lat, toCoords.lng)
                
                const totalCost = (dStart * 12) + parseTime(r1.time) + (dTransfer * 12) + parseTime(r2.time) + (dEnd * 12)
                
                if (totalCost < minCost) {
                    minCost = totalCost
                    bestPath = { type: "transfer", route1: r1, route2: r2, dStart, dTransfer, dEnd }
                }
            }
        }
      }

      if (bestPath) {
        const markers = []
        markers.push(L.marker([fromCoords.lat, fromCoords.lng]).addTo(map).bindPopup("Start"))
        markers.push(L.marker([toCoords.lat, toCoords.lng]).addTo(map).bindPopup("Destination"))
        
        const walkColor = "#71717a"
        const rideColor = "#F7A600"

        if (bestPath.type === "direct") {
            const { route1, d1, d2 } = bestPath
            
            const l1 = L.polyline([[fromCoords.lat, fromCoords.lng], [route1.from.lat, route1.from.lng]], { color: walkColor, dashArray: "10,10" }).addTo(map)
            
            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${route1.from.lng},${route1.from.lat};${route1.to.lng},${route1.to.lat}?overview=full&geometries=geojson`)
            const data = await response.json()
            const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]])
            const l2 = L.polyline(coords, { color: rideColor, weight: 6 }).addTo(map)

            const l3 = L.polyline([[route1.to.lat, route1.to.lng], [toCoords.lat, toCoords.lng]], { color: walkColor, dashArray: "10,10" }).addTo(map)
            
            routeLayersRef.current.push(l1, l2, l3, ...markers)
            map.fitBounds(l2.getBounds(), { padding: [50, 50] })

            setSelectedRoute({
                id: `combined-${route1.id}`,
                name: `Trip to ${toLocation.split(',')[0]}`,
                type: `${route1.type} + Walking`,
                fare: route1.fare,
                distance: `${(d1 + parseDist(route1.distance) + d2).toFixed(1)} km`,
                time: `${Math.round(minCost)} min`,
                steps: [
                    { instruction: `Walk ${d1.toFixed(1)}km to ${route1.from.name}`, location: [fromCoords.lat, fromCoords.lng] },
                    ...route1.steps.map(s => ({ instruction: typeof s === 'string' ? s : s.instruction })),
                    { instruction: `Walk ${d2.toFixed(1)}km to Destination`, location: [route1.to.lat, route1.to.lng] }
                ]
            } as RouteData)

        } else if (bestPath.type === "transfer") {
            const { route1, route2, dStart, dTransfer, dEnd } = bestPath
            const l1 = L.polyline([[fromCoords.lat, fromCoords.lng], [route1.from.lat, route1.from.lng]], { color: walkColor, dashArray: "10,10" }).addTo(map)
            
            const r1Resp = await fetch(`https://router.project-osrm.org/route/v1/driving/${route1.from.lng},${route1.from.lat};${route1.to.lng},${route1.to.lat}?overview=full&geometries=geojson`)
            const r1Data = await r1Resp.json()
            const c1 = r1Data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]])
            const l2 = L.polyline(c1, { color: rideColor, weight: 6 }).addTo(map)

            const l3 = L.polyline([[route1.to.lat, route1.to.lng], [route2.from.lat, route2.from.lng]], { color: walkColor, dashArray: "10,10" }).addTo(map)

            const r2Resp = await fetch(`https://router.project-osrm.org/route/v1/driving/${route2.from.lng},${route2.from.lat};${route2.to.lng},${route2.to.lat}?overview=full&geometries=geojson`)
            const r2Data = await r2Resp.json()
            const c2 = r2Data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]])
            const l4 = L.polyline(c2, { color: rideColor, weight: 6 }).addTo(map)

            const l5 = L.polyline([[route2.to.lat, route2.to.lng], [toCoords.lat, toCoords.lng]], { color: walkColor, dashArray: "10,10" }).addTo(map)

            routeLayersRef.current.push(l1, l2, l3, l4, l5, ...markers)
            map.fitBounds(l2.getBounds().extend(l4.getBounds()), { padding: [50, 50] })

            const totalFare = route1.fare.regular + route2.fare.regular
            const totalDist = dStart + parseDist(route1.distance) + dTransfer + parseDist(route2.distance) + dEnd

            setSelectedRoute({
                id: `transfer-${route1.id}-${route2.id}`,
                name: `Trip to ${toLocation.split(',')[0]} (1 Transfer)`,
                type: `Multi-Leg Trip`,
                fare: { regular: totalFare, discounted: totalFare * 0.8 },
                distance: `${totalDist.toFixed(1)} km`,
                time: `${Math.round(minCost)} min`,
                steps: [
                    { instruction: `Walk ${dStart.toFixed(1)}km to ${route1.from.name}`, location: [fromCoords.lat, fromCoords.lng] },
                    { instruction: `Ride ${route1.type} towards ${route1.to.name}` },
                    { instruction: `Alight at ${route1.to.name} and Walk ${dTransfer.toFixed(1)}km to ${route2.from.name}`, location: [route1.to.lat, route1.to.lng] },
                    { instruction: `Ride ${route2.type} towards ${route2.to.name}` },
                    { instruction: `Alight at ${route2.to.name} and Walk ${dEnd.toFixed(1)}km to Destination`, location: [route2.to.lat, route2.to.lng] }
                ]
            } as RouteData)
        }

      } else {
        alert("No suitable transit route found. Calculating direct driving route.")
        const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${fromCoords.lng},${fromCoords.lat};${toCoords.lng},${toCoords.lat}?overview=full&geometries=geojson&steps=true`
        )
        const data = await response.json()
        const route = data.routes[0]
        const latLngs = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]])
        const polyline = L.polyline(latLngs, { color: "#E45A5A", weight: 5 }).addTo(map)
        routeLayersRef.current.push(polyline)
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] })
      }

    } catch (error) {
      console.error(error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleRecenter = () => { if (map) map.setView([14.5995, 121.0], 12) }

  return (
    <div className="relative h-screen pt-16 z-0">
      <div className="absolute top-20 left-4 right-4 z-[20] md:left-1/2 md:-translate-x-1/2 md:max-w-3xl">
        <div className="bg-card rounded-xl shadow-lg p-4 border border-border relative">
          
          {pinningMode && (
             <div className="mb-2 bg-primary/10 text-primary px-3 py-1 rounded-md text-sm font-semibold flex items-center justify-center animate-pulse">
                <MapIcon className="w-4 h-4 mr-2"/> Tap anywhere on map to select location
             </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative flex gap-1">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="From: Starting point"
                  value={fromLocation}
                  onChange={(e) => {
                      setFromLocation(e.target.value)
                      setPinnedStart(null) 
                  }}
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button 
                variant={pinningMode === 'from' ? "destructive" : "outline"} 
                size="icon" 
                onClick={() => setPinningMode(pinningMode === 'from' ? null : 'from')}
                title="Pin on Map"
              >
                <MapIcon className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 relative flex gap-1">
              <div className="relative flex-1">
                <NavigationIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="To: Destination"
                  value={toLocation}
                  onChange={(e) => {
                      setToLocation(e.target.value)
                      setPinnedEnd(null)
                  }}
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button 
                variant={pinningMode === 'to' ? "destructive" : "outline"} 
                size="icon" 
                onClick={() => setPinningMode(pinningMode === 'to' ? null : 'to')}
                title="Pin on Map"
              >
                 <MapIcon className="w-4 h-4" />
              </Button>
            </div>
            
            <Button variant={showSettings ? "secondary" : "outline"} size="icon" onClick={() => setShowSettings(!showSettings)}>
                <Settings2 className="w-4 h-4"/>
            </Button>

            <Button className="sm:w-auto" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin"/> : "Search"}
            </Button>
          </div>

          {showSettings && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl p-4 z-30">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-sm">Route Preferences</h4>
                    <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}><X className="w-4 h-4"/></Button>
                </div>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between mb-2">
                            <Label className="text-xs">Max Initial Walk: {maxWalk} km</Label>
                        </div>
                        <Slider 
                            value={[maxWalk]} 
                            onValueChange={(v) => setMaxWalk(v[0])} 
                            min={0.5} max={10} step={0.5}
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <Label className="text-xs">Max Transfers: {maxTransfers}</Label>
                        </div>
                        <div className="flex gap-2">
                             {[0, 1, 2].map(num => (
                                 <Button 
                                    key={num} 
                                    variant={maxTransfers === num ? "default" : "outline"}
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setMaxTransfers(num)}
                                 >
                                    {num === 0 ? "Direct Only" : num}
                                 </Button>
                             ))}
                        </div>
                    </div>
                </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-2 text-center">Tulungan natin ang iba makauwi 🚌</p>
        </div>
      </div>

      <div ref={mapRef} className="w-full h-full relative z-[1]" />

      <div className="absolute bottom-6 right-6 z-[20] flex flex-col gap-2">
        <Button size="icon" className="w-12 h-12 rounded-full shadow-lg" onClick={handleRecenter}><Compass className="w-5 h-5" /></Button>
        <Button size="icon" className="w-12 h-12 rounded-full shadow-lg"><Plus className="w-5 h-5" /></Button>
      </div>

      {selectedRoute && <RoutePanel route={selectedRoute} onClose={() => setSelectedRoute(null)} onStepClick={handleStepClick}/>}
      
      <div className="absolute bottom-6 left-6 z-[20] bg-card/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-border hidden md:block">
        <p className="text-sm font-medium text-foreground">Sabay tayo sa biyahe — Sama-samang Hanap ng Daan</p>
      </div>
    </div>
  )
}

const mockRoutes: MockRouteData[] = [
  {
    id: "1",
    name: "Jeep - Cubao to Quiapo",
    type: "Jeepney",
    fare: { regular: 15, discounted: 12 },
    distance: "8.5 km",
    time: "35 min",
    from: { lat: 14.6191, lng: 121.0577, name: "Cubao" },
    to: { lat: 14.5995, lng: 120.9842, name: "Quiapo" },
    steps: ["Board jeep at Cubao terminal", "Pass through EDSA", "Alight at Quiapo Church"],
  },
  {
    id: "2",
    name: "Bus - Alabang to Makati",
    type: "Bus",
    fare: { regular: 25, discounted: 20 },
    distance: "12.3 km",
    time: "45 min",
    from: { lat: 14.4291, lng: 121.0418, name: "Alabang" },
    to: { lat: 14.5547, lng: 121.0244, name: "Makati" },
    steps: ["Board bus at Alabang Town Center", "Express route via Skyway", "Alight at Ayala Avenue"],
  },
  {
    id: "3",
    name: "MRT - North Avenue to Taft Avenue",
    type: "MRT",
    fare: { regular: 28, discounted: 22 },
    distance: "16.9 km",
    time: "30 min",
    from: { lat: 14.6565, lng: 121.0319, name: "North Avenue" },
    to: { lat: 14.5386, lng: 121.0004, name: "Taft Avenue" },
    steps: ["Enter North Avenue Station", "Take MRT-3 southbound", "Exit at Taft Avenue Station"],
  },
  {
    id: "4",
    name: "Jeep - Divisoria to Baclaran",
    type: "Jeepney",
    fare: { regular: 15, discounted: 12 },
    distance: "11.2 km",
    time: "50 min",
    from: { lat: 14.6042, lng: 120.9774, name: "Divisoria" },
    to: { lat: 14.5197, lng: 120.9933, name: "Baclaran" },
    steps: ["Board at Divisoria terminal", "Pass through Taft Avenue", "Alight at Baclaran Church"],
  },
  {
    id: "5",
    name: "UV Express - Fairview to Ortigas",
    type: "UV Express",
    fare: { regular: 45, discounted: 36 },
    distance: "18.5 km",
    time: "40 min",
    from: { lat: 14.7167, lng: 121.0583, name: "Fairview" },
    to: { lat: 14.5836, lng: 121.0569, name: "Ortigas" },
    steps: ["Board at Fairview terminal", "Express via Commonwealth", "Alight at Ortigas Center"],
  },
  {
    id: "6",
    name: "LRT-1 - Baclaran to Roosevelt",
    type: "LRT",
    fare: { regular: 30, discounted: 24 },
    distance: "20.7 km",
    time: "45 min",
    from: { lat: 14.5197, lng: 120.9933, name: "Baclaran" },
    to: { lat: 14.6544, lng: 121.0236, name: "Roosevelt" },
    steps: ["Enter Baclaran Station", "Take LRT-1 northbound", "Exit at Roosevelt Station"],
  },
  {
    id: "7",
    name: "Bus - Pasay to Monumento",
    type: "Bus",
    fare: { regular: 30, discounted: 24 },
    distance: "15.8 km",
    time: "55 min",
    from: { lat: 14.5378, lng: 121.0014, name: "Pasay" },
    to: { lat: 14.6542, lng: 120.9842, name: "Monumento" },
    steps: ["Board at Pasay Rotonda", "Via Taft and Rizal Avenue", "Alight at Monumento Circle"],
  },
  {
    id: "8",
    name: "Jeep - Mandaluyong to Pasig",
    type: "Jeepney",
    fare: { regular: 13, discounted: 10 },
    distance: "5.2 km",
    time: "20 min",
    from: { lat: 14.5794, lng: 121.0359, name: "Mandaluyong" },
    to: { lat: 14.5764, lng: 121.0851, name: "Pasig" },
    steps: ["Board at Shaw Boulevard", "Pass through EDSA", "Alight at Pasig City Hall"],
  },
  {
    id: "9",
    name: "UV Express - Antipolo to Cubao",
    type: "UV Express",
    fare: { regular: 50, discounted: 40 },
    distance: "22.1 km",
    time: "50 min",
    from: { lat: 14.5864, lng: 121.1755, name: "Antipolo" },
    to: { lat: 14.6191, lng: 121.0577, name: "Cubao" },
    steps: ["Board at Antipolo Cathedral", "Via Marcos Highway", "Alight at Farmers Plaza"],
  },
  {
    id: "10",
    name: "Jeep - Marikina to Cubao",
    type: "Jeepney",
    fare: { regular: 18, discounted: 14 },
    distance: "9.7 km",
    time: "35 min",
    from: { lat: 14.6507, lng: 121.1029, name: "Marikina" },
    to: { lat: 14.6191, lng: 121.0577, name: "Cubao" },
    steps: ["Board at Marikina City Hall", "Via Aurora Boulevard", "Alight at Gateway Mall"],
  },
  {
    id: "11",
    name: "Bus - BGC to Quezon City",
    type: "Bus",
    fare: { regular: 35, discounted: 28 },
    distance: "14.3 km",
    time: "45 min",
    from: { lat: 14.5547, lng: 121.0474, name: "BGC" },
    to: { lat: 14.6417, lng: 121.0358, name: "Quezon City" },
    steps: ["Board at Market Market", "Via C5 and EDSA", "Alight at SM North EDSA"],
  },
  {
    id: "12",
    name: "Jeep - Caloocan to Malabon",
    type: "Jeepney",
    fare: { regular: 13, discounted: 10 },
    distance: "6.8 km",
    time: "25 min",
    from: { lat: 14.6488, lng: 120.983, name: "Caloocan" },
    to: { lat: 14.6625, lng: 120.9569, name: "Malabon" },
    steps: ["Board at Monumento", "Via Rizal Avenue Extension", "Alight at Malabon City Hall"],
  },
  {
    id: "13",
    name: "UV Express - Las Piñas to Makati",
    type: "UV Express",
    fare: { regular: 40, discounted: 32 },
    distance: "16.5 km",
    time: "40 min",
    from: { lat: 14.4453, lng: 120.9831, name: "Las Piñas" },
    to: { lat: 14.5547, lng: 121.0244, name: "Makati" },
    steps: ["Board at Alabang-Zapote Road", "Express via Skyway", "Alight at Ayala Avenue"],
  },
  {
    id: "14",
    name: "LRT-2 - Santolan to Recto",
    type: "LRT",
    fare: { regular: 25, discounted: 20 },
    distance: "13.8 km",
    time: "30 min",
    from: { lat: 14.6097, lng: 121.0856, name: "Santolan" },
    to: { lat: 14.6031, lng: 120.9897, name: "Recto" },
    steps: ["Enter Santolan Station", "Take LRT-2 westbound", "Exit at Recto Station"],
  },
  {
    id: "15",
    name: "Jeep - Taguig to Pasay",
    type: "Jeepney",
    fare: { regular: 15, discounted: 12 },
    distance: "8.9 km",
    time: "30 min",
    from: { lat: 14.5176, lng: 121.0509, name: "Taguig" },
    to: { lat: 14.5378, lng: 121.0014, name: "Pasay" },
    steps: ["Board at FTI", "Via C5 and EDSA", "Alight at Pasay Rotonda"],
  },
  {
    id: "16",
    name: "Bus - Novaliches to Manila",
    type: "Bus",
    fare: { regular: 32, discounted: 26 },
    distance: "19.2 km",
    time: "60 min",
    from: { lat: 14.7269, lng: 121.0419, name: "Novaliches" },
    to: { lat: 14.5995, lng: 120.9842, name: "Manila" },
    steps: ["Board at Novaliches Bayan", "Via Quirino Highway and EDSA", "Alight at Quiapo"],
  },
  {
    id: "17",
    name: "Jeep - San Juan to Mandaluyong",
    type: "Jeepney",
    fare: { regular: 12, discounted: 10 },
    distance: "4.1 km",
    time: "15 min",
    from: { lat: 14.6019, lng: 121.0355, name: "San Juan" },
    to: { lat: 14.5794, lng: 121.0359, name: "Mandaluyong" },
    steps: ["Board at Pinaglabanan", "Via Aurora Boulevard", "Alight at Shaw Boulevard"],
  },
  {
    id: "18",
    name: "UV Express - Parañaque to Ortigas",
    type: "UV Express",
    fare: { regular: 55, discounted: 44 },
    distance: "21.7 km",
    time: "50 min",
    from: { lat: 14.4793, lng: 121.0198, name: "Parañaque" },
    to: { lat: 14.5836, lng: 121.0569, name: "Ortigas" },
    steps: ["Board at Sucat terminal", "Express via C5", "Alight at Megamall"],
  },
  {
    id: "19",
    name: "Jeep - Valenzuela to Malabon",
    type: "Jeepney",
    fare: { regular: 13, discounted: 10 },
    distance: "7.3 km",
    time: "25 min",
    from: { lat: 14.6937, lng: 120.983, name: "Valenzuela" },
    to: { lat: 14.6625, lng: 120.9569, name: "Malabon" },
    steps: ["Board at Valenzuela City Hall", "Via MacArthur Highway", "Alight at Malabon Market"],
  },
  {
    id: "20",
    name: "Bus - Navotas to Manila",
    type: "Bus",
    fare: { regular: 28, discounted: 22 },
    distance: "13.5 km",
    time: "45 min",
    from: { lat: 14.6625, lng: 120.9403, name: "Navotas" },
    to: { lat: 14.5995, lng: 120.9842, name: "Manila" },
    steps: ["Board at Navotas Fish Port", "Via R-10 and Rizal Avenue", "Alight at Divisoria"],
  },
  {
    id: "21",
    name: "Jeep - Pateros to Makati",
    type: "Jeepney",
    fare: { regular: 16, discounted: 13 },
    distance: "7.8 km",
    time: "30 min",
    from: { lat: 14.5436, lng: 121.0658, name: "Pateros" },
    to: { lat: 14.5547, lng: 121.0244, name: "Makati" },
    steps: ["Board at Pateros Market", "Via C5 and Kalayaan Avenue", "Alight at Guadalupe"],
  },
  {
    id: "22",
    name: "UV Express - Cavite to Pasay",
    type: "UV Express",
    fare: { regular: 60, discounted: 48 },
    distance: "25.4 km",
    time: "55 min",
    from: { lat: 14.2456, lng: 120.8792, name: "Cavite" },
    to: { lat: 14.5378, lng: 121.0014, name: "Pasay" },
    steps: ["Board at Bacoor terminal", "Express via Coastal Road", "Alight at EDSA-Taft"],
  },
]