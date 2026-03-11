import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame } from 'lucide-react';

interface MomentumCardProps {
  count: number;
}

export default function MomentumCard({ count }: MomentumCardProps) {
  const intensity = count === 0 ? 'cold' : count < 3 ? 'warm' : count < 6 ? 'hot' : 'blazing';
  
  const labels: Record<string, string> = {
    cold: 'Get started!',
    warm: 'Building up...',
    hot: 'On fire! 🔥',
    blazing: 'Unstoppable! 🚀',
  };

  return (
    <Card className="glass">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            intensity === 'cold' ? 'bg-muted' :
            intensity === 'warm' ? 'bg-warning/20' :
            'bg-destructive/20'
          }`}>
            <Flame className={`w-5 h-5 ${
              intensity === 'cold' ? 'text-muted-foreground' :
              intensity === 'warm' ? 'text-warning' :
              'text-destructive'
            }`} />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-display font-bold">{count}</p>
            <p className="text-xs text-muted-foreground">
              {labels[intensity]} <span className="opacity-50">24h</span>
            </p>
          </div>
          {count > 0 && (
            <Badge className="bg-destructive/20 text-destructive border-destructive/30 animate-pulse">
              🔥 Momentum Active
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
