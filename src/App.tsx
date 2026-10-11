import React, { useState } from 'react';
import { Header } from './components/Header';
import { StepNavigation, StepNumber } from './components/StepNavigation';
import { Step1Input } from './components/Step1Input';
import { Step2Analysis } from './components/Step2Analysis';
import { Step3Script } from './components/Step3Script';
import { Step4Voice } from './components/Step4Voice';
import { Step5Assembly } from './components/Step5Assembly';
import { DetectedMoment, FullScript, ScriptLanguage, VideoSourceData, VoiceSettings } from './types';

export default function App() {
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<StepNumber>>(new Set());

  // Project state
  const [language, setLanguage] = useState<ScriptLanguage>('vi');
  const [videoData, setVideoData] = useState<VideoSourceData | null>(null);
  const [topic, setTopic] = useState('Hướng dẫn tạo Video tự động bằng AI trên Flow');
  const [targetAudience, setTargetAudience] = useState(
    'Người mới bắt đầu (Beginner) - Giải thích từng bước dễ hiểu'
  );
  const [tone, setTone] = useState('Chuyên nghiệp, rõ ràng');
  const [voiceGender, setVoiceGender] = useState('Nữ');

  // Step 2 & 3 & 4 data
  const [detectedMoments, setDetectedMoments] = useState<DetectedMoment[]>([]);
  const [script, setScript] = useState<FullScript | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    engine: 'gemini',
    language: 'vi',
    geminiVoice: 'Kore',
    browserVoice: '',
    speechRate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  });

  const markStepComplete = (step: StepNumber) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  };

  const handleLanguageChange = (newLang: ScriptLanguage) => {
    setLanguage(newLang);
    setVoiceSettings((prev) => ({
      ...prev,
      language: newLang,
      geminiVoice: newLang === 'en' ? 'Zephyr' : 'Kore',
    }));
  };

  const handleResetProject = () => {
    if (videoData?.url) {
      URL.revokeObjectURL(videoData.url);
    }
    setVideoData(null);
    setDetectedMoments([]);
    setScript(null);
    setCurrentStep(1);
    setCompletedSteps(new Set());
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <Header
        onReset={handleResetProject}
        hasActiveProject={Boolean(videoData)}
      />

      {/* 5-Step Progress Bar Navigation */}
      <StepNavigation
        currentStep={currentStep}
        completedSteps={completedSteps}
        onSelectStep={(step) => setCurrentStep(step)}
      />

      {/* Main Studio Workspace */}
      <main className="flex-1 px-4 lg:px-8 pb-16">
        {currentStep === 1 && (
          <Step1Input
            videoData={videoData}
            onVideoSelected={(video) => setVideoData(video)}
            language={language}
            onLanguageChange={handleLanguageChange}
            topic={topic}
            onTopicChange={setTopic}
            targetAudience={targetAudience}
            onTargetAudienceChange={setTargetAudience}
            tone={tone}
            onToneChange={setTone}
            voiceGender={voiceGender}
            onVoiceGenderChange={setVoiceGender}
            onProceedToStep2={() => {
              markStepComplete(1);
              setCurrentStep(2);
            }}
          />
        )}

        {currentStep === 2 && videoData && (
          <Step2Analysis
            videoData={videoData}
            detectedMoments={detectedMoments}
            onMomentsAnalyzed={(moments) => setDetectedMoments(moments)}
            onProceedToStep3={() => {
              markStepComplete(2);
              setCurrentStep(3);
            }}
          />
        )}

        {currentStep === 3 && videoData && (
          <Step3Script
            videoData={videoData}
            language={language}
            topic={topic}
            tone={tone}
            targetAudience={targetAudience}
            voiceGender={voiceGender}
            detectedMoments={detectedMoments}
            script={script}
            onScriptGenerated={(genScript) => setScript(genScript)}
            onProceedToStep4={() => {
              markStepComplete(3);
              setCurrentStep(4);
            }}
          />
        )}

        {currentStep === 4 && script && (
          <Step4Voice
            script={script}
            onScriptUpdated={(updated) => setScript(updated)}
            voiceSettings={voiceSettings}
            onVoiceSettingsChange={setVoiceSettings}
            onProceedToStep5={() => {
              markStepComplete(4);
              setCurrentStep(5);
            }}
          />
        )}

        {currentStep === 5 && videoData && script && (
          <Step5Assembly
            videoData={videoData}
            script={script}
            voiceSettings={voiceSettings}
            onBackToScript={() => setCurrentStep(3)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-6 px-4 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © AutoVoice AI Studio • Trợ lý tự động hóa lồng tiếng video Camtasia với Gemini 3.8 Flash
          </p>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>Tiếng Việt &amp; English</span>
            <span>•</span>
            <span>Giới hạn video 5 phút</span>
            <span>•</span>
            <span>Tải xuống chuẩn MP4 / WebM / SRT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
