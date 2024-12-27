import type { Rule } from "eslint";
import * as ESTree from "estree";

function extractIdentifiersFromPattern(pattern: Exclude<ESTree.Pattern, "Identifier">): ESTree.Identifier[] {
  const identifiers: ESTree.Identifier[] = [];
  if (pattern.type === "ArrayPattern") {
    if (pattern.elements.length === 0) {
      return identifiers;
    }
    pattern.elements.forEach((elm) => {
      if (elm === null) {
        return;
      }
      if (elm?.type === "Identifier") {
        identifiers.push(elm);
      } else {
        identifiers.push(...extractIdentifiersFromPattern(elm));
      }
    });
  }
  if (pattern.type === "ObjectPattern") {
    if (pattern.properties.length === 0) {
      return identifiers;
    }
    pattern.properties.forEach((property) => {
      if (property.type === "Property") {
        const value = property.value || property.key;
        if (value.type === "Identifier") {
          identifiers.push(value);
        } else {
          identifiers.push(...extractIdentifiersFromPattern(value));
        }
      }
    });
  }
  if (pattern.type === "MemberExpression" && pattern.property.type === "FunctionExpression") {
    if (pattern.property.id == null) {
      return identifiers;
    }
    identifiers.push(pattern.property.id);
  }
  return identifiers;
}

function extractIdentifiersFromPatterns(patterns: Exclude<ESTree.Pattern, "Identifier">[]): ESTree.Identifier[] {
  if (patterns.length === 0) {
    return [];
  }
  const identifiers: ESTree.Identifier[] = [];
  patterns.forEach((pattern) => {
    identifiers.push(...extractIdentifiersFromPattern(pattern));
  });
  return identifiers;
}

function exportPrivateFixer<T>(
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
  // ---- NOTE: conditions about export code blocks ----
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
  // ---- NOTE: conditions about export + function | class | variables ----
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

const exportPrivateRule: Rule.RuleModule = {
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
    const calledDeclarationIdentifiers: ESTree.Identifier[] = [];
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
          .filter((s): s is ESTree.Identifier => s !== undefined && s.type === "Identifier");

        const otherPatterns =
          identifiers.length !== declaration.declarations.length
            ? declaration.declarations
                .map((s) => (s.id && s.type === "VariableDeclarator" ? s.id : undefined))
                .filter((s): s is Exclude<ESTree.Pattern, "Identifier"> => s !== undefined && s.type !== "Identifier")
            : [];

        const parsedIdentifiersFromPatterns = extractIdentifiersFromPatterns(otherPatterns);

        identifiers.push(...parsedIdentifiersFromPatterns);
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
          type: 1 < identifierNames.length ? "variables" : "variable",
        });

        // NOTE: for hoisting export declarers
        if (identifierNames.some((s) => stillNotExportIdentifiers.some(t => t.name === s))) {
          stillNotExportIdentifiers
            .filter((s) => identifierNames.includes(s.name))
            .forEach((s) => {
              if (s.loc == null) {
                return;
              }
              context.report({
                loc: s.loc,
                message: `variable ${s.name} must be private`,
              });
            });
        } else {
          calledDeclarationIdentifiers.push(...identifiers);
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
            message: `class ${foundIdentifier?.name} must be private.`,
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
            message: `function ${foundIdentifier?.name} must be private.`,
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
        // --- NOTE: conditions about export + function | class | variables ---
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
              message: `function ${declaration.id.name} must be private`,
              fix: (fixer) =>
                exportPrivateFixer<typeof declaration.type>(fixer, node, {
                  declaration,
                }),
            });
          } else if (declaration.type === "ClassDeclaration") {
            context.report({
              loc: declaration.loc,
              message: `class ${declaration.id.name} must be private`,
              fix: (fixer) =>
                exportPrivateFixer<typeof declaration.type>(fixer, node, {
                  declaration,
                }),
            });
          }
          if (declaration.type !== "VariableDeclaration") {
            return;
          }

          const variableIdentifiers = declaration.declarations
            .map((s) => (s.id && s.type === "VariableDeclarator" ? s.id : undefined))
            .filter((s): s is ESTree.Identifier => s !== undefined && s.type === "Identifier");

          const otherPatterns =
            variableIdentifiers.length !== declaration.declarations.length
              ? declaration.declarations
                  .map((s) => (s.id && s.type === "VariableDeclarator" ? s.id : undefined))
                  .filter((s): s is Exclude<ESTree.Pattern, "Identifier"> => s !== undefined && s.type !== "Identifier")
              : [];

          const parsedIdentifiersFromPatterns = extractIdentifiersFromPatterns([...otherPatterns]);

          variableIdentifiers.push(...parsedIdentifiersFromPatterns);

          context.report({
            loc: declaration.loc,
            message: `${
              1 < variableIdentifiers.length
                ? `variables ${variableIdentifiers.map((id) => id.name).toString()}`
                : `variable ${variableIdentifiers.map((id) => id.name).toString()}`
            } must be private`,
            fix: (fixer) =>
              exportPrivateFixer<typeof declaration.type>(fixer, node, {
                declaration,
              }),
          });
          return;
        }

        // ---- NOTE: conditions about export blocks ----
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
          .filter((s): s is ESTree.Identifier => s !== undefined && s.type === "Identifier");

        // ---- NOTE: for hoisting export declarers ----
        const stillNotDeclareIdentifiers = mappedIdentifiers.filter(
          (s) => !calledDeclarationIdentifiers.some((t) => t.name === s.name),
        );
        // deleted stillNotExportIdentifiers' values from matched exportedAndDeclaredIdentifiers
        const exportedAndDeclaredIdentifiers = mappedIdentifiers.filter((s) =>
          stillNotDeclareIdentifiers.some((t) => s.name === t.name),
        );
        const tmpArray = structuredClone(stillNotExportIdentifiers);
        stillNotExportIdentifiers.length = 0;
        stillNotExportIdentifiers.push(
          ...tmpArray.filter((s) => exportedAndDeclaredIdentifiers.some((t) => t.name === s.name)),
          ...stillNotDeclareIdentifiers,
        );
        // --------

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
          if (identifier?.loc == null || !names?.length || type === undefined) {
            return;
          }
          context.report({
            loc: identifier.loc,
            message: `${sortedFindData[index]?.type} ${names.toString()} must be private.`,
            fix: (fixer) =>
              exportPrivateFixer<typeof type>(fixer, node, {
                identifier,
              }),
          });
        });
      },
    };
  },
};

export { exportPrivateRule };
