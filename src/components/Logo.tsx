import React from 'react';

export default function Logo({ className = "w-8 h-8", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <rect x="20" y="60" width="60" height="20" rx="4" fill="currentColor"/>
      <rect x="30" y="35" width="40" height="20" rx="4" fill="currentColor"/>
      <rect x="40" y="10" width="20" height="20" rx="4" fill="currentColor"/>
    </svg>
  );
}
