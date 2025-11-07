"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import type { FormData } from "@/app/page"
import { savePatientData } from "@/lib/firebase-utils"

interface IntakeFormProps {
  onSubmit: (data: FormData & { patientId: string }) => void
}

export default function IntakeForm({ onSubmit }: IntakeFormProps) {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    phoneNumber: "",
    serviceType: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFormValid =
    formData.fullName.trim() !== "" && formData.phoneNumber.length === 10 && formData.serviceType !== null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "phoneNumber") {
      const numbersOnly = value.replace(/\D/g, "").slice(0, 10)
      setFormData({ ...formData, [name]: numbersOnly })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleServiceSelect = (service: "medzeal" | "medora") => {
    setFormData({ ...formData, serviceType: service })
  }

  const handleSubmit = async () => {
    if (isFormValid) {
      setIsSubmitting(true)
      setError(null)
      try {
        const patientId = await savePatientData({
          ...formData,
          timestamp: new Date().getTime(),
        })
        onSubmit({ ...formData, patientId })
      } catch (err) {
        setError("Failed to save patient data. Please try again.")
        console.error("[v0] Submit error:", err)
        setIsSubmitting(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg">
        <div className="p-8 space-y-8">
          {/* Logo and Title */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-accent rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-accent-foreground">MA</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Welcome to MedAnalysis</h1>
            <p className="text-muted-foreground text-sm">Professional medical imaging analysis</p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-foreground font-medium">
                Full Name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground disabled:opacity-50"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-foreground font-medium">
                Mobile Number (10 Digits)
              </Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                maxLength={10}
                disabled={isSubmitting}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground disabled:opacity-50"
              />
              {formData.phoneNumber.length > 0 && formData.phoneNumber.length < 10 && (
                <p className="text-xs text-destructive">{10 - formData.phoneNumber.length} digits remaining</p>
              )}
            </div>
          </div>

          {/* Service Selection */}
          <div className="space-y-4">
            <p className="text-foreground font-medium">Please select your service:</p>
            <div className="space-y-3">
              {/* Medzeal Option */}
              <button
                onClick={() => handleServiceSelect("medzeal")}
                disabled={isSubmitting}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-4 disabled:opacity-50 ${
                  formData.serviceType === "medzeal"
                    ? "border-accent bg-accent/10"
                    : "border-border bg-background hover:border-accent/50"
                }`}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="text-left flex-grow">
                  <p className="font-semibold text-foreground">Medzeal</p>
                  <p className="text-sm text-muted-foreground">Facial Analysis</p>
                </div>
                {formData.serviceType === "medzeal" && (
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <svg className="w-3 h-3 text-accent-foreground" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {/* Medora Option */}
              <button
                onClick={() => handleServiceSelect("medora")}
                disabled={isSubmitting}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-4 disabled:opacity-50 ${
                  formData.serviceType === "medora"
                    ? "border-accent bg-accent/10"
                    : "border-border bg-background hover:border-accent/50"
                }`}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                </div>
                <div className="text-left flex-grow">
                  <p className="font-semibold text-foreground">Medora</p>
                  <p className="text-sm text-muted-foreground">Dental Analysis</p>
                </div>
                {formData.serviceType === "medora" && (
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <svg className="w-3 h-3 text-accent-foreground" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Next: Start Scan"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
