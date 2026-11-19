/**
 * CalibrationStorage
 * Local persistent storage for calibration data and user settings using IndexedDB.
 * Zero remote upload, 100% private.
 */

import { CalibrationResult, HeadNeutralPose, UserAccessibilitySettings } from '../types/tracking';

const DB_NAME = 'EyeControlDB';
const DB_VERSION = 1;
const STORE_CALIBRATION = 'calibration';
const STORE_SETTINGS = 'settings';

export class CalibrationStorage {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (ev) => {
          const db = (ev.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_CALIBRATION)) {
            db.createObjectStore(STORE_CALIBRATION);
          }
          if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
            db.createObjectStore(STORE_SETTINGS);
          }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  /**
   * Save eye calibration result
   */
  public static async saveEyeCalibration(result: CalibrationResult): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CALIBRATION, 'readwrite');
      const store = tx.objectStore(STORE_CALIBRATION);
      const req = store.put(result, 'eye_calibration_latest');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Load eye calibration result
   */
  public static async loadEyeCalibration(): Promise<CalibrationResult | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CALIBRATION, 'readonly');
        const store = tx.objectStore(STORE_CALIBRATION);
        const req = store.get('eye_calibration_latest');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  /**
   * Save head neutral calibration pose
   */
  public static async saveHeadNeutral(neutral: HeadNeutralPose): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CALIBRATION, 'readwrite');
      const store = tx.objectStore(STORE_CALIBRATION);
      const req = store.put(neutral, 'head_neutral_latest');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Load head neutral calibration pose
   */
  public static async loadHeadNeutral(): Promise<HeadNeutralPose | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CALIBRATION, 'readonly');
        const store = tx.objectStore(STORE_CALIBRATION);
        const req = store.get('head_neutral_latest');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  /**
   * Delete stored calibrations
   */
  public static async deleteCalibrations(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CALIBRATION, 'readwrite');
      const store = tx.objectStore(STORE_CALIBRATION);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Save user accessibility settings
   */
  public static async saveSettings(settings: UserAccessibilitySettings): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.put(settings, 'user_settings');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Load user accessibility settings
   */
  public static async loadSettings(): Promise<UserAccessibilitySettings | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SETTINGS, 'readonly');
        const store = tx.objectStore(STORE_SETTINGS);
        const req = store.get('user_settings');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }
}
