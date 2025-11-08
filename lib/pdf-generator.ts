import jsPDF from "jspdf"
import autoTable from "jspdf-autotable" // Make sure autotable is imported
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
  images: string[] // This is still here, but we just won't use it
  analysisDate: string
}

// Simplified config
const LETTERHEAD_CONFIG = {
  medzeal: {
    serviceTitle: "Facial Analysis Report",
  },
  medora: {
    serviceTitle: "Dental Analysis Report",
  },
}

// --- 🌟 UPDATED RECOMMENDED SERVICES (with descriptions) 🌟 ---
const RECOMMENDED_SERVICES = {
  medzeal: [
    { service: "HydraFacial Treatment", description: "Deeply cleanses, exfoliates, and hydrates the skin." },
    { service: "Chemical Peels (AHA/BHA)", description: "Improves skin texture and tone by removing outer layers." },
    { service: "Laser Skin Resurfacing", description: "Reduces wrinkles, scars, and blemishes using laser light." },
    { service: "Microneedling Session", description: "Stimulates collagen production to improve skin elasticity." },
    { service: "Dermal Fillers Consultation", description: "Discuss options for restoring volume and smoothing lines." },
  ],
  medora: [
    { service: "Professional Dental Cleaning", description: "Removes plaque and tartar buildup for optimal oral health." },
    { service: "Teeth Whitening (Zoom/Laser)", description: "Brightens and whitens teeth for a more confident smile." },
    { service: "Orthodontic Consultation", description: "Assesses need for braces or Invisalign to straighten teeth." },
    { service: "Gum Disease Treatment", description: "Addresses gingivitis or periodontitis to protect gums." },
    { service: "Cavity Filling or Dental Crown", description: "Restores teeth damaged by decay." },
  ],
}

// Helper function to convert Next.js static image to base64
const getBase64 = async (imgData: any): Promise<string> => {
  if (typeof imgData === "string") return imgData
  if ("src" in imgData && typeof imgData.src === "string") {
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

export async function generatePDFReport(data: PDFReportData): Promise<Blob> {
  const config = LETTERHEAD_CONFIG[data.serviceType]
  const doc = new jsPDF("p", "mm", "a4")
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - (margin * 2)

  const backgroundImage =
    data.serviceType === "medzeal" ? medzealletterhead : medoraletterhead
  
  const backgroundImageData = await getBase64(backgroundImage)
  doc.addImage(backgroundImageData, "PNG", 0, 0, pageWidth, pageHeight)

  let yPosition = 76 // Start content yPosition *after* the header

  // Report title section
  doc.setTextColor(30, 58, 138)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text(config.serviceTitle, margin, yPosition)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  yPosition += 6
  doc.text(`Report Date: ${data.analysisDate}`, margin, yPosition)

  // Separator line
  yPosition += 5
  doc.setDrawColor(30, 58, 138)
  doc.setLineWidth(0.5)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)

  // Patient Information
  yPosition += 6
  doc.setTextColor(30, 58, 138)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Patient Information", margin, yPosition)

  yPosition += 5
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  const infoCol1X = margin
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

  // Overall Assessment
  yPosition += 6
  doc.setTextColor(30, 58, 138)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Overall Assessment", margin, yPosition)

  yPosition += 4
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  const assessmentLines = doc.splitTextToSize(
    data.overallAssessment,
    contentWidth
  )
  doc.text(assessmentLines, margin, yPosition)
  yPosition += assessmentLines.length * 3 + 2

  // Key Findings
  if (data.keyProblemPoints.length > 0) {
    yPosition += 2
    doc.setTextColor(30, 58, 138)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Key Findings", margin, yPosition)
    yPosition += 3

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    data.keyProblemPoints.slice(0, 3).forEach((point, index) => {
      const lines = doc.splitTextToSize(
        `${index + 1}. ${point}`,
        contentWidth - 3 // indent
      )
      doc.text(lines, margin + 3, yPosition)
      yPosition += lines.length * 2.5 + 1
    })
  }

  // --- 🌟 NEW MODERN SERVICES TABLE 🌟 ---
  yPosition += 4
  doc.setTextColor(30, 58, 138)
  doc.setFontSize(10) // Make this a main header
  doc.setFont("helvetica", "bold")
  doc.text("Recommended Services", margin, yPosition)
  yPosition += 5
  
  const services = RECOMMENDED_SERVICES[data.serviceType];
  const tableBody = services.map(item => [item.service, item.description]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Service', 'Description']],
    body: tableBody,
    theme: 'grid', // Use 'grid' for a modern, clean look
    headStyles: {
      fillColor: [30, 58, 138], // Dark blue header
      textColor: [255, 255, 255], // White text
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 }, // Service name column
      1: { cellWidth: 'auto' }, // Description column
    },
    margin: { left: margin, right: margin },
    // This hook adds the letterhead to any new pages
    didDrawPage: (hookData) => {
      if (hookData.pageNumber > 1) {
         doc.addImage(backgroundImageData, "PNG", 0, 0, pageWidth, pageHeight);
      }
    }
  });

  // REMOVED IMAGE SECTION

  return doc.output("blob")
}

// This function is no longer called, but we leave it
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