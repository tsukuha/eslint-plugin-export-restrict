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
      names: string[];
      type: string;
    }[] = [];
    // NOTE: variables for hoisting export declarers
    const calledDeclarationIdentifiers: (ESTree.Identifier | ESTree.Identifier[])[] = [];
    const stillNotExportIdentifiers: ESTree.Identifier[] = [];

    return {
      VariableDeclaration(declaration) {
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

        const identifiers = declaration.declarations
          .map((s) => (s.id && s.type === "VariableDeclarator" ? s.id : undefined))
          .filter((s): s is ESTree.Identifier => s !== undefined);

        // TODO: consider to pattern without Identifier
        if (!hasPrivateAnnotatedComment || parentDeclaration.range === undefined || identifiers.length === 0) {
          return;
        }
        if (parentDeclaration.range?.[0] === undefined || parentDeclaration.range?.[1] === undefined) {
          return;
        }

        const identifierNames = identifiers.map((s) => s.name);
        restrictedExportsInfo.push({
          parentBegin: parentDeclaration.range[0],
          parentEnd: parentDeclaration.range[1],
          names: identifierNames,
          type: "variables",
        });

        const tmpReplacer = (a: string, b: string) => (a < b ? 1 : -1);
        // NOTE: for hoisting export declarers
        const alreadyExportedIdentifier = calledDeclarationIdentifiers.find(
          (s) => Array.isArray(s) && JSON.stringify(s, tmpReplacer) === JSON.stringify(identifierNames, tmpReplacer),
        );
        if (alreadyExportedIdentifier !== undefined && Array.isArray(alreadyExportedIdentifier)) {
          const foundIdentifier = stillNotExportIdentifiers.find((s) =>
            alreadyExportedIdentifier.some((t) => t.name === s.name),
          );
          if (foundIdentifier?.loc == undefined || foundIdentifier?.name == undefined) {
            return;
          }
          context.report({
            loc: foundIdentifier.loc,
            message: `private variables ${foundIdentifier?.name} cannot export`,
          });
        } else {
          calledDeclarationIdentifiers.push(identifiers);
        }
      },
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
          names: [declaration.id.name],
          type: "class",
        });

        // NOTE: for hoisting export declarers
        const alreadyExportedIdentifier = stillNotExportIdentifiers.find(
          (s) => !Array.isArray(s) && s.name === declaration.id.name,
        );
        if (alreadyExportedIdentifier !== undefined) {
          const foundIdentifier = stillNotExportIdentifiers.find((s) => s.name === declaration.id.name);
          if (foundIdentifier?.loc == undefined || foundIdentifier?.name == undefined) {
            return;
          }
          context.report({
            loc: foundIdentifier.loc,
            message: `private class ${foundIdentifier?.name} cannot export`,
          });
        } else {
          calledDeclarationIdentifiers.push(declaration.id);
        }
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
          names: [declaration.id.name],
          type: "function",
        });

        // NOTE: for hoisting export declarers
        const alreadyExportedIdentifier = stillNotExportIdentifiers.find(
          (s) => !Array.isArray(s) && s.name === declaration.id.name,
        );
        if (alreadyExportedIdentifier !== undefined) {
          const foundIdentifier = stillNotExportIdentifiers.find((s) => s.name === declaration.id.name);
          if (foundIdentifier?.loc == undefined || foundIdentifier?.name === undefined) {
            return;
          }
          context.report({
            loc: foundIdentifier.loc,
            message: `private function ${foundIdentifier?.name} cannot export`,
          });
        } else {
          calledDeclarationIdentifiers.push(declaration.id);
        }
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

        // NOTE: for hoisting export declarers
        const calledIdentifiersFlat = calledDeclarationIdentifiers.flat();
        if (!mappedIdentifiers.every((s) => calledIdentifiersFlat.some((v) => v.name === s.name))) {
          const stillNotDeclareIdentifiers = mappedIdentifiers.filter(
            (s) => !calledIdentifiersFlat.some((t) => t.name === s.name),
          );
          stillNotExportIdentifiers.push(...stillNotDeclareIdentifiers);
        }

        const findIdentifiers = mappedIdentifiers.filter((s) =>
          restrictedExportsInfo.some(
            (t) =>
              t.names.includes(s.name) &&
              t.parentBegin === parentNode.range?.[0] &&
              t.parentEnd === parentNode.range?.[1],
          ),
        );
        const sortedFindData = findIdentifiers
          .map((s) => {
            const find = restrictedExportsInfo.find((t) => t.names.includes(s.name));
            if (find !== undefined) {
              return find;
            }
          })
          .map((s) => ({ type: s?.type, names: s?.names }));

        findIdentifiers.forEach((identifier, index) => {
          const names = sortedFindData[index]?.names;
          const type = sortedFindData[index]?.type;
          if (identifier?.loc == null || names === undefined || type === undefined) {
            return;
          }
          context.report({
            loc: identifier.loc,
            message: `private ${sortedFindData[index]?.type} ${
              names.length === 1 ? names.map((name) => name).toString() + " " : ""
            }cannot export`,
            fix: (fixer) =>
              exportRestrictFixer<typeof type>(fixer, node, {
                identifier,
              }),
          });
        });
      },
    };
  },
};

module.exports = exportRestrictRule;
