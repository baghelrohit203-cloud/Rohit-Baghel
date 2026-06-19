import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.karmachakra.app',
  appName: 'Karma Chakra 6x4',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
