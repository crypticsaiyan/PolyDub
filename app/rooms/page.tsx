"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Users, Plus } from "@phosphor-icons/react"

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{4,32}$/

export default function RoomsIndexPage() {
  const router = useRouter()
  const [roomId, setRoomId] = useState("")
  const [joinError, setJoinError] = useState<string | null>(null)

  const handleJoin = () => {
    const normalized = roomId.trim()
    if (!normalized) return

    if (!ROOM_ID_PATTERN.test(normalized)) {
      setJoinError("Room ID must be 4-32 chars and use only letters, numbers, _ or -.")
      return
    }

    setJoinError(null)
    router.push(`/room/${normalized}`)
  }

  const handleCreate = () => {
    const newId = Math.random().toString(36).substring(2, 8)
    router.push(`/room/${newId}`)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            Join or Create a Room
          </CardTitle>
          <CardDescription>
            Connect with others, translate conversations in real-time, and stream video.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Room ID</label>
            <div className="flex gap-2">
              <Input 
                placeholder="Enter Room ID" 
                value={roomId} 
                onChange={(e) => {
                  setRoomId(e.target.value)
                  if (joinError) setJoinError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
              <Button onClick={handleJoin} disabled={!roomId.trim()}>Join</Button>
            </div>
            {joinError && (
              <p className="text-sm text-destructive" role="alert">{joinError}</p>
            )}
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full" onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Room
          </Button>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground justify-center">
            PolyDub Rooms (Beta)
        </CardFooter>
      </Card>
    </div>
  )
}
