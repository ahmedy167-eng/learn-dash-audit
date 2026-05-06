import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function VoiceRecorder({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = e => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setBusy(true);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const { data, error } = await supabase.functions.invoke('diary-ai', {
              body: { action: 'transcribe', audio_base64: base64, mime: 'audio/webm' },
            });
            if (error) throw error;
            const text = (data as any)?.transcript || '';
            if (text) { onTranscript(text); toast.success('Transcribed'); }
            else toast.error('No transcript');
          };
          reader.readAsDataURL(blob);
        } catch (e: any) {
          toast.error(e?.message || 'Transcription failed');
        } finally { setBusy(false); }
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
    } catch (e) {
      toast.error('Microphone access denied');
    }
  };

  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
  };

  return (
    <Button
      type="button"
      variant={recording ? 'destructive' : 'outline'}
      size="sm"
      onClick={recording ? stop : start}
      disabled={busy}
      className="gap-2"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {busy ? 'Transcribing…' : recording ? 'Stop' : 'Voice'}
    </Button>
  );
}
