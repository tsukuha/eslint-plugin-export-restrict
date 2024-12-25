import type { Rule } from "eslint";
import type * as ESTree from "estree";

function exportRestrictFixer<T>(
  fixer: Rule.RuleFixer,
  targetNode: Rule.Node,
  hint: {
    declaration?: T extends "FunctionDeclaration"
      ? ESTree.FunctionDeclaration
      : T extends "ClassDeclaration"
        ? ESTree.ClassDeclaration
        : T extends "VariableDeclaration"
          ? ESTree.VariableDeclaration
          : ESTree.VariableDeclaration;
    identifier?: ESTree.Identifier;
  },
): Rule.Fix {
  // conditions about export code blocks
  if (!hint?.declaration) {
    // only remove token
    if (targetNode.type === "ExportNamedDeclaration" && hint.identifier !== undefined) {
      // TODO: consider how to remove tokens
      return fixer.removeRange([0, 0]);
    }
    return { range: [0, 0], text: "" };
  }
  if (!hint.declaration.range) {
    return { range: [0, 0], text: "" };
  }
  // conditions about export + function | class | variables
  const parentNode = targetNode.parent;
  if (targetNode.type === "ExportNamedDeclaration" && targetNode.range !== undefined) {
    if (parentNode.type === "Program" && parentNode.sourceType === "module") {
      const removeRange: [number, number] = [
        targetNode.range[0],
        targetNode.range[0] + (hint.declaration.range[0] - targetNode.range[0]),
      ];
      return fixer.removeRange(removeRange);
    }
  }
  return { range: [0, 0], text: "" };
}

const exportRestrictRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      recommended: true,
      description: "error on export private declarers",
    },
    fixable: "code",
  },
  create(context) {
    const restrictedExportsInfo: {
      parentBegin: number;
      parentEnd: number;
      name: string;
      type: string;
    }[] = [];
    return {
      ClassDeclaration(declaration) {
        const parentDeclaration = declaration.parent;
        if (
          parentDeclaration.parent !== null ||
          parentDeclaration.type !== "Program" ||
          !parentDeclaration.comments?.length
        ) {
          return;
        }
        const hasPrivateAnnotatedComment = parentDeclaration.comments.some(
          (s) =>
            s.value.includes("@private") &&
            s.range?.[1] !== undefined &&
            s.range?.[1] === (declaration.range?.[0] || 0) - 1,
        );

        if (!hasPrivateAnnotatedComment || parentDeclaration.range === undefined || declaration.id.name === undefined) {
          return;
        }
        if (parentDeclaration.range?.[0] === undefined || parentDeclaration.range?.[1] === undefined) {
          return;
        }

        restrictedExportsInfo.push({
          parentBegin: parentDeclaration.range[0],
          parentEnd: parentDeclaration.range[1],
          name: declaration.id.name,
          type: "class",
        });
      },
      FunctionDeclaration(declaration) {
        const parentDeclaration = declaration.parent;
        if (
          parentDeclaration.parent !== null ||
          parentDeclaration.type !== "Program" ||
          !parentDeclaration.comments?.length
        ) {
          return;
        }
        const hasPrivateAnnotatedComment = parentDeclaration.comments.some(
          (s) =>
            s.value.includes("@private") &&
            s.range?.[1] !== undefined &&
            s.range?.[1] === (declaration.range?.[0] || 0) - 1,
        );

        if (!hasPrivateAnnotatedComment || parentDeclaration.range === undefined || declaration.id.name === undefined) {
          return;
        }
        if (parentDeclaration.range?.[0] === undefined || parentDeclaration.range?.[1] === undefined) {
          return;
        }

        restrictedExportsInfo.push({
          parentBegin: parentDeclaration.range[0],
          parentEnd: parentDeclaration.range[1],
          name: declaration.id.name,
          type: "function",
        });
      },
      ExportNamedDeclaration(node) {
        const parentNode = node.parent;
        if (parentNode.parent != null) {
          return;
        }
        const declaration = node.declaration;
        // conditions about export + function | class | variables
        if (declaration != null) {
          if (parentNode?.parent != null || parentNode.type !== "Program" || !parentNode.comments?.length) {
            return;
          }
          if (!declaration?.loc) {
            return;
          }
          const privateAnnotatedComment = parentNode.comments.find(
            (s) =>
              s.loc?.end.line !== undefined &&
              s.loc.end.line === (declaration.loc?.start.line || 0) - 1 &&
              s.value.includes("@private"),
          );

          if (privateAnnotatedComment === undefined || node.range === undefined) {
            return;
          }
          if (parentNode.range?.[0] === undefined || parentNode.range?.[1] === undefined) {
            return;
          }
          if (declaration.type === "FunctionDeclaration") {
            context.report({
              loc: declaration.loc,
              message: `private function ${declaration.id.name} cannot export`,
              fix: (fixer) =>
                exportRestrictFixer<typeof declaration.type>(fixer, node, {
                  declaration,
                }),
            });
          } else if (declaration.type === "ClassDeclaration") {
            context.report({
              loc: declaration.loc,
              message: `private class ${declaration.id.name} cannot export`,
              fix: (fixer) =>
                exportRestrictFixer<typeof declaration.type>(fixer, node, {
                  declaration,
                }),
            });
          }
          if (declaration.type !== "VariableDeclaration") {
            return;
          }
          const variableIdentifiers = declaration.declarations
            .map((s) => (s.id.type === "Identifier" ? s.id : undefined))
            .filter((s) => s !== undefined);
          // TODO: consider to pattern without Identifier
          context.report({
            loc: declaration.loc,
            message: `private variables ${
              variableIdentifiers.length === 1 ? variableIdentifiers.map((id) => id.name).toString() + " " : ""
            }cannot export`,
            fix: (fixer) =>
              exportRestrictFixer<typeof declaration.type>(fixer, node, {
                declaration,
              }),
          });
          return;
        }
        // conditions about export blocks
        if (node.specifiers.length === 0) {
          return;
        }
        const mappedIdentifiers = node.specifiers
          .map((s) => {
            if (!!s.exported && s.exported.type === "Identifier") {
              return s.exported;
            }
            return undefined;
          })
          .filter((s): s is ESTree.Identifier => s !== undefined);
        const findIdentifiers = mappedIdentifiers.filter((s) =>
          restrictedExportsInfo.some(
            (t) =>
              t.name === s.name && t.parentBegin === parentNode.range?.[0] && t.parentEnd === parentNode.range?.[1],
          ),
        );
        const findName = findIdentifiers.map((t) => t.name);
        const findTypes = restrictedExportsInfo.filter((s) => findName.includes(s.name)).map((s) => s.type);
        findIdentifiers.forEach((identifier, index) => {
          if (identifier?.loc == null || findTypes[index] === undefined) {
            return;
          }
          context.report({
            loc: identifier.loc,
            message: `private ${findTypes[index]} ${identifier.name} cannot export`,
            fix: (fixer) =>
              exportRestrictFixer<(typeof findTypes)[0]>(fixer, node, {
                identifier,
              }),
          });
        });
      },
    };
  },
};

export { exportRestrictRule };
