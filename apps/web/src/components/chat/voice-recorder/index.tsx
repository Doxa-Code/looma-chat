"use client";
import { Mic, Pause, Send, Trash2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/button";
import { WaveformPlayer } from "./waveform-player";
import { WaveformRecorder } from "./waveform-recording";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

type Props = {
  onFinish: (file: File) => void;
  setStateRecording(state: boolean): void;
};

export const VoiceRecorder: React.FC<Props> = (props) => {
  const [recording, setRecording] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [blob, setBlob] = useState<Blob>();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationIdRef = useRef<number>(null);
  const pressTimer = useRef<NodeJS.Timeout | number>(0);
  const ffmpegRef = useRef(new FFmpeg());

  useEffect(() => {
    const load = async () => {
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg.loaded) {
        await ffmpeg.load();
      }
    };
    load();
  }, [ffmpegRef]);

  useEffect(() => {
    props.setStateRecording(recording);
  }, [recording]);

  const drawWaves = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    canvas.width = 300;
    canvas.height = 40;

    const analyser = analyserRef.current;
    analyser.fftSize = 2048;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const radiusX = 1;
    const spacing = 1;
    const scrollX = radiusX + spacing;

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);

      const img = ctx.getImageData(
        scrollX,
        0,
        canvas.width - scrollX,
        canvas.height
      );
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(img, 0, 0);

      ctx.fillStyle = "#6B7280";

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 255;
        const y = v * canvas.height;
        const x = canvas.width - scrollX + radiusX;
        const r = Math.PI;
        const w = 100;
        const h = 2;

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.fill();
      }

      animationIdRef.current = requestAnimationFrame(draw);
    };

    animationIdRef.current = requestAnimationFrame(draw);
  };

  const stopVisuals = () => {
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunks.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };

    recorder.onstop = async () => {
      const ffmpeg = ffmpegRef.current;
      let mimeType = "audio/webm";

      const blob = new Blob(chunks.current, { type: mimeType });
      await ffmpeg.writeFile("input.webm", await fetchFile(blob));
      await ffmpeg.exec(["-i", "input.webm", "-c:a", "libopus", "output.ogg"]);

      const data = (await ffmpeg.readFile("output.ogg")) as BlobPart;
      const convertedBlob = new Blob([data as any], { type: "audio/ogg" });

      const file = new File([convertedBlob], "recording.ogg", {
        type: "audio/ogg",
      });

      setBlob(blob);
      props.onFinish(file);
    };

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;

    drawWaves();

    recorder.start();
    mediaRecorder.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
    }
    setRecording(false);
    stopVisuals();
  };

  const handleStart = () => {
    pressTimer.current = setTimeout(() => {
      startRecording();
    }, 500);
  };

  const handleSend = () => {
    clearTimeout(pressTimer.current);
    stopRecording();
    setBlob(undefined);
  };

  const handleCancel = () => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.onstop = null;
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
    }
    setRecording(false);
    setBlob(undefined);
    stopVisuals();
    chunks.current = [];
  };

  const handleStop = () => {
    setStopped(true);
    stopVisuals();
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
  };

  if (!recording) {
    return (
      <Button
        className="rounded-full w-10 p-1 h-10"
        variant="ghost"
        type="button"
        onClick={handleStart}
      >
        <Mic className="size-5 stroke-[#0A0A0A]" />
      </Button>
    );
  }

  return (
    <div className="flex items-center space-x-2 w-full">
      <Button
        className="rounded-full w-10 h-10 p-2"
        variant="ghost"
        type="button"
        onClick={handleCancel}
      >
        <Trash2 className="size-5 stroke-1 stroke-[#0A0A0A]" />
      </Button>
      <div className="w-full h-screen max-h-10 border rounded-full pl-0 pr-4 flex gap-4">
        {recording && !stopped && (
          <WaveformRecorder analyserNode={analyserRef.current} />
        )}
        {blob && !recording && <WaveformPlayer blob={blob} />}
      </div>
      <Button
        className="rounded-full w-10 h-10 p-2"
        variant="ghost"
        type="button"
        onClick={handleStop}
        data-hidden={stopped}
      >
        <Pause className="size-5 stroke-1 fill-muted-foreground stroke-[#0A0A0A]" />
      </Button>
      <Button
        className="rounded-full w-10 h-10 p-2 bg-primary hover:bg-primary/90"
        variant="ghost"
        type="button"
        onClick={handleSend}
      >
        <Send className="size-5 rotate-45 stroke-1 fill-white stroke-primary -translate-x-0.5" />
      </Button>
    </div>
  );
};
