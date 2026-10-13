import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Notoria",
    short_name: "Notoria",
    description: "Your personal workspace for independent language learning.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#eeefe9",
    theme_color: "#eeefe9",
    icons: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
