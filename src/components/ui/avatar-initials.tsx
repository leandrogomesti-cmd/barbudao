import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarInitialsProps {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarInitials({ name, className, size = 'md' }: AvatarInitialsProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-10 w-10 text-sm',
  };

  return (
    <div
      className={cn(
        'rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
