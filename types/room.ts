export interface RoomMember {
  userId: string;
  sourceLanguage: string;
}

export interface TranscriptMessage {
  type: 'transcript' | 'partial';
  userId: string;
  original: string;
  translated?: string;
  timestamp: number;
  isSelf?: boolean;
  sourceLanguage?: string;
}

export interface VideoFrameMessage {
  type: 'video-frame';
  userId: string;
  data: string; // Base64
}
