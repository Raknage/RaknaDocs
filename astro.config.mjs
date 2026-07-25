import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://docs.raknage.com",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    starlight({
      title: "RaknaDocs",
      customCss: ["./src/styles/global.css"],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/raknage",
        },
        {
          icon: "twitch",
          label: "Twitch",
          href: "https://twitch.tv/raknage",
        },
        {
          icon: "instagram",
          label: "Instagram",
          href: "https://instagram.com/raknage",
        },
      ],
      sidebar: [
        {
          label: "Home Server",
          items: [{ autogenerate: { directory: "home-server" } }],
        },
        {
          label: "Guides",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Example Guide", slug: "guides/example" },
          ],
        },
        {
          label: "Reference",
          items: [{ autogenerate: { directory: "reference" } }],
        },
      ],
    }),
  ],
});
