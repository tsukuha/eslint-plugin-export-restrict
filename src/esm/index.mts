import { exportPrivateRule } from "./rules/exportPrivateDeclareRule.mjs";

export default {
  rules: { "no-export-private-declare": exportPrivateRule },
};
