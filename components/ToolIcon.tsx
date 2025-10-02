/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

type ToolIconProps = {
  icon?: string;
  className?: string;
};

const ToolIcon: React.FC<ToolIconProps> = ({ icon, className }) => {
  const iconProps = {
    className,
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round" as "round",
    strokeLinejoin: "round" as "round",
  };

  switch (icon) {
    case 'call':
      return (
        <svg {...iconProps}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      );
    case 'event':
      return (
        <svg {...iconProps}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      );
    case 'history':
        return (
            <svg {...iconProps}><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
        );
    case 'manage_search':
        return (
            <svg {...iconProps}><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
        );
    case 'image':
        return (
            <svg {...iconProps}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        );
    case 'music_note':
        return (
            <svg {...iconProps}><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
        );
    case 'description':
        return (
            <svg {...iconProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        );
    case 'google-drive':
        return (
            <svg {...iconProps} strokeWidth="1" fill="currentColor"><g><path d="M19.15,13.3,16.8,17.52a.31.31,0,0,1-.28.18H10.13a.31.31,0,0,1-.28-.18L7.48,13.3a.31.31,0,0,1,.14-.38l4.47-2.58a.31.31,0,0,1,.31,0l4.47,2.58A.31.31,0,0,1,19.15,13.3Z"></path><path d="M7.17,13.56l-4.47,2.58a.31.31,0,0,1-.31,0L.14,14.56a.31.31,0,0,1-.14-.27V8.58a.31.31,0,0,1,.14-.27L2.42,4.48a.31.31,0,0,1,.28-.18H9.08a.31.31,0,0,1,.28.18l2.28,3.94Z"></path><path d="M9.48,4.3l2.37,4.1,4.47-2.58a.31.31,0,0,0,.14-.27L14.19,.42a.31.31,0,0,0-.28-.18H7.52a.31.31,0,0,0-.28.18L4.92,4.3Z"></path></g></svg>
        );
    case 'gmail':
        return (
            <svg {...iconProps} strokeWidth="1" fill="currentColor"><path d="M22,5V19a3,3,0,0,1-3,3H5a3,3,0,0,1-3-3V5A3,3,0,0,1,5,2H19A3,3,0,0,1,22,5ZM20,7.2,12,13,4,7.2V5.5L12,11,20,5.5Z"></path></svg>
        );
    case 'whatsapp':
        return (
            <svg {...iconProps}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        );
    case 'telegram':
        return (
            <svg {...iconProps}><path d="M22 2 L11 13 L2 9 L22 2 Z M22 2 L15 22 L11 13 L2 9 L22 2 Z"></path></svg>
        );
    case 'facebook':
        return (
            <svg {...iconProps}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
        );
    case 'messenger':
        return (
            <svg {...iconProps}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" fill="currentColor"></path><polygon points="8 12 10 10 14 14 16 12 12 8 8 12" fill="var(--background)"></polygon></svg>
        );
    case 'linkedin':
        return (
            <svg {...iconProps}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
        );
    case 'search':
        return (
            <svg {...iconProps}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        );
    case 'alarm':
        return (
            <svg {...iconProps}><circle cx="12" cy="13" r="8"></circle><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="1" x2="12" y2="5"></line><line x1="4.22" y1="5.22" x2="7.03" y2="8.03"></line><line x1="16.97" y1="8.03" x2="19.78" y2="5.22"></line></svg>
        );
    case 'file-upload':
        return (
            <svg {...iconProps}><path d="M21.2 15.2l-9-9-9 9"></path><path d="M12 22V6"></path><path d="M3 12v6c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6"></path></svg>
        );
    default:
        return (
            <svg {...iconProps}><path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4A2 2 0 0 1 2 16.76V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z"></path><polyline points="2.32 6.16 12 11 21.68 6.16"></polyline><line x1="12" y1="22.76" x2="12" y2="11"></line></svg>
        );
  }
};

export default ToolIcon;