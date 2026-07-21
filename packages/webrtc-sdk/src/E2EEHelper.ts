export interface E2EEConfig {
  sharedKey: string;
  enabled?: boolean;
}

export class E2EEHelper {
  private key: CryptoKey | null = null;
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'RTCRtpScriptTransform' in window;
  }

  public async setKey(sharedKey: string) {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) return;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(sharedKey.padEnd(32, '0').substring(0, 32));
    this.key = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  public async encryptFrame(chunk: any, controller: any) {
    if (!this.key || !chunk.data) {
      controller.enqueue(chunk);
      return;
    }

    try {
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.key,
        chunk.data
      );

      const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.byteLength);

      chunk.data = combined.buffer;
      controller.enqueue(chunk);
    } catch {
      controller.enqueue(chunk);
    }
  }

  public async decryptFrame(chunk: any, controller: any) {
    if (!this.key || !chunk.data) {
      controller.enqueue(chunk);
      return;
    }

    try {
      const data = new Uint8Array(chunk.data);
      const iv = data.subarray(0, 12);
      const ciphertext = data.subarray(12);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.key,
        ciphertext
      );

      chunk.data = decrypted;
      controller.enqueue(chunk);
    } catch {
      controller.enqueue(chunk);
    }
  }

  public get supported(): boolean {
    return this.isSupported;
  }
}
