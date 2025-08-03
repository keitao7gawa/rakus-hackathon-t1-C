import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import socketIoPlugin from "./plugins/socket.io.plugin";
import socketEvents from "./socket_event";
import fs from "fs"; // fsモジュールをインポート

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [vue(), socketIoPlugin({ socketEvents })],
    server: {
      host: true,
      port: parseInt(env.PORT) || 3000,
      strictPort: true,
      // 開発環境では不要
      // https: { // HTTPS設定を追加 
      //   key: fs.readFileSync("/etc/ssl/private.key"), // 秘密鍵のパス
      //   cert: fs.readFileSync("/etc/ssl/certificate.crt") // 証明書のパス
      // }
    }
  };
});
