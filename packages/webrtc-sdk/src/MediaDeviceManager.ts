export interface MediaDeviceInfoSummary {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export class MediaDeviceManager {
  public static async getDevices(): Promise<{
    audioInputs: MediaDeviceInfoSummary[];
    videoInputs: MediaDeviceInfoSummary[];
    audioOutputs: MediaDeviceInfoSummary[];
  }> {
    if (!navigator?.mediaDevices?.enumerateDevices) {
      return { audioInputs: [], videoInputs: [], audioOutputs: [] };
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    
    return {
      audioInputs: devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}`, kind: d.kind })),
      videoInputs: devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}`, kind: d.kind })),
      audioOutputs: devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${i + 1}`, kind: d.kind }))
    };
  }

  public static async requestPermissions(audio = true, video = true): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }
}
