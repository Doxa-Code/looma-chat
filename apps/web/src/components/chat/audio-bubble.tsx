"use client";
import { Message } from "@looma/core/domain/entities/message";
import { cx, formatTime } from "@/lib/utils";
import { Loader } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ProgressBar } from "../progress-bar";
import { Button } from "../ui/button";
import { MessageContainer } from "./message-container";

type Props = {
  message: Message.Raw;
  channel: string;
  hiddenAvatar: boolean;
};

export const AudioBubble: React.FC<Props> = (props) => {
  if (props.message?.type !== "audio") return <></>;

  let animationPlayerFrameId: number;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const widthPerBar = useMemo(() => 5, []);
  const svgHeight = useMemo(() => 45, []);
  const barWidth = useMemo(() => 3, []);
  const samples = useMemo(() => {
    return Math.floor(containerWidth / widthPerBar);
  }, [containerWidth, widthPerBar]);
  const [loading, setLoading] = useState(true);

  const progressIndex = useMemo(
    () =>
      duration > 0
        ? Math.floor((currentTime / duration) * amplitudes.length)
        : 0,
    [duration, currentTime, amplitudes]
  );

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [containerRef.current]);

  useEffect(() => {
    const audio = new Audio(
      `/api/message/${props.message.id}/audio?channel=${props.channel}`
    );
    audioRef.current = audio;

    audio.addEventListener("canplaythrough", () => handleReady());

    return () => {
      audio.pause();
      audio.src = "";
      audio.load();
      audio.removeEventListener("canplaythrough", () => handleReady());
    };
  }, []);

  useEffect(() => {
    if (ready && props.message.status !== "senting") {
      createAmplitudesFromBlob();
    }
  }, [props.message.status, ready]);

  useEffect(() => {
    if (isPlaying) {
      animationPlayerFrameId = requestAnimationFrame(updatePlayer);
    }
    return () => cancelAnimationFrame(animationPlayerFrameId);
  }, [isPlaying]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, duration, ready]);

  const handleReady = () => {
    if (audioRef.current) {
      setReady(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      handleSeek(e.clientX);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const updatePlayer = () => {
    const endIn = duration - 0.07;

    if (audioRef.current?.currentTime! >= endIn) {
      setIsPlaying(false);
      setCurrentTime(0);
      cancelAnimationFrame(animationPlayerFrameId);
      return;
    }

    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      animationPlayerFrameId = requestAnimationFrame(updatePlayer);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    handleSeek(e.clientX);
  };

  const createAmplitudesFromBlob = async () => {
    const response = await fetch(audioRef.current!.src);
    const arrayBuffer = await response.arrayBuffer();

    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    setDuration(audioBuffer.duration);

    const rawData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(rawData.length / samples);
    const amps: number[] = [];

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[i * blockSize + j]);
      }
      amps.push(sum);
    }

    setAmplitudes(amps);
    setLoading(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (clientX: number) => {
    if (!audioRef.current || !ready || duration === 0 || !isFinite(duration))
      return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = clientX - rect.left;
    const percent = Math.min(1, Math.max(0, clickX / rect.width));

    const newTime = percent * duration;
    if (!isFinite(newTime)) return;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return (
    <MessageContainer
      createdAt={props.message.createdAt}
      senderType={props.message.sender?.type}
      status={props.message.status}
      hiddenAvatar={props.hiddenAvatar}
      senderName={props.message.sender.name}
    >
      <div
        data-sender={props.message.sender?.type}
        className="group flex w-screen max-w-[250px] px-4 pt-5 flex-col items-start gap-3"
      >
        <div
          data-rounded={!props.hiddenAvatar}
          ref={containerRef}
          className={cx(
            "flex flex-col justify-start gap-2 w-full max-w-[320px] leading-1.5 border-gray-200",
            "group-data-[sender=attendant]:data-[rounded=false]:rounded-br-xl group-data-[sender=attendant]:rounded-l-xl group-data-[sender=attendant]:rounded-tr-xl group-data-[sender=attendant]:text-white",
            "group-data-[sender=contact]:rounded-tl-xl group-data-[sender=contact]:data-[rounded=false]:rounded-bl-xl group-data-[sender=contact]:rounded-r-xl group-data-[sender=contact]:rounded-br-xl "
          )}
        >
          <div
            className="w-full gap-4 flex justify-center items-center"
            data-hidden={!loading}
          >
            <Loader className="animate-spin group-data-[sender=contact]:stroke-primary" />
            <ProgressBar
              value={100}
              className="w-full rounded"
              classNameBar="bg-primary groud-data-[sender=attendant]:bg-white"
            />
          </div>
          <div data-hidden={loading} className="flex w-full items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full hover:bg-transparent"
              onClick={togglePlay}
            >
              <svg
                className="w-4 h-4 group-data-[sender=contact]:text-muted-foreground text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 12 16"
              >
                {isPlaying ? (
                  <path d="M3 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm7 0H9a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Z" />
                ) : (
                  <path d="M2 0v16l12-8L2 0z" />
                )}
              </svg>
            </Button>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${samples * widthPerBar} ${svgHeight}`}
              preserveAspectRatio="none"
              className="cursor-pointer  w-full h-10"
              onMouseDown={handleMouseDown}
              xmlns="http://www.w3.org/2000/svg"
            >
              {amplitudes.map((amp, i) => {
                const maxAmp = Math.max(...amplitudes);
                const height = (amp / maxAmp) * svgHeight + 1;
                const x = i * widthPerBar;
                const centerY = svgHeight / 2;
                const y = centerY - height / 2;

                return (
                  <rect
                    key={i}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={height}
                    rx={40}
                    data-progressed={i <= progressIndex}
                    className="group-data-[sender=contact]:fill-muted-foreground fill-white data-[progressed=true]:fill-[#5af3cf]"
                  />
                );
              })}

              {ready && (
                <rect
                  x={progressIndex * widthPerBar}
                  y={svgHeight / 2 - 5}
                  width={12}
                  height={12}
                  rx={12}
                  fill="#5af3cf"
                />
              )}
            </svg>
          </div>

          <span className="w-10 select-none text-xs">
            {ready ? formatTime(isPlaying ? currentTime : duration) : "00:00"}
          </span>
        </div>
      </div>
    </MessageContainer>
  );
};
