import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (typeof window !== "undefined") {
  const nativeInsertBefore = Node.prototype.insertBefore;
  const nativeRemoveChild = Node.prototype.removeChild;

  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return nativeInsertBefore.call(this, newNode, null) as T;
    }
    return nativeInsertBefore.call(this, newNode, referenceNode) as T;
  };

  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) return child;
    return nativeRemoveChild.call(this, child) as T;
  };
}

createRoot(document.getElementById("root")!).render(<App />);
