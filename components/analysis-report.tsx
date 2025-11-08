"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { FormData } from "@/app/page"
import { analyzeFacialImages, analyzeDentalImages } from "@/lib/gemini-api"
import { saveAnalysisReport, uploadImagesToFirebase } from "@/lib/firebase-utils"
import PDFReportViewer from "./pdf-report-viewer"

interface AnalysisReportProps {
  formData: FormData & { patientId: string }
  images: string[]
  onBack: () => void
}

// FIX: Added 'skinClarityScore' to the interface to match your score logic
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
  const [showPDFViewer, setShowPDFViewer] = useState(false)

  useEffect(() => {
    const performAnalysis = async () => {
      try {
        let result: AnalysisResult
        if (formData.serviceType === "medzeal") {
          result = await analyzeFacialImages(images)
        } else {
          // This is where the error for "medora" is happening.
          // The analyzeDentalImages function itself is failing.
          result = await analyzeDentalImages(images)
        }

        setAnalysisData(result)

        // Upload images to Firebase and save report
        const imageUrls = await uploadImagesToFirebase(formData.patientId, images)
        await saveAnalysisReport(formData.patientId, {
          ...result,
          imageUrls,
          serviceType: formData.serviceType,
        })

        console.log("[v0] Analysis completed and saved")
        setIsLoading(false)
      } catch (err) {
        // This catch block is being triggered by analyzeDentalImages(images)
        console.error("[v0] Analysis error:", err)
        setError("Failed to analyze images. Please try again.")
        setIsLoading(false)
      }
    }

    performAnalysis()
  }, [formData, images])

  const handleWhatsAppShare = () => {
    setShowPDFViewer(true)
  }

  const handleDownloadPDF = () => {
    setShowPDFViewer(true)
  }

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
            <h2 className="text-xl font-bold text-foreground">{error}</h2>
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

  if (!analysisData) {
    return null
  }

  // This logic is now correct because of the interface fix above
  const scoreKey = formData.serviceType === "medzeal" ? "skinClarityScore" : "oralHygieneScore"
  const score = analysisData[scoreKey as keyof AnalysisResult] || analysisData.score || 85

  const pdfReportData = {
    fullName: formData.fullName,
    phoneNumber: formData.phoneNumber,
    serviceType: formData.serviceType,
    score: typeof score === "number" ? score : 85,
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
                <p className="text-foreground font-semibold text-lg">{score}/100</p>
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

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row justify-center">
            <Button
              onClick={handleWhatsAppShare}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 rounded-lg transition-all"
            >
              📤 Send Report to WhatsApp
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold py-3 rounded-lg border border-border transition-all"
            >
              ⬇️ Download PDF Report
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

      {/* PDF viewer modal with professional animations */}
      {showPDFViewer && (
        <PDFReportViewer
          reportData={pdfReportData}
          patientId={formData.patientId}
          onClose={() => setShowPDFViewer(false)}
        />
      )}
    </>
  )
}