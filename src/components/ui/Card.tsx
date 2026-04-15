import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export default function Card({ hover, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`
        bg-white border border-ft-border rounded-2xl p-6
        ${hover ? 'hover-lift cursor-pointer' : ''}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
