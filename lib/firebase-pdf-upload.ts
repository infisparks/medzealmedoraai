import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase"

export async function uploadPDFToFirebase(patientId: string, pdfBlob: Blob, filename: string): Promise<string> {
  try {
    const timestamp = new Date().getTime()
    const pdfRef = ref(storage, `reports/${patientId}/pdf_${timestamp}_${filename}`)

    await uploadBytes(pdfRef, pdfBlob)
    const downloadUrl = await getDownloadURL(pdfRef)

    console.log("[v0] PDF uploaded successfully:", downloadUrl)
    return downloadUrl
  } catch (error) {
    console.error("[v0] Error uploading PDF:", error)
    throw new Error("Failed to upload PDF report")
  }
}
