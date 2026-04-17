# PolyDub Product Requirements

## Overview

PolyDub is a multilingual communication app built with Next.js. Users can host live broadcasts, join language-specific listener pages, create or join rooms for multilingual communication, and upload videos for dubbing.

## Core user journeys

### Landing page

- Users open the home page and learn about the product.
- Users can navigate to Broadcast, Rooms, and VOD flows.
- Users can switch interface language from the header.

### Broadcast hosting

- Users open `/broadcast`.
- Users choose a source language and one or more target languages.
- Users can enable microphone access and optionally webcam access.
- Users can start a live broadcast and receive a listener link.

### Broadcast listening

- Listeners open `/broadcast/[lang]`.
- Listeners can hear dubbed audio for the selected language.
- Listeners can view live transcript updates.
- Listeners may see an optional webcam feed from the broadcaster.

### Rooms

- Users open `/rooms`.
- Users can create a room or join an existing room by room ID.
- Users can configure source language, target language, and voice preferences.
- Users can use microphone and optional camera inside `/room/[roomId]`.

### VOD dubbing

- Users open `/vod`.
- Users upload a supported video file.
- Users choose source and target languages and voice settings.
- Users start dubbing and later preview or export generated outputs.

## Constraints and risks

- Some flows depend on microphone or camera permissions.
- Live translation depends on a WebSocket backend and third-party APIs.
- VOD dubbing depends on backend routes and media-processing services.
