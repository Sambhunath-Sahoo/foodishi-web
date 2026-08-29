import { withThemeByDataAttribute } from "@storybook/addon-themes";
import type { Preview } from "@storybook/nextjs-vite";

/* Real tokens, so every story renders on the approved "Neel" palette. */
import "../src/styles/tokens.css";
/* Canvas ground + ink, read from those tokens. */
import "./preview.css";

const preview: Preview = {
  decorators: [
    withThemeByDataAttribute({
      attributeName: "data-theme",
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
    }),
  ],
  parameters: {
    a11y: { disable: false, test: "todo" },
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
