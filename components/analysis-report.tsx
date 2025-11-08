"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { FormData } from "@/app/page"
import { analyzeFacialImages, analyzeDentalImages } from "@/lib/gemini-api"
import { saveAnalysisReport, uploadImagesToFirebase } from "@/lib/firebase-utils"
// --- 🌟 NEW IMPORTS (Moved from pdf-report-viewer) ---
import { generatePDFReport, type PDFReportData } from "@/lib/pdf-generator"
import { uploadPDFToFirebase } from "@/lib/firebase-pdf-upload"
import { sendPDFViaWhatsApp } from "@/lib/whatsapp-pdf-api"
import { useToast } from "@/components/ui/use-toast" // For toast notifications

interface AnalysisReportProps {
  formData: FormData & { patientId: string }
  images: string[]
  onBack: () => void
}

interface AnalysisResult {
  score?: number
  skinClarityScore?: number
  oralHygieneScore?: number
  overallAssessment: string
  keyProblemPoints: string[]
  detectedProblems: Array<{
    problem: string
    description: string
    suggestedTreatment: string
  }>
}

export default function AnalysisReport({ formData, images, onBack }: AnalysisReportProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"findings" | "treatment">("findings")
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // --- 🌟 NEW STATES (Moved from pdf-report-viewer) ---
  const [isSending, setIsSending] = useState(false) // For the send button
  const { toast } = useToast()

  useEffect(() => {
    const performAnalysis = async () => {
      try {
        let result: AnalysisResult
        if (formData.serviceType === "medzeal") {
          result = await analyzeFacialImages(images)
        } else if (formData.serviceType === "medora") {
          result = await analyzeDentalImages(images)
        } else {
          throw new Error("Invalid service type")
        }

        setAnalysisData(result)

        const imageUrls = await uploadImagesToFirebase(formData.patientId, images)
        await saveAnalysisReport(formData.patientId, {
          ...result,
          imageUrls,
          serviceType: formData.serviceType,
        })

        console.log("[v0] Analysis completed and saved")
        setIsLoading(false)
      } catch (err: any) { 
        console.error("[v0] Analysis error:", err)
        setError(err.message || "Failed to analyze images. Please try again.")
        setIsLoading(false)
      }
    }

    if (formData.serviceType) {
      performAnalysis()
    } else {
      setError("Service type is missing. Please go back and re-select.")
      setIsLoading(false)
    }
  }, [formData, images])


  // --- 🌟 NEW WHATSAPP LOGIC (Moved from pdf-report-viewer) ---
  const handleWhatsAppShare = async (pdfReportData: PDFReportData) => {
    setIsSending(true)

    try {
      console.log("[v0] Generating PDF...");
      const pdfBlob = await generatePDFReport(pdfReportData)

      console.log("[v0] Uploading PDF to Firebase...");
      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = `${pdfReportData.fullName}_${pdfReportData.serviceType}_${timestamp}.pdf`
      const uploadedUrl = await uploadPDFToFirebase(formData.patientId, pdfBlob, filename)

      console.log("[v0] PDF uploaded:", uploadedUrl)
      console.log("[v0] Sending via WhatsApp API...");

      await sendPDFViaWhatsApp({
        phoneNumber: pdfReportData.phoneNumber,
        pdfUrl: uploadedUrl,
        patientName: pdfReportData.fullName,
        score: pdfReportData.score,
        serviceType: pdfReportData.serviceType,
      })

      console.log("[v0] WhatsApp send initiated.")
      toast({
        title: "✅ Report Sent!",
        description: "The PDF report has been successfully sent via WhatsApp.",
      })

    } catch (error: any) {
      console.error("[v0] Error sending report:", error)
      toast({
        variant: "destructive",
        title: "❌ Send Failed",
        description: error.message || "Could not send the report. Please try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  // ... (Loading and Error states are the same) ...
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="inline-block">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Analyzing images...</h2>
          <p className="text-muted-foreground">This may take a moment</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md bg-card border border-border rounded-xl p-6">
          <div className="text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-xl font-bold text-foreground">Analysis Failed</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              onClick={onBack}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 rounded-lg"
            >
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!analysisData || !formData.serviceType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md bg-card border border-border rounded-xl p-6">
          <div className="text-center space-y-4">
            <div className="text-4xl">🚫</div>
            <h2 className="text-xl font-bold text-foreground">Report Data Missing</h2>
            <p className="text-muted-foreground">Could not load report data. Please try again.</p>
            <Button
              onClick={onBack}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 rounded-lg"
            >
              Start Over
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const scoreKey = formData.serviceType === "medzeal" ? "skinClarityScore" : "oralHygieneScore"
  const scoreValue = analysisData[scoreKey as keyof AnalysisResult] || analysisData.score || 85

  // This data object is now created once and used by the send function
  const pdfReportData: PDFReportData = {
    fullName: formData.fullName,
    phoneNumber: formData.phoneNumber,
    serviceType: formData.serviceType, 
    score: typeof scoreValue === "number" ? scoreValue : 85,
    overallAssessment: analysisData.overallAssessment,
    keyProblemPoints: analysisData.keyProblemPoints,
    detectedProblems: analysisData.detectedProblems,
    images: images,
    analysisDate: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  }

  return (
    <>
      <div className="min-h-screen p-4 bg-background">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* ... (Header, Patient Details, Tabs, Content all remain the same) ... */}
          {/* Header */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-4xl font-bold text-foreground">Your Analysis Report</h1>
            <p className="text-muted-foreground">Comprehensive medical analysis results</p>
          </div>

          {/* Patient Details Card */}
          <Card className="bg-card border border-border rounded-xl p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Patient Name</p>
                <p className="text-foreground font-semibold text-lg">{formData.fullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Contact Number</p>
                <p className="text-foreground font-semibold text-lg">{formData.phoneNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Service Type</p>
                <p className="text-foreground font-semibold text-lg">
                  {formData.serviceType === "medzeal" ? "Facial Analysis" : "Dental Analysis"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Score</p>
                <p className="text-foreground font-semibold text-lg">
                  {typeof scoreValue === "number" ? scoreValue : 85}/100
                </p>
              </div>
            </div>
          </Card>

          {/* Tabbed Interface */}
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab("findings")}
                className={`px-6 py-3 font-medium transition-all border-b-2 ${
                  activeTab === "findings"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Key Findings
              </button>
              <button
                onClick={() => setActiveTab("treatment")}
                className={`px-6 py-3 font-medium transition-all border-b-2 ${
                  activeTab === "treatment"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Recommended Treatment
              </button>
            </div>

            {/* Content Sections */}
            <Card className="bg-card border border-border rounded-xl p-6">
              {activeTab === "findings" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground mb-4">Key Findings</h3>
                  <p className="text-foreground mb-4">{analysisData.overallAssessment}</p>
                  <ul className="space-y-3">
                    {analysisData.keyProblemPoints.map((finding, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mt-1">
                          <span className="text-accent font-semibold text-sm">{index + 1}</span>
                        </div>
                        <span className="text-foreground">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === "treatment" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground mb-4">Recommended Treatment</h3>
                  <ul className="space-y-3">
                    {analysisData.detectedProblems.map((problem, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mt-1">
                          <span className="text-accent font-semibold text-sm">{String.fromCharCode(65 + index)}</span>
                        </div>
                        <div className="flex-grow">
                          <p className="font-semibold text-foreground">{problem.problem}</p>
                          <p className="text-sm text-muted-foreground">{problem.description}</p>
                          <p className="text-sm text-accent mt-1">Treatment: {problem.suggestedTreatment}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>

          {/* Captured Images */}
          {images.length > 0 && (
            <Card className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Analysis Images</h3>
              <div className="grid grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden bg-background border border-border"
                  >
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`Captured image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* --- 🌟 UPDATED ACTION BUTTON 🌟 --- */}
          <div className="flex flex-col gap-3 sm:flex-row justify-center">
            <Button
              onClick={() => handleWhatsAppShare(pdfReportData)} // Pass the data
              disabled={isSending} // Disable button while sending
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 rounded-lg transition-all"
            >
              {isSending ? "Sending Report..." : "📤 Send Report to WhatsApp"}
            </Button>
          </div>

          {/* Back Button */}
          <div className="flex justify-center pt-4">
            <button onClick={onBack} className="text-accent hover:text-accent/80 font-medium transition-colors">
              ← Start New Analysis
            </button>
          </div>
        </div>
      </div>

      {/* --- 🌟 PDF VIEWER REMOVED 🌟 --- */}
      {/* The modal is no longer needed */}
    </>
  )
}     