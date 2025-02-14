import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
    extensionApi: "chrome",
    modules: ["@wxt-dev/module-react", '@wxt-dev/auto-icons'],
    autoIcons: {
        baseIconPath: "./assets/icon.png",
        grayscaleOnDevelopment: false,
    },
    manifest: {
        permissions: ["notifications"],
        name: "TempMailer",
        description: "Temporary email service",
        version: "1.0.1",
        
    },
});
