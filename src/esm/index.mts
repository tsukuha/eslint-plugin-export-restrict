import { exportRestrictRule } from "./rules/exportPrivateDeclareRule.mts";

export default {
  rules: { "no-export-private-declare": exportRestrictRule },
};
