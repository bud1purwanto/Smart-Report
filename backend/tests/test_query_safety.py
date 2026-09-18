import pandas as pd
import pytest

from app.services.formula_engine import FormulaValidationError, evaluate_formula
from app.schemas.query import QueryDefinition
from pydantic import ValidationError


def test_formula_engine_evaluates_whitelisted_column_arithmetic():
    df = pd.DataFrame({"NETPR": [100, 250], "MENGE": [5, 2]})

    result = evaluate_formula(df, "row['NETPR'] * row.MENGE + 10")

    assert result.tolist() == [510, 510]


@pytest.mark.parametrize(
    "expression",
    [
        "__import__('os').system('id')",
        "row.__class__",
        "row['NETPR'].sum()",
        "open('/etc/passwd').read()",
        "row['UNKNOWN'] + 1",
    ],
)
def test_formula_engine_rejects_code_execution_and_unknown_columns(expression):
    df = pd.DataFrame({"NETPR": [100]})

    with pytest.raises(FormulaValidationError):
        evaluate_formula(df, expression)


def test_query_definition_rejects_unsafe_identifiers_and_row_limit():
    with pytest.raises(ValidationError):
        QueryDefinition(
            tables=[{"id": "t1", "table": "MARA; DROP TABLE USERS"}],
            options={"rowcount": 1_000_000},
        )


def test_query_definition_rejects_unknown_filter_operator():
    with pytest.raises(ValidationError):
        QueryDefinition(
            tables=[{"id": "t1", "table": "MARA"}],
            filters=[{"field": "MARA.MATNR", "operator": "EXEC", "value": "x"}],
        )
