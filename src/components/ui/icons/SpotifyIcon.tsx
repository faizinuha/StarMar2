import React from 'react';

export const SpotifyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    <path d="M7 11.5c2.5-1 5.5-1.5 9 .5" />
    <path d="M6 14.5c2.5-1 5-1.5 8 .5" />
    <path d="M5 17.5c2-1 4-1.5 7 .5" />
  </svg>
);
