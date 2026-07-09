import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import App from "./App";
import { store } from "./store";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Theme theme={neutralTheme}>
      <Provider store={store}>
        <App />
      </Provider>
    </Theme>
  </React.StrictMode>,
);
