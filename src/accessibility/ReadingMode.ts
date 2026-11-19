/**
 * ReadingMode
 * Manages reading mode state: when active, eye-gaze selection is locked out over
 * article/content areas so natural reading saccades cannot accidentally trigger buttons.
 * Only explicitly marked navigation controls remain selectable.
 */

export class ReadingMode {
  private isActive: boolean = false;
  private listeners: Set<(active: boolean) => void> = new Set();

  public activate(): void {
    if (!this.isActive) {
      this.isActive = true;
      this.notify();
    }
  }

  public deactivate(): void {
    if (this.isActive) {
      this.isActive = false;
      this.notify();
    }
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public subscribe(listener: (active: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isActive);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) {
      l(this.isActive);
    }
  }
}
