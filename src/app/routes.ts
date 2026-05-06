import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import Settings from "./pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/settings",
    Component: Settings,
  },
]);
