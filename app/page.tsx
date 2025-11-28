"use client"

import { useState } from "react"
import IntakeForm from "@/components/intake-form"
// FIX: Remove the curly braces { } around ImageCapture
import ImageCapture from "@/components/image-capture" 
import AnalysisReport from "@/components/analysis-report"

export interface FormData {
  fullName: string
  phoneNumber: string
  serviceType: "medzeal" | "medora" | null
}

export interface CapturedImages {
  images: string[]
}

export default function Page() {
  const [currentPage, setCurrentPage] = useState<1 | 2 | 3>(1)
  const [formData, setFormData] = useState<FormData & { patientId?: string }>({
    fullName: "",
    phoneNumber: "",
    serviceType: null,
  })
  const [capturedImages, setCapturedImages] = useState<CapturedImages>({
    images: [],
  })

  const handleIntakeSubmit = (data: FormData & { patientId: string }) => {
    setFormData(data)
    setCurrentPage(2)
  }

  const handleImageCapture = (images: string[], patientId: string) => {
    setCapturedImages({ images })
    setCurrentPage(3)
  }

  const handleBackToForm = () => {
    setCurrentPage(1)
    setFormData({
      fullName: "",
      phoneNumber: "",
      serviceType: null,
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {currentPage === 1 && <IntakeForm onSubmit={handleIntakeSubmit} />}
      {currentPage === 2 && formData.patientId && (
        <ImageCapture onCapture={handleImageCapture} formData={formData as FormData & { patientId: string }} />
      )}
      {currentPage === 3 && formData.patientId && (
        <AnalysisReport
          formData={formData as FormData & { patientId: string }}
          images={capturedImages.images}
          onBack={handleBackToForm}
        />
      )}
    </div>
  )
}