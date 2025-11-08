import jsPDF from "jspdf"
import "jspdf-autotable"
// These imports are now used to set the background
import medzealletterhead from "@/public/medzeal.png"
import medoraletterhead from "@/public/medora.png"

export interface PDFReportData {
  fullName: string
  phoneNumber: string
  serviceType: "medzeal" | "medora"
  score: number
  overallAssessment: string
  keyProblemPoints: string[]
  detectedProblems: Array<{
    problem: string
    description: string
    suggestedTreatment: string
  }>
  images: string[]
  analysisDate: string
}

// --- UPDATED ---
// Simplified config, as contact details are now in the PNG
const LETTERHEAD_CONFIG = {
  medzeal: {
    serviceTitle: "Facial Analysis Report",
  },
  medora: {
    serviceTitle: "Dental Analysis Report",
  },
}

export async function generatePDFReport(data: PDFReportData): Promise<Blob> {
  const config = LETTERHEAD_CONFIG[data.serviceType]
  const doc = new jsPDF("p", "mm", "a4")
  const pageHeight = doc.internal.pageSize.getHeight() // 297mm
  const pageWidth = doc.internal.pageSize.getWidth() // 210mm

  // --- NEW ---
  // Add the correct letterhead as a full-page background
  const backgroundImage =
    data.serviceType === "medzeal" ? medzealletterhead : medoraletterhead

  // Convert StaticImageData to base64 string for jsPDF
  const getBase64 = async (imgData: any): Promise<string> => {
    if (typeof imgData === "string") return imgData
    if ("src" in imgData && typeof imgData.src === "string") {
      // NextJS StaticImageData case -- fetch and convert to dataURL
      const res = await fetch(imgData.src)
      const blob = await res.blob()
      return await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    }
    throw new Error("Unknown image format for PDF letterhead.")
  }

  const backgroundImageData = await getBase64(backgroundImage)
  doc.addImage(backgroundImageData, "PNG", 0, 0, pageWidth, pageHeight)

  // --- UPDATED ---
  // Start content yPosition *after* the header area of the letterhead PNG
  let yPosition = 76

  // --- REMAINDER OF CODE IS POSITIONED BASED ON THE NEW STARTING YPOS ---

  // Report title section
  doc.setTextColor(30, 58, 138)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text(config.serviceTitle, 15, yPosition)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  yPosition += 6
  doc.text(`Report Date: ${data.analysisDate}`, 15, yPosition)

  // Separator line
  yPosition += 5
  doc.setDrawColor(30, 58, 138)
  doc.setLineWidth(0.5)
  doc.line(15, yPosition, pageWidth - 15, yPosition)

  // Patient Information (compact 2 columns)
  yPosition += 6
  doc.setTextColor(30, 58, 138)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Patient Information", 15, yPosition)

  yPosition += 5
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")

  const infoCol1X = 15
  const infoCol2X = 105

  doc.text(`Name: ${data.fullName}`, infoCol1X, yPosition)
  doc.text(`Score: ${data.score}/100`, infoCol2X, yPosition)

  yPosition += 4
  doc.text(`Phone: ${data.phoneNumber}`, infoCol1X, yPosition)
  doc.text(
    `Type: ${data.serviceType === "medzeal" ? "Facial" : "Dental"}`,
    infoCol2X,
    yPosition
  )

  // Overall Assessment (compact)
  yPosition += 6
  doc.setTextColor(30, 58, 138)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Overall Assessment", 15, yPosition)

  yPosition += 4
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  const assessmentLines = doc.splitTextToSize(
    data.overallAssessment,
    pageWidth - 30
  )
  doc.text(assessmentLines, 15, yPosition)
  yPosition += assessmentLines.length * 3 + 2

  // Key Findings (compact)
  if (data.keyProblemPoints.length > 0) {
    doc.setTextColor(30, 58, 138)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Key Findings", 15, yPosition)
    yPosition += 3

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    data.keyProblemPoints.slice(0, 3).forEach((point, index) => {
      const lines = doc.splitTextToSize(
        `${index + 1}. ${point}`,
        pageWidth - 25
      )
      doc.text(lines, 18, yPosition)
      yPosition += lines.length * 2.5 + 1
    })
  }

  // Images section (square thumbnails in a row)
  if (data.images.length > 0) {
    yPosition += 2
    doc.setTextColor(30, 58, 138)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Analysis Images", 15, yPosition)
    yPosition += 5

    // Calculate square size to fit 3 images in a row
    const imageSpacing = 5
    const totalWidth = pageWidth - 30 - imageSpacing * 2
    const imageSize = totalWidth / 3

    try {
      for (let i = 0; i < Math.min(data.images.length, 3); i++) {
        const xPos = 15 + i * (imageSize + imageSpacing)

        doc.addImage(
          data.images[i],
          "JPEG",
          xPos,
          yPosition,
          imageSize,
          imageSize
        )

        doc.setTextColor(100, 100, 100)
        doc.setFontSize(7)
        doc.setFont("helvetica", "normal")
        doc.text(`Image ${i + 1}`, xPos + imageSize / 2, yPosition + imageSize + 2, {
          align: "center",
        })
      }
    } catch (err) {
      console.error("[v0] Error adding image to PDF:", err)
    }
  }

  // --- REMOVED ---
  // The manual footer drawing code was here. It is no longer needed
  // as the InfiPlus logo is part of your letterhead PNG.

  return doc.output("blob")
}

export async function downloadPDF(
  data: PDFReportData,
  filename: string
): Promise<void> {
  const blob = await generatePDFReport(data)
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}  