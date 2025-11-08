"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { FormData } from "@/app/page"
import { useSpeechSynthesis } from "react-speech-kit"
import { analyzeLiveExpression } from "@/lib/gemini-api"
import { Sparkles } from "lucide-react" // Make sure to install lucide-react (npm install lucide-react)

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

  // 🌟 FIX 1: Add state to track if user has "started" the session
  const [hasStarted, setHasStarted] = useState(false)

  // --- LIVE FEEDBACK STATE ---
  const [liveFeedbackText, setLiveFeedbackText] = useState<string>("")
  const [isAnalyzingFrame, setIsAnalyzingFrame] = useState(false)
  const { speak, speaking, voices } = useSpeechSynthesis()
  
  // Find a Hindi voice if available
  const hindiVoice = voices.find((v: any) => v.lang.startsWith("hi-"))

  // Effect to start the camera
  useEffect(() => {
    // Check for API key (good for debugging)
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      console.error("FATAL: NEXT_PUBLIC_GEMINI_API_KEY is missing from .env.local");
      setError("AI configuration is missing. Please contact support.");
    }
    
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        })
        
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          // Wait for metadata to load before playing
          video.onloadedmetadata = () => {
            video.play().catch(err => {
              console.error("Video play failed:", err)
              setError("Failed to play video. Please check permissions.")
            });
            setIsLoading(false) // Set loading to false only when video is ready
          }
        }
      } catch (err) {
        console.error("Camera access error:", err)
        setError("Unable to access camera. Please check permissions.")
        setIsLoading(false)
      }
    }

    startCamera()

    return () => {
      // Cleanup: Stop video tracks on unmount
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, []) // Empty dependency array ensures this runs once on mount

  // --- EFFECT FOR LIVE ANALYSIS ---
  useEffect(() => {
    // 🌟 FIX 2: Do not run the loop if camera isn't ready OR if user hasn't clicked "Start"
    if (isLoading || error || !hasStarted) {
      return
    }

    const analysisInterval = setInterval(() => {
      if (!isAnalyzingFrame && !isSubmitting && videoRef.current && canvasRef.current) {
        
        const videoWidth = videoRef.current.videoWidth
        const videoHeight = videoRef.current.videoHeight
        
        if (videoWidth === 0 || videoHeight === 0) {
          console.warn("Video frame is not ready, skipping analysis.")
          return; 
        }
        
        setIsAnalyzingFrame(true)
        
        const context = canvasRef.current.getContext("2d")
        if (context) {
          canvasRef.current.width = 480
          canvasRef.current.height = (videoHeight * 480) / videoWidth
          context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)
          const photoData = canvasRef.current.toDataURL("image/jpeg", 0.5) 

          analyzeLiveExpression(photoData)
            .then(result => {
              if (result.expressionText && result.expressionText !== liveFeedbackText) {
                setLiveFeedbackText(result.expressionText)
                speak({ 
                  text: result.expressionText, 
                  voice: hindiVoice || undefined 
                })
              }
            })
            .catch(err => {
              console.warn("Frame analysis failed:", err)
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

  }, [isLoading, error, hasStarted, isAnalyzingFrame, isSubmitting, speak, hindiVoice, liveFeedbackText]) // Added 'hasStarted'

  // 🌟 FIX 3: Function to handle the "Start" click
  const handleStartSession = () => {
    setHasStarted(true)
    // This "primes" the audio by speaking a silent space
    // This gets the browser's permission to make sound
    speak({ text: " ", voice: hindiVoice || undefined })
    setLiveFeedbackText("Thoda smile kijiye!") // Give an initial instruction
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      if (videoRef.current.videoWidth === 0) {
        console.error("Cannot capture photo, video not ready.");
        return;
      }
      
      const context = canvasRef.current.getContext("2d")
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)
        const photoData = canvasRef.current.toDataURL("image/jpeg", 0.9)
        setCapturedPhotos([...capturedPhotos, photoData])

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
            
            {/* 🌟 FIX 4: Show the "Start" button overlay */}
            {!hasStarted && !isLoading && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10">
                <p className="text-lg font-medium text-white mb-6">Ready for your analysis?</p>
                <Button 
                  size="lg" 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 px-6 rounded-full text-lg"
                  onClick={handleStartSession}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Live Assistant
                </Button>
              </div>
            )}
            
            {/* --- LIVE FEEDBACK OVERLAY --- */}
            {/* This will only appear *after* 'hasStarted' is true */}
            {!isLoading && !error && hasStarted && (
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
          </div>

          {/* Instructions */}
          <div className="text-center">
            <p className="text-foreground font-medium mb-2">
              Please position your {formData.serviceType === "medzeal" ? "face" : "teeth"} in the frame.
            </p>
            <p className="text-muted-foreground text-sm">We will capture 3 photos</p>
          </div>

          {/* Capture Button */}
          {/* 🌟 FIX 5: Hide this button until the session has started */}
          {!isAllCaptured && !isSubmitting && hasStarted && (
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
Setting up...                  </div>
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
              onClick={handleSubmit}
              disabled={isSubmitting} // Disable button when submitting
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 rounded-lg transition-all disabled:opacity-70"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing in Progress...</span>
                </div>
              ) : (
                "Analyze My Images"
              )}
            </Button>
          )}

          {/* Hidden Canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </Card>
    </div>
  )
}