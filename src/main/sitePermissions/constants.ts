/** Worth a prompt: sites under development may genuinely need them. Everything else is denied. */
export const ASKED: Record<string, string> = {
  media: 'use your camera or microphone',
  geolocation: 'know your location',
  notifications: 'show notifications',
  'clipboard-read': 'read your clipboard',
  midi: 'use your MIDI devices',
  midiSysex: 'use your MIDI devices',
  openExternal: 'open another application',
  'local-network-access': 'reach devices on your local network',
  'local-network': 'reach devices on your local network',
  'loopback-network': 'reach servers on this computer',
};
