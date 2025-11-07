"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { FormData } from "@/app/page"

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

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setIsLoading(false)
        }
      } catch (err) {
        setError("Unable to access camera. Please check permissions.")
        setIsLoading(false)
      }
    }

    startCamera()

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [])

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d")
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)
        const photoData = canvasRef.current.toDataURL("image/jpeg")
        setCapturedPhotos([...capturedPhotos, photoData])

        // Flash animation
        const video = videoRef.current
        video.style.opacity = "0.3"
        setTimeout(() => {
          video.style.opacity = "1"
        }, 200)
      }
    }
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
            <p className="text-muted-foreground">Professional analysis in progress</p>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Video/Loading State */}
          <div className="relative bg-background rounded-lg overflow-hidden aspect-video">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                  <div className="inline-block">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-muted-foreground">Initializing camera...</p>
                </div>
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {!error && !isLoading && (
              <div className="absolute inset-0 border-4 border-accent/30 rounded-lg pointer-events-none" />
            )}
          </div>

          {/* Instructions */}
          <div className="text-center">
            <p className="text-foreground font-medium mb-2">
              Please position your {formData.serviceType === "medzeal" ? "face" : "teeth"} in the frame.
            </p>
            <p className="text-muted-foreground text-sm">We will capture 3 photos</p>
          </div>

          {/* Capture Button */}
          {!isAllCaptured && (
            <div className="flex justify-center">
              <button
                onClick={capturePhoto}
                disabled={isLoading || error !== null}
                className="w-20 h-20 rounded-full bg-accent hover:bg-accent/90 flex items-center justify-center shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-10 h-10 text-accent-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                </svg>
              </button>
            </div>
          )}

          {/* Photo Gallery */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className="aspect-square rounded-lg bg-background border-2 border-accent/30 flex items-center justify-center overflow-hidden"
              >
                {capturedPhotos[index - 1] ? (
                  <img
                    src={capturedPhotos[index - 1] || "/placeholder.svg"}
                    alt={`Photo ${index}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">Photo {index}/3</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Status */}
          <div className="text-center">
            <p className="text-muted-foreground text-sm">{capturedPhotos.length} of 3 photos captured</p>
          </div>

          {/* Submit Button */}
          {isAllCaptured && (
            <Button
              onClick={() => onCapture(capturedPhotos, formData.patientId)}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 rounded-lg transition-all"
            >
              Analyze My Images
            </Button>
          )}

          {/* Hidden Canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </Card>
    </div>
  )
}
