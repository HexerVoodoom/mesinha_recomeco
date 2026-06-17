import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: async () => {
      const { default: Component } = await import("./pages/Home");
      return { Component };
    },
  },
  {
    path: "/settings",
    lazy: async () => {
      const { default: Component } = await import("./pages/Settings");
      return { Component };
    },
  },
]);
