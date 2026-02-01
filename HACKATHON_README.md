# PolyDub - Hackathon Implementation

## Overview
PolyDub is a real-time video dubbing web app built for the Lingo.dev hackathon. The UI has been adapted from an existing Next.js template while preserving the design system.

## Core Features Implemented

### 1. Video Upload Component
**File**: `components/polydub/video-upload.tsx`
- Drag-and-drop interface
- File browsing
- Selected video preview with file size
- Uses existing Card and Button components from the template

### 2. Video Player Component
**File**: `components/polydub/video-player.tsx`
- HTML5 video player with controls
- Real-time processing indicator badge
- Chunk processing status display
- Progress tracking for each chunk
- Visual indicators (completed, processing, pending)

### 3. Language Selector Component
**File**: `components/polydub/language-selector.tsx`
- Source and target language selection
- 12 supported languages (expandable)
- Prevents selecting same language for source/target
- Uses existing Select and Card components

### 4. Main Page
**File**: `app/page.tsx`
- Clean hero section with PolyDub branding
- Two-column layout (controls + player)
- "Start PolyDub" action button
- Mock progressive processing simulation
- "How It Works" section

### 5. Updated Header
**File**: `components/header.tsx`
- Simplified for hackathon demo
- PolyDub branding
- Lingo.dev hackathon badge

### 6. Updated Metadata
**File**: `app/layout.tsx`
- Updated title and description for PolyDub

## Design System Preservation
All components reuse the existing:
- **Colors**: baltic-sea palette (grays) + keppel accent (teal)
- **Fonts**: Geist and Geist Mono
- **Spacing**: Existing Tailwind spacing scale
- **Components**: Button, Card, Select, Input, Progress, Badge
- **Layout patterns**: max-w-[1400px] containers, responsive grids

## TODO Comments for Backend Integration

### Video Processing (`app/page.tsx`)
```typescript
// TODO: Implement real video processing
// TODO: Connect to backend API for video chunking
// TODO: Implement progressive audio dubbing
// TODO: Handle WebSocket connection for real-time updates
```

### Video Player (`components/polydub/video-player.tsx`)
```typescript
// TODO: Implement real-time video playback with dubbed audio chunks
// TODO: Sync video playback with chunk processing status
// TODO: Handle audio mixing (dubbed vocals + original background audio)
```

### Video Upload (`components/polydub/video-upload.tsx`)
```typescript
// TODO: Add file validation (video type, size limit)
```

### Language Selector (`components/polydub/language-selector.tsx`)
```typescript
// TODO: Expand language list based on supported dubbing languages
```

## Current Mock Behavior
The app currently includes a mock processing simulation:
- Creates 8 mock chunks when "Start PolyDub" is clicked
- Progressively marks chunks as processing → completed
- Each chunk takes ~3 seconds to process
- Visual indicators update in real-time

## Next Steps for Hackathon
1. **Backend Integration**: Connect to actual video processing API
2. **WebSocket**: Implement real-time updates from server
3. **Audio Processing**: Integrate Lingo.dev API for dubbing
4. **Video Chunking**: Implement proper video segmentation
5. **Audio Mixing**: Combine dubbed vocals with original background audio
6. **Download**: Add ability to download the final dubbed video

## Running the App
```bash
pnpm install
pnpm dev
```

Navigate to `http://localhost:3000` to see PolyDub in action.

## Demo Flow
1. Upload a video file
2. Select source language (e.g., English)
3. Select target language (e.g., Spanish)
4. Click "Start PolyDub"
5. Watch the mock processing in real-time
6. Video player shows processing status with chunk indicators

## Files Modified
- ✅ `app/page.tsx` - Main PolyDub interface
- ✅ `app/layout.tsx` - Updated metadata
- ✅ `components/header.tsx` - Simplified header with branding

## Files Created
- ✅ `components/polydub/video-upload.tsx`
- ✅ `components/polydub/video-player.tsx`
- ✅ `components/polydub/language-selector.tsx`

## Design Consistency
All new components match the existing template:
- Border radius: `rounded-lg`, `rounded-xl`
- Shadows: `shadow-sm`, `shadow-xs`
- Spacing: `gap-4`, `gap-6`, `py-4`, `px-6`
- Text colors: `text-foreground`, `text-muted-foreground`
- Accent color: `text-accent`, `bg-accent/10`
- Transitions: `transition-colors`, `transition-all`

---

**Ready for hackathon presentation** ✨
