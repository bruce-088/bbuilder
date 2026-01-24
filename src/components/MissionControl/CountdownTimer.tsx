import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Flame } from "lucide-react";

interface CountdownTimerProps {
  targetDate: Date;
  label?: string;
}

export default function CountdownTimer({ targetDate, label = "to First Customer" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = targetDate.getTime() - new Date().getTime();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isExpired: false,
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const isUrgent = timeLeft.days <= 3 && !timeLeft.isExpired;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl p-4 border ${
        isUrgent 
          ? "bg-destructive/10 border-destructive/30" 
          : "glass border-border/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        {isUrgent ? (
          <Flame className="w-4 h-4 text-destructive animate-pulse" />
        ) : (
          <Clock className="w-4 h-4 text-primary" />
        )}
        <span className={`text-sm font-medium ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
          {label}
        </span>
      </div>

      <div className="flex gap-2 justify-center">
        <TimeUnit value={timeLeft.days} label="Days" isUrgent={isUrgent} />
        <span className="text-2xl font-bold text-muted-foreground self-start mt-1">:</span>
        <TimeUnit value={timeLeft.hours} label="Hrs" isUrgent={isUrgent} />
        <span className="text-2xl font-bold text-muted-foreground self-start mt-1">:</span>
        <TimeUnit value={timeLeft.minutes} label="Min" isUrgent={isUrgent} />
        <span className="text-2xl font-bold text-muted-foreground self-start mt-1">:</span>
        <TimeUnit value={timeLeft.seconds} label="Sec" isUrgent={isUrgent} />
      </div>

      {timeLeft.isExpired && (
        <p className="text-center text-sm text-muted-foreground mt-2">
          Time's up! But it's never too late to start. 💪
        </p>
      )}
    </motion.div>
  );
}

function TimeUnit({ value, label, isUrgent }: { value: number; label: string; isUrgent: boolean }) {
  return (
    <div className="flex flex-col items-center min-w-[48px]">
      <motion.span 
        key={value}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`text-2xl font-display font-bold ${
          isUrgent ? "text-destructive" : "text-foreground"
        }`}
      >
        {String(value).padStart(2, '0')}
      </motion.span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
