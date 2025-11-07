const WHATSAPP_API_KEY = "4nAJab0oyVlworJu1veRaGfmvkO0yxf2"

export function shareReportViaWhatsApp(
  phoneNumber: string,
  patientName: string,
  serviceType: "medzeal" | "medora",
  report: string,
) {
  const message = `📋 *MedAnalysis Report*\n\nPatient: ${patientName}\nService: ${serviceType === "medzeal" ? "Facial Analysis" : "Dental Analysis"}\n\n${report}\n\nReport generated via MedAnalysis`

  const encodedMessage = encodeURIComponent(message)
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`

  window.open(whatsappUrl, "_blank")
}

export async function sendReportViaAPI(
  phoneNumber: string,
  patientName: string,
  reportContent: string,
): Promise<boolean> {
  try {
    const response = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber,
        patientName,
        reportContent,
        apiKey: WHATSAPP_API_KEY,
      }),
    })

    return response.ok
  } catch (error) {
    console.error("[v0] WhatsApp API error:", error)
    return false
  }
}
