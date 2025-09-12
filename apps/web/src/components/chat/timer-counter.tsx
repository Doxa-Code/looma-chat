import { intervalToDuration } from "date-fns";
import { useEffect, useState } from "react";

interface TimeCounterProps {
  startDate: Date;
}

export const TimeCounter: React.FC<TimeCounterProps> = ({ startDate }) => {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    const updateElapsed = () => {
      const now = new Date();

      const duration = intervalToDuration({
        start: startDate,
        end: now,
      });

      const hours = String(duration.hours || 0).padStart(2, "0");
      const minutes = String(duration.minutes || 0).padStart(2, "0");
      const seconds = String(duration.seconds || 0).padStart(2, "0");

      setElapsed(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startDate]);

  return (
    <span className="font-mono text-xs bg-white text-rose-500 p-2 rounded border border-rose-500">
      {elapsed}
    </span>
  );
};
