import jsPDF from "jspdf"
import "jspdf-autotable"

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

const LETTERHEAD_CONFIG = {
  medzeal: {
    companyName: "Medzeal",
    phone: "+91 70441 78786",
    email: "medzealpcw@gmail.com",
    address: "near Bypass Y Junction",
    website: "medzeal.in",
    headerColor: "#1e3a8a",
    serviceTitle: "Facial Analysis Report",
  },
  medora: {
    companyName: "MEDORA",
    tagline: "From Care to Confidence, Redefining Dental Wellness",
    phone: "+91 97690 00093",
    email: "medora@gmail.com",
    address: "near Bypass Y Junction",
    website: "medora.org.in",
    headerColor: "#1e3a8a",
    serviceTitle: "Dental Analysis Report",
  },
}

export async function generatePDFReport(data: PDFReportData): Promise<Blob> {
  const config = LETTERHEAD_CONFIG[data.serviceType]
  const doc = new jsPDF("p", "mm", "a4")
  const pageHeight = doc.internal.pageSize.getHeight() // 297mm
  const pageWidth = doc.internal.pageSize.getWidth() // 210mm
  let yPosition = 0

  // Header background (professional letterhead top)
  doc.setFillColor(30, 58, 138) // #1e3a8a
  doc.rect(0, 0, pageWidth, 35, "F")

  // Company name and branding
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text(config.companyName, 15, 15)

  // Contact details on right side of header
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(`Tel: ${config.phone}`, pageWidth - 50, 12)
  doc.text(`Email: ${config.email}`, pageWidth - 50, 16)
  doc.text(`${config.address}`, pageWidth - 50, 20)
  doc.text(`Web: ${config.website}`, pageWidth - 50, 24)

  // Report title section
  yPosition = 42
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
  doc.text(`Type: ${data.serviceType === "medzeal" ? "Facial" : "Dental"}`, infoCol2X, yPosition)

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
  const assessmentLines = doc.splitTextToSize(data.overallAssessment, pageWidth - 30)
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
      const lines = doc.splitTextToSize(`${index + 1}. ${point}`, pageWidth - 25)
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

        doc.addImage(data.images[i], "JPEG", xPos, yPosition, imageSize, imageSize)

        doc.setTextColor(100, 100, 100)
        doc.setFontSize(7)
        doc.setFont("helvetica", "normal")
        doc.text(`Image ${i + 1}`, xPos + imageSize / 2, yPosition + imageSize + 2, { align: "center" })
      }
    } catch (err) {
      console.error("[v0] Error adding image to PDF:", err)
    }
  }

  // Footer with letterhead design
  doc.setFillColor(30, 58, 138)
  doc.rect(0, pageHeight - 8, pageWidth, 8, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("InfiPlus", pageWidth / 2, pageHeight - 3, { align: "center" })

  return doc.output("blob")
}

export async function downloadPDF(data: PDFReportData, filename: string): Promise<void> {
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
