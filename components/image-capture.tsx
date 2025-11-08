"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { FormData } from "@/app/page"
import { useSpeechSynthesis } from "react-speech-kit"
import { analyzeLiveExpression } from "@/lib/gemini-api"

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

  // --- LIVE FEEDBACK STATE ---
  const [liveFeedbackText, setLiveFeedbackText] = useState<string>("")
  const [isAnalyzingFrame, setIsAnalyzingFrame] = useState(false)
  const { speak, speaking, voices } = useSpeechSynthesis()
  
  // Find a Hindi voice if available
  const hindiVoice = voices.find((v: any) => v.lang.startsWith("hi-"))

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

  // --- EFFECT FOR LIVE ANALYSIS ---
  useEffect(() => {
    if (isLoading || error || capturedPhotos.length === 3) {
      return // Don't run analysis if camera isn't ready or if capture is done
    }

    // This timer will capture a frame every 3 seconds for analysis
    const analysisInterval = setInterval(() => {
      if (!isAnalyzingFrame && videoRef.current && canvasRef.current) {
        setIsAnalyzingFrame(true)
        
        // Capture a frame (same logic as capturePhoto but smaller)
        const context = canvasRef.current.getContext("2d")
        if (context) {
          const videoWidth = videoRef.current.videoWidth
          const videoHeight = videoRef.current.videoHeight
          
          // Set canvas to smaller size for faster processing
          canvasRef.current.width = 480
          canvasRef.current.height = (videoHeight * 480) / videoWidth
          
          context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)
          
          // Get low-quality JPEG for speed
          const photoData = canvasRef.current.toDataURL("image/jpeg", 0.5) 

          // Send for analysis in the background
          analyzeLiveExpression(photoData)
            .then(result => {
              if (result.expressionText && result.expressionText !== liveFeedbackText) {
                setLiveFeedbackText(result.expressionText)
                // Speak the text
                speak({ 
                  text: result.expressionText, 
                  voice: hindiVoice || undefined 
                })
              }
            })
            .catch(err => {
              console.warn("Frame analysis failed:", err)
              // Don't show an error, just fail silently
            })
            .finally(() => {
              setIsAnalyzingFrame(false)
            })
        } else {
          setIsAnalyzingFrame(false)
        }
      }
    }, 3000) // Analyze every 3 seconds

    return () => clearInterval(analysisInterval) // Cleanup on unmount

  }, [isLoading, error, capturedPhotos.length, isAnalyzingFrame, speak, hindiVoice, liveFeedbackText])


  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d")
      if (context) {
        // Set full resolution for saved photo
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)
        
        // Get high-quality JPEG for analysis
        const photoData = canvasRef.current.toDataURL("image/jpeg", 0.9)
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
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!error && !isLoading && (
              <div className="absolute inset-0 border-4 border-accent/30 rounded-lg pointer-events-none" />
            )}
            
            {/* --- LIVE FEEDBACK OVERLAY --- */}
            {!isLoading && !error && !isAllCaptured && (
              <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
                <div
                  className={`transition-all duration-300 bg-black/70 text-white px-4 py-2 rounded-full shadow-lg ${
                    liveFeedbackText && !speaking ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                  } ${
                    speaking && "opacity-100 translate-y-0" // Stay visible while speaking
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Speaking Effect */}
                    {speaking && (
                      <div className="flex gap-0.5 items-end h-4 w-4">
                        <span className="w-1 bg-white animate-speak-bar" style={{ animationDelay: "0s" }}></span>
                        <span className="w-1 bg-white animate-speak-bar" style={{ animationDelay: "0.2s" }}></span>
                        <span className="w-1 bg-white animate-speak-bar" style={{ animationDelay: "0.4s" }}></span>
                        <span className="w-1 bg-white animate-speak-bar" style={{ animationDelay: "0.6s" }}></span>
                      </div>
                    )}
                    <span className="text-sm font-medium">{liveFeedbackText}</span>
                  </div>
                </div>
              </div>
            )}
            {/* --- END OF OVERLAY --- */}

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
                    src={capturedPhotos[index - 1]}
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