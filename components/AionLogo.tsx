/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const LOGO_URL = "https://csewoobligshhknqmvgc.supabase.co/storage/v1/object/public/storagekhitai/logo.png";

const KithaiLogo: React.FC<{ className?: string; }> = ({ className }) => {
    return (
      <img
          src={LOGO_URL}
          className={className}
          alt="Kithai Logo"
      />
    );
  };

export default KithaiLogo;