import { resetStore, storeBackend, storeFilePath } from "../src/lib/store";

resetStore();
console.log(
  `Northbridge ProofForge store reset (${storeBackend()}${storeBackend() === "file" ? ` → ${storeFilePath()}` : ""}).`
);
