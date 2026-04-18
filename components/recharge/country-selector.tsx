"use client"

import { useState } from "react"
import { Search, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRechargeStore } from "@/lib/stores"
import { cn } from "@/lib/utils"

export function CountrySelector() {
  const [search, setSearch] = useState("")
  const { countries, selectedCountry, setCountry, loadCarriers, setStep } = useRechargeStore()

  const filteredCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(search.toLowerCase()) ||
      country.code.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (country: typeof countries[0]) => {
    setCountry(country)
    loadCarriers(country.code)
    setStep(2)
  }

  // Group countries by first letter
  const groupedCountries = filteredCountries.reduce((acc, country) => {
    const letter = country.name.charAt(0).toUpperCase()
    if (!acc[letter]) {
      acc[letter] = []
    }
    acc[letter].push(country)
    return acc
  }, {} as Record<string, typeof countries>)

  const sortedLetters = Object.keys(groupedCountries).sort()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Select Country</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the destination country for the mobile top-up
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search countries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {sortedLetters.map((letter) => (
            <div key={letter}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {letter}
              </h3>
              <div className="space-y-1">
                {groupedCountries[letter].map((country) => (
                  <Card
                    key={country.code}
                    className={cn(
                      "cursor-pointer transition-all hover:bg-accent/50 border-0 shadow-none",
                      selectedCountry?.code === country.code && "bg-primary/10 ring-2 ring-primary"
                    )}
                    onClick={() => handleSelect(country)}
                  >
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{country.flag}</span>
                        <div>
                          <p className="font-medium">{country.name}</p>
                          <p className="text-xs text-muted-foreground">{country.dialCode}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
