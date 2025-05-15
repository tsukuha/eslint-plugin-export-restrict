import { type UserConfig, defineConfig } from "tsdown";

const base: UserConfig = {
  entry: ["./src/index.ts"],
  dts: {
    sourcemap: true,
  },
  clean: true,
};

export default defineConfig([
  {
    ...base,
    format: ["esm"],
    outDir: "dist/esm",
  },
  {
    ...base,
    format: ["cjs"],
    outDir: "dist/cjs",
  },
]);
