import { exportRestrictRule } from "./rules/exportPrivateDeclareRule.mjs";

export default {
  rules: { "no-export-private-declare": exportRestrictRule },
};
