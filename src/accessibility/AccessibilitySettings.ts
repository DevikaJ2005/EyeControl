/**
 * AccessibilitySettings
 * Manages accessibility settings, text scaling, emergency contact configuration,
 * and CSS token application.
 */

import { UserAccessibilitySettings } from '../types/tracking';
import { CalibrationStorage } from '../storage/CalibrationStorage';

export const DEFAULT_SETTINGS: UserAccessibilitySettings = {
  inputMode: 'eye',
  dwellDurationMs: 1500,
  headSensitivity: 1.0,
  textSize: 'normal',
  speechVoiceURI: '',
  speechRate: 1.0,
  speechPitch: 1.0,
  speechVolume: 1.0,
  emergencyContactName: 'Caregiver / Family',
  emergencyContactPhone: '+1-555-0199',
  reducedMotion: false,
  soundFeedback: true,
  invertGazeX: false,
  invertGazeY: false,
};

export class AccessibilityManager {
  private static instance: AccessibilityManager | null = null;
  private currentSettings: UserAccessibilitySettings = { ...DEFAULT_SETTINGS };

  public static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  public async initialize(): Promise<UserAccessibilitySettings> {
    const saved = await CalibrationStorage.loadSettings();
    if (saved) {
      this.currentSettings = { ...DEFAULT_SETTINGS, ...saved };
    }
    this.applySettingsToDOM();
    return this.currentSettings;
  }

  public getSettings(): UserAccessibilitySettings {
    return { ...this.currentSettings };
  }

  public async updateSettings(updates: Partial<UserAccessibilitySettings>): Promise<void> {
    this.currentSettings = { ...this.currentSettings, ...updates };
    this.applySettingsToDOM();
    await CalibrationStorage.saveSettings(this.currentSettings);
  }

  private applySettingsToDOM(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Apply text scaling
    if (this.currentSettings.textSize === 'large') {
      root.style.setProperty('--font-size-base', '1.375rem'); // 22px
      root.style.setProperty('--font-size-md', '1.625rem');   // 26px
      root.style.setProperty('--font-size-lg', '1.875rem');   // 30px
      root.style.setProperty('--font-size-xl', '2.5rem');     // 40px
    } else if (this.currentSettings.textSize === 'extra-large') {
      root.style.setProperty('--font-size-base', '1.5rem');   // 24px
      root.style.setProperty('--font-size-md', '1.875rem');   // 30px
      root.style.setProperty('--font-size-lg', '2.25rem');    // 36px
      root.style.setProperty('--font-size-xl', '3rem');       // 48px
    } else {
      root.style.setProperty('--font-size-base', '1.1875rem'); // ~19px
      root.style.setProperty('--font-size-md', '1.375rem');   // ~22px
      root.style.setProperty('--font-size-lg', '1.625rem');   // ~26px
      root.style.setProperty('--font-size-xl', '2.125rem');   // ~34px
    }
  }
}
