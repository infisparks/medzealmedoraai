import { ref, push, set, get } from "firebase/database"
import { ref as storageRef, uploadString, getDownloadURL } from "firebase/storage"
import { database, storage } from "./firebase"

interface PatientData {
  fullName: string
  phoneNumber: string
  serviceType: "medzeal" | "medora"
  timestamp: number
}

export async function savePatientData(formData: PatientData) {
  try {
    const patientsRef = ref(database, "patients")
    const newPatientRef = push(patientsRef)
    await set(newPatientRef, {
      ...formData,
      id: newPatientRef.key,
    })
    console.log("[v0] Patient data saved:", newPatientRef.key)
    return newPatientRef.key
  } catch (error) {
    console.error("[v0] Error saving patient data:", error)
    throw error
  }
}

export async function saveAnalysisReport(patientId: string, analysisData: unknown) {
  try {
    const reportsRef = ref(database, `reports/${patientId}`)
    await set(reportsRef, {
      ...analysisData,
      timestamp: new Date().toISOString(),
    })
    console.log("[v0] Analysis report saved for patient:", patientId)
  } catch (error) {
    console.error("[v0] Error saving analysis report:", error)
    throw error
  }
}

export async function uploadImagesToFirebase(patientId: string, images: string[]) {
  try {
    const uploadedUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const imageRef = storageRef(storage, `patients/${patientId}/image-${i + 1}.jpg`)
      await uploadString(imageRef, images[i], "data_url")
      const downloadUrl = await getDownloadURL(imageRef)
      uploadedUrls.push(downloadUrl)
    }

    console.log("[v0] Images uploaded to Firebase:", uploadedUrls)
    return uploadedUrls
  } catch (error) {
    console.error("[v0] Error uploading images:", error)
    throw error
  }
}

export async function getPatientReport(patientId: string) {
  try {
    const reportRef = ref(database, `reports/${patientId}`)
    const snapshot = await get(reportRef)
    return snapshot.exists() ? snapshot.val() : null
  } catch (error) {
    console.error("[v0] Error fetching patient report:", error)
    throw error
  }
}
