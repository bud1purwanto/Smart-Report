"""Safe arithmetic formulas for calculated report columns."""

from __future__ import annotations

import ast
import operator
from typing import Any

import pandas as pd


class FormulaValidationError(ValueError):
    """Raised when a custom formula contains unsupported syntax."""


_BINARY_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_UNARY_OPERATORS = {ast.UAdd: operator.pos, ast.USub: operator.neg}


def _column_name(node: ast.AST) -> str | None:
    if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name) and node.value.id == "row":
        return node.attr
    if (
        isinstance(node, ast.Subscript)
        and isinstance(node.value, ast.Name)
        and node.value.id == "row"
        and isinstance(node.slice, ast.Constant)
        and isinstance(node.slice.value, str)
    ):
        return node.slice.value
    return None


def _evaluate_node(node: ast.AST, df: pd.DataFrame) -> Any:
    if isinstance(node, ast.Expression):
        return _evaluate_node(node.body, df)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _BINARY_OPERATORS:
        left = _evaluate_node(node.left, df)
        right = _evaluate_node(node.right, df)
        if isinstance(node.op, ast.Pow) and isinstance(right, (int, float)) and abs(right) > 10:
            raise FormulaValidationError("Exponent must be between -10 and 10")
        try:
            return _BINARY_OPERATORS[type(node.op)](left, right)
        except (ArithmeticError, TypeError, ValueError) as exc:
            raise FormulaValidationError(f"Formula cannot be evaluated: {exc}") from exc
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY_OPERATORS:
        return _UNARY_OPERATORS[type(node.op)](_evaluate_node(node.operand, df))

    column = _column_name(node)
    if column is not None:
        if column not in df.columns:
            raise FormulaValidationError(f"Unknown column: {column}")
        return pd.to_numeric(df[column], errors="coerce")

    raise FormulaValidationError(f"Unsupported formula syntax: {type(node).__name__}")


def evaluate_formula(df: pd.DataFrame, expression: str) -> pd.Series:
    """Evaluate a restricted arithmetic expression against DataFrame columns."""
    if not expression or len(expression) > 500:
        raise FormulaValidationError("Formula must contain between 1 and 500 characters")
    try:
        tree = ast.parse(expression, mode="eval")
    except SyntaxError as exc:
        raise FormulaValidationError("Formula syntax is invalid") from exc

    result = _evaluate_node(tree, df)
    if isinstance(result, pd.Series):
        return result
    return pd.Series([result] * len(df), index=df.index)
