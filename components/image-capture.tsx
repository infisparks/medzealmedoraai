"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { FormData } from "@/app/page"
import { Camera } from "lucide-react"

interface ImageCaptureProps {
  formData: FormData & { patientId: string }
  onCapture: (images: string[], patientId: string) => void
}

export default function ImageCapture({ formData, onCapture }: ImageCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Effect to start the camera immediately
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      console.error("FATAL: NEXT_PUBLIC_GEMINI_API_KEY is missing")
      setError("AI configuration is missing. Please contact support.")
    }

    const startCamera = async () => {
      try {
        // Request camera with preference for user-facing (selfie) mode
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        })

        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          video.onloadedmetadata = () => {
            video.play().catch((err) => {
              console.error("Video play failed:", err)
              setError("Failed to play video. Please check permissions.")
            })
            setIsLoading(false)
          }
        }
      } catch (err) {
        console.error("Camera access error:", err)
        setError("Unable to access camera. Please check permissions.")
        setIsLoading(false)
      }
    }

    startCamera()

    // Cleanup: Stop camera tracks when component unmounts
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [])

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      if (videoRef.current.videoWidth === 0) {
        return
      }

      const context = canvasRef.current.getContext("2d")
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)

        // Capture high quality JPEG
        const photoData = canvasRef.current.toDataURL("image/jpeg", 0.95)
        setCapturedPhotos([...capturedPhotos, photoData])

        // Visual flash effect
        const video = videoRef.current
        video.style.opacity = "0.3"
        setTimeout(() => {
          video.style.opacity = "1"
        }, 200)
      }
    }
  }

  // Handle final submission
  const handleSubmit = async () => {
    setIsSubmitting(true)
    await onCapture(capturedPhotos, formData.patientId)
    setIsSubmitting(false)
  }

  const serviceLabel = formData.serviceType === "medzeal" ? "Medzeal Facial Scan" : "Medora Dental Scan"
  const isAllCaptured = capturedPhotos.length === 3

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{serviceLabel}</h1>
            <p className="text-muted-foreground">
              Please position your {formData.serviceType === "medzeal" ? "face" : "teeth"} in the frame.
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Video/Camera Area */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video shadow-inner">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground">Accessing camera...</p>
                </div>
              </div>
            )}
            
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`} 
            />
            
            {!error && !isLoading && (
              <div className="absolute inset-0 border-4 border-white/20 rounded-lg pointer-events-none" />
            )}
          </div>

          {/* Capture Controls */}
          <div className="flex flex-col items-center gap-6">
            {!isAllCaptured && !isSubmitting && (
              <button
                onClick={capturePhoto}
                disabled={isLoading || error !== null}
                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="w-16 h-16 rounded-full border-2 border-white flex items-center justify-center">
                   <div className="w-14 h-14 bg-white rounded-full group-hover:scale-90 transition-transform" />
                </div>
              </button>
            )}

            <div className="text-center">
              <p className="text-muted-foreground text-sm font-medium">
                {capturedPhotos.length} of 3 photos captured
              </p>
            </div>
          </div>

          {/* Photo Gallery - Horizontal Scroll or Grid */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className="aspect-square rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden relative"
              >
                {capturedPhotos[index - 1] ? (
                  <img
                    src={capturedPhotos[index - 1]}
                    alt={`Captured ${index}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground/30" />
                )}
                <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                    {index}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          {isAllCaptured && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg rounded-lg transition-all"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Images...</span>
                </div>
              ) : (
                "Analyze My Images"
              )}
            </Button>
          )}

          {/* Hidden Canvas for capture processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </Card>
    </div>
  )
}