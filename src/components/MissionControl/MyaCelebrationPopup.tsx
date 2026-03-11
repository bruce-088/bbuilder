import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import myaAvatar from '@/assets/mya-avatar.png';

interface CelebrationMessage {
  id: string;
  xp: number;
  message: string;
}

const CELEBRATION_LINES = [
  "Look at you go! You just earned {xp} points toward your $10K goal! 🎉",
  "Boom! +{xp} XP! Every step counts on the road to $10K/month! 🚀",
  "That's {xp} more XP in the bank! You're building something unstoppable! 💪",
  "Yes! +{xp} XP! The empire is taking shape! 👑",
  "Another quest conquered! +{xp} XP — keep this momentum going! 🔥",
];

export default function MyaCelebrationPopup() {
  const [messages, setMessages] = useState<CelebrationMessage[]>([]);

  useEffect(() => {
    const handler = (e: CustomEvent<{ xp: number; questId?: string; message?: string }>) => {
      const { xp, message: customMessage } = e.detail;
      if (xp <= 0 && !customMessage) return;

      const text = customMessage
        ? customMessage
        : CELEBRATION_LINES[Math.floor(Math.random() * CELEBRATION_LINES.length)].replace('{xp}', String(xp));
      
      const msg: CelebrationMessage = {
        id: `${Date.now()}-${Math.random()}`,
        xp,
        message: text,
      };

      setMessages(prev => [...prev.slice(-2), msg]);

      // Auto-dismiss after 5s
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== msg.id));
      }, 5000);
    };

    window.addEventListener('mya-celebrate' as any, handler);
    return () => window.removeEventListener('mya-celebrate' as any, handler);
  }, []);

  const dismiss = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="pointer-events-auto max-w-xs bg-card border border-primary/30 rounded-2xl shadow-xl p-4 flex items-start gap-3"
          >
            <img
              src={myaAvatar}
              alt="Mya"
              className="w-10 h-10 rounded-full ring-2 ring-primary/40 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary mb-1">Mya</p>
              <p className="text-sm text-foreground leading-snug">{msg.message}</p>
            </div>
            <button
              onClick={() => dismiss(msg.id)}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
