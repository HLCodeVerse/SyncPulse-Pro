import React from 'react';

export type ThemeKey = 'slate' | 'indigo' | 'mineral' | 'graphite';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeKey;
  onThemeChange: (theme: ThemeKey) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen }) => {
  if (!isOpen) return null;
  return null;
};
