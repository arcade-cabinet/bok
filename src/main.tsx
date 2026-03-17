import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const uiRoot = document.getElementById("ui-root");
if (uiRoot) {
	createRoot(uiRoot).render(<App />);
}
