export type ActionType = 'CLICK' | 'DRAG_MOVE' | 'MENU_OPEN' | 'TYPE_INPUT' | 'HOVER';
export type ScriptLanguage = 'vi' | 'en';

export const MAX_VIDEO_DURATION_SECONDS = 300; // 5 phút (300 giây)
export const RECOMMENDED_MAX_DURATION_SECONDS = 180; // 3 phút (180 giây)

export interface CursorPosition {
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
}

export interface DetectedMoment {
  id: string;
  timestamp: number; // in seconds
  timestampDisplay: string;
  cursorX: number; // 0 to 100
  cursorY: number; // 0 to 100
  actionType: ActionType;
  actionLabel: string;
  visualChangeScore: number; // 0 to 100
  frameThumbnail?: string; // data URL
}

export interface ScriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  timestampDisplay?: string;
  action: string;
  cursorPosition: CursorPosition;
  voiceoverText: string;
  emotion: string;
  calloutText?: string;
  audioUrl?: string;
  audioBlob?: Blob;
  audioDuration?: number;
  isGeneratingAudio?: boolean;
}

export interface FullScript {
  title: string;
  summary: string;
  estimatedSpeed: string;
  language?: ScriptLanguage;
  segments: ScriptSegment[];
}

export interface VideoSourceData {
  file?: File;
  url: string;
  name: string;
  duration: number;
  width: number;
  height: number;
  isSample?: boolean;
}

export interface VoiceSettings {
  engine: 'gemini' | 'browser';
  language: ScriptLanguage;
  geminiVoice: string;
  browserVoice: string;
  speechRate: number; // 0.8 to 1.3
  pitch: number;
  volume: number;
}

export interface ExportProgress {
  isExporting: boolean;
  progress: number; // 0 to 100
  currentPhase: string;
  exportedBlobUrl: string | null;
  exportedAudioUrl?: string | null;
  exportedMimeType: string;
  fileSizeMb?: number;
}
