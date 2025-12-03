export interface WhatsAppPDFShareRequest {
  phoneNumber: string
  pdfUrl: string // This is the public Firebase URL
  patientName: string
  score: number
  serviceType: "medzeal" | "medora"
}

// --- 🌟 API KEY FIX 🌟 ---
// The API key from your prompt is now placed here directly
// This will fix the 401 Unauthorized error.
const WHATSAPP_API_KEY = "4nAJab0oyVlworJu1veRaGfmvkO0yxf2"

export async function sendPDFViaWhatsApp(data: WhatsAppPDFShareRequest): Promise<void> {
  // We now use the hardcoded key from above
  const apiKey = WHATSAPP_API_KEY;

  // This check is no longer needed as the key is hardcoded
  // if (!apiKey) { ... }

  const serviceName = data.serviceType === "medzeal" ? "Facial Analysis" : "Dental Analysis";
  
  // Create the caption and payload as per your example
  const caption = `Dear ${data.patientName},\n\nYour ${serviceName} report is now available.\n\nRegards,\nMedAnalysis Team`;
  const friendlyFileName = `MedAnalysis_Report_${data.patientName.replace(/\s+/g, "_")}.pdf`;

  const payload = {
    number: "91" + data.phoneNumber.replace(/[^0-9]/g, ""), // Ensure "91" prefix
    mediatype: "document",
    mimetype: "application/pdf",
    caption: caption,
    media: data.pdfUrl, // The public Firebase URL
    fileName: friendlyFileName,
  };

  try {
    const res = await fetch("https://evo.infispark.in/message/sendMedia/mudassir", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "apikey": apiKey // Your API key
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorResponse = await res.text();
      console.error("[v0] WhatsApp API failed:", res.status, errorResponse);
      throw new Error(`Failed to send WhatsApp message: ${res.statusText}`);
    }

    const responseData = await res.json();
    console.log("[v0] WhatsApp API Success:", responseData);

  } catch (error) {
    console.error("[v0] Error sending WhatsApp API request:", error);
    // Re-throw the error so pdf-report-viewer.tsx can catch it
    throw error;
  }
}