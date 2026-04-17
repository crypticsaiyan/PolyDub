"use client"

import { useState, useRef } from "react"
import { VideoUpload } from "@/components/polydub/video-upload"
import { LanguageSelector } from "@/components/polydub/language-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DownloadSimple, Play, Pause, CircleNotch, VideoCamera } from "@phosphor-icons/react"
import { toast } from "sonner"

export default function VODPage() {
  const [sourceLanguage, setSourceLanguage] = useState("auto")
  const [targetLanguages, setTargetLanguages] = useState<string[]>(["es"])
  const [targetVoices, setTargetVoices] = useState<Record<string, string>>({})
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ srt: string; mp3Url: string; videoUrl: string } | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuxing, setIsMuxing] = useState(false)

  const handleDubVideo = async () => {
    if (!selectedVideo || targetLanguages.length === 0) return
    
    setIsProcessing(true)
    setError(null)
    setResult(null)
    
    try {
      const formData = new FormData()
      formData.append("file", selectedVideo)
      formData.append("sourceLanguage", sourceLanguage)
      formData.append("targetLanguage", targetLanguages[0])
      if (targetVoices[targetLanguages[0]]) {
         formData.append("voiceId", targetVoices[targetLanguages[0]])
      }

      const res = await fetch("/api/dub", {
        method: "POST",
        body: formData
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to dub video")
      }

      const data = await res.json()
      
      const audioBlob = b64toBlob(data.mp3, "audio/mpeg")
      const audioUrl = URL.createObjectURL(audioBlob)
      const videoUrl = URL.createObjectURL(selectedVideo)
      
      setResult({
        srt: data.srt,
        mp3Url: audioUrl,
        videoUrl: videoUrl
      })

    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const togglePlay = () => {
    if (videoRef.current && audioRef.current) {
        if (isPlaying) {
            videoRef.current.pause()
            audioRef.current.pause()
        } else {
            // Mute original video
            videoRef.current.muted = true
            videoRef.current.play()
            audioRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }
  }

  const handleVideoSelect = (file: File | null) => {
    setSelectedVideo(file)
    setResult(null)
    if (!file) {
      setIsPlaying(false)
    }
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadMp3 = () => {
     if (result?.mp3Url) {
        const a = document.createElement("a")
        a.href = result.mp3Url
        a.download = `dubbed_${targetLanguages[0]}.mp3`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
     }
  }

  const downloadVideo = async () => {
     if (!selectedVideo || !result?.mp3Url) return;
     setIsMuxing(true);
     try {
       const audioBlob = await fetch(result.mp3Url).then(r => r.blob());
       const formData = new FormData();
       formData.append("video", selectedVideo);
       formData.append("audio", new File([audioBlob], "audio.mp3", { type: "audio/mpeg" }));
       
       const res = await fetch("/api/mux", {
         method: "POST",
         body: formData
       });
       
       if (!res.ok) throw new Error("Failed to process video");
       const blob = await res.blob();
       const url = URL.createObjectURL(blob);
       const a = document.createElement("a");
       a.href = url;
       a.download = `dubbed_video_${targetLanguages[0]}.mp4`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
     } catch (e: any) {
        toast.error("Failed to download video: " + (e.message || "Unknown error"));
     } finally {
        setIsMuxing(false);
     }
  };

  return (
    <div className="flex-1 w-full bg-background pt-16 min-h-screen">
      <main>
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-6 lg:px-12">
            <div className="mb-8">
               <h1 className="text-3xl font-bold mb-2">Video Dubbing Studio (VOD)</h1>
               <p className="text-muted-foreground">Upload a video file, select your target language, and generate a fully dubbed MP3 audio track and SRT subtitles instantly.</p>
              <p className="text-sm font-medium mt-3">Project configuration</p>
              <p className="text-xs text-muted-foreground">VOD project-configuration</p>
            </div>
          
            <div className="flex flex-col gap-6">
              <LanguageSelector
                sourceLanguage={sourceLanguage}
                targetLanguages={targetLanguages}
                targetVoices={targetVoices}
                onSourceLanguageChange={setSourceLanguage}
                onToggleTargetLanguage={(lang) => setTargetLanguages([lang])} // Only allow 1 for VOD
                onVoiceChange={(lang, v) => setTargetVoices({ ...targetVoices, [lang]: v })}
                disabled={isProcessing}
              />

              <VideoUpload onVideoSelect={handleVideoSelect} selectedVideo={selectedVideo} />

              <div className="flex justify-end">
                  <Button 
                     size="lg" 
                     onClick={handleDubVideo} 
                     disabled={!selectedVideo || isProcessing || targetLanguages.length === 0}
                     className="w-full sm:w-auto"
                  >
                      {isProcessing ? (
                         <><CircleNotch className="h-5 w-5 animate-spin mr-2" /> Processing...</>
                      ) : "Dub Video"}
                  </Button>
              </div>

              {error && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                   {error}
                </div>
              )}

              {result && (
                <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                   <h2 className="text-2xl font-semibold border-b pb-2">Results</h2>
                   
                   <div className="grid gap-6 md:grid-cols-2">
                       <div className="space-y-4">
                           <Card className="overflow-hidden bg-black/90">
                              <div className="relative aspect-video flex items-center justify-center">
                                  <video 
                                     ref={videoRef} 
                                     src={result.videoUrl} 
                                     className="w-full h-full"
                                     onEnded={() => setIsPlaying(false)}
                                  />
                                  <audio ref={audioRef} src={result.mp3Url} />
                                  
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                                      <Button 
                                         size="icon" 
                                         variant="secondary" 
                                         className="h-16 w-16 rounded-full"
                                         onClick={togglePlay}
                                      >
                                         {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                                      </Button>
                                  </div>
                              </div>
                           </Card>
                           <p className="text-sm text-center text-muted-foreground flex gap-2 justify-center">
                               Preview plays Original Video + Dubbed Audio
                           </p>
                       </div>

                       <div className="space-y-4 flex flex-col justify-center">
                           <Button variant="default" className="w-full h-14 justify-start gap-3" onClick={downloadVideo} disabled={isMuxing}>
                               <div className="h-8 w-8 bg-background/20 rounded flex items-center justify-center">
                                  {isMuxing ? <CircleNotch className="h-4 w-4 animate-spin" /> : <VideoCamera className="h-4 w-4" />}
                               </div>
                               <div className="text-left">
                                  <p className="font-semibold text-sm">{isMuxing ? "Processing..." : "Download Dubbed Video"}</p>
                                  <p className="text-xs text-primary-foreground/70">MP4 with translated audio</p>
                               </div>
                           </Button>
                           
                           <Button variant="outline" className="w-full h-14 justify-start gap-3" onClick={downloadMp3}>
                               <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center">
                                  <DownloadSimple className="h-4 w-4 text-primary" />
                               </div>
                               <div className="text-left">
                                  <p className="font-semibold text-sm">Download Dubbed Audio</p>
                                  <p className="text-xs text-muted-foreground">High quality MP3</p>
                               </div>
                           </Button>
                           
                           <Button variant="outline" className="w-full h-14 justify-start gap-3" onClick={() => downloadFile(result.srt, `subtitles_${targetLanguages[0]}.srt`, "text/plain")}>
                               <div className="h-8 w-8 bg-accent/10 rounded flex items-center justify-center">
                                  <DownloadSimple className="h-4 w-4 text-accent" />
                               </div>
                               <div className="text-left">
                                  <p className="font-semibold text-sm">Download Subtitles</p>
                                  <p className="text-xs text-muted-foreground">SRT format</p>
                               </div>
                           </Button>
                       </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function b64toBlob(b64Data: string, contentType = '', sliceSize = 512) {
  const byteCharacters = atob(b64Data)
  const byteArrays = []

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize)

    const byteNumbers = new Array(slice.length)
    for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    byteArrays.push(byteArray)
  }

  const blob = new Blob(byteArrays, {type: contentType})
  return blob
}
