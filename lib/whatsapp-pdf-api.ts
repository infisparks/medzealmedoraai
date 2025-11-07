export interface WhatsAppPDFShareRequest {
  phoneNumber: string
  pdfUrl: string
  patientName: string
  score: number
  serviceType: "medzeal" | "medora"
}

export async function sendPDFViaWhatsApp(data: WhatsAppPDFShareRequest): Promise<void> {
  try {
    const message = `📋 *MedAnalysis Report*\n\n👤 *Patient:* ${data.patientName}\n📊 *Score:* ${data.score}/100\n🔍 *Service:* ${
      data.serviceType === "medzeal" ? "Facial Analysis" : "Dental Analysis"
    }\n\n📎 *Report PDF:* ${data.pdfUrl}\n\nThank you for using our service!`

    const formattedPhone = data.phoneNumber.replace(/[^0-9]/g, "")
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`

    // Open WhatsApp with pre-filled message
    window.open(whatsappUrl, "_blank")

    console.log("[v0] WhatsApp message opened successfully")
  } catch (error) {
    console.error("[v0] Error opening WhatsApp:", error)
    throw error
  }
}
