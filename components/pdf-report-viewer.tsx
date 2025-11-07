"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { PDFReportData } from "@/lib/pdf-generator"
import { generatePDFReport, downloadPDF } from "@/lib/pdf-generator"
import { uploadPDFToFirebase } from "@/lib/firebase-pdf-upload"
import { sendPDFViaWhatsApp } from "@/lib/whatsapp-pdf-api"

interface PDFReportViewerProps {
  reportData: PDFReportData
  patientId: string
  onClose: () => void
}

export default function PDFReportViewer({ reportData, patientId, onClose }: PDFReportViewerProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [showAnimation, setShowAnimation] = useState(true)

  const handleGenerateAndShare = async () => {
    try {
      setIsGenerating(true)
      console.log("[v0] Generating PDF...")

      const pdfBlob = await generatePDFReport(reportData)

      setIsUploading(true)
      console.log("[v0] Uploading PDF to Firebase...")

      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = `${reportData.fullName}_${reportData.serviceType}_${timestamp}.pdf`
      const uploadedUrl = await uploadPDFToFirebase(patientId, pdfBlob, filename)

      setPdfUrl(uploadedUrl)
      console.log("[v0] PDF uploaded:", uploadedUrl)

      await sendPDFViaWhatsApp({
        phoneNumber: reportData.phoneNumber,
        pdfUrl: uploadedUrl,
        patientName: reportData.fullName,
        score: reportData.score,
        serviceType: reportData.serviceType,
      })

      setIsGenerating(false)
      setIsUploading(false)
    } catch (error) {
      console.error("[v0] Error:", error)
      setIsGenerating(false)
      setIsUploading(false)
      alert("Error generating or uploading PDF. Please try again.")
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true)
      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = `${reportData.fullName}_${reportData.serviceType}_${timestamp}.pdf`
      await downloadPDF(reportData, filename)
      setIsGenerating(false)
    } catch (error) {
      console.error("[v0] Error downloading PDF:", error)
      setIsGenerating(false)
      alert("Error downloading PDF. Please try again.")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {showAnimation && (
        <div
          className="fixed inset-0 animate-fade-in"
          style={{
            animation: "fadeIn 0.5s ease-out",
          }}
          onClick={() => setShowAnimation(false)}
        />
      )}

      <Card className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-2xl z-10 relative">
        {isGenerating || isUploading ? (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div
                className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full"
                style={{
                  animation: "spin 1s linear infinite",
                }}
              />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {isGenerating ? "Generating PDF..." : "Uploading Report..."}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isGenerating ? "Creating professional report" : "Saving to Firebase"}
            </p>
          </div>
        ) : pdfUrl ? (
          <div className="space-y-4 text-center animate-slide-up">
            <div className="text-4xl">✅</div>
            <h3 className="text-xl font-semibold text-foreground">Report Ready!</h3>
            <p className="text-sm text-muted-foreground">Your PDF has been uploaded and shared via WhatsApp</p>
            <Button
              onClick={onClose}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 rounded-lg"
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-2 mb-4">
              <h2 className="text-2xl font-bold text-foreground">Generate Report</h2>
              <p className="text-muted-foreground text-sm">Create a professional PDF and share via WhatsApp</p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleGenerateAndShare}
                disabled={isGenerating || isUploading}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 rounded-lg disabled:opacity-50 transition-all"
              >
                📤 Generate & Send via WhatsApp
              </Button>
              <Button
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold py-3 rounded-lg border border-border disabled:opacity-50 transition-all"
              >
                ⬇️ Download PDF
              </Button>
            </div>
          </div>
        )}
      </Card>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}
