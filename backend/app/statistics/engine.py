"""Motor estadístico de SalesIA (Semana 07).

Funciones puras, sin acceso a base de datos, para poder probarlas de forma aislada:
media, mediana, comparación, variables estadísticas, variables aleatorias, probabilidad
simple y Teorema de Bayes.
"""
from __future__ import annotations

from collections import Counter
from math import isclose, sqrt
from typing import Sequence


class StatisticsError(ValueError):
    """Error de validación en un cálculo estadístico."""


def _clean(values: Sequence[float]) -> list[float]:
    if values is None or len(values) == 0:
        raise StatisticsError("Se necesita al menos un valor.")
    out = []
    for v in values:
        if isinstance(v, bool) or not isinstance(v, (int, float)):
            raise StatisticsError(f"Valor no numérico: {v!r}")
        out.append(v)
    return out


def mean(values: Sequence[float]) -> float:
    """Media aritmética: (x1 + ... + xn) / n."""
    data = _clean(values)
    return sum(data) / len(data)


def median(values: Sequence[float]) -> float:
    """Mediana: valor central; con n par, promedio de los dos centrales."""
    data = sorted(_clean(values))
    n = len(data)
    mid = n // 2
    if n % 2 == 1:
        return float(data[mid])
    return (data[mid - 1] + data[mid]) / 2


def compare_mean_median(values: Sequence[float]) -> dict:
    m, md = mean(values), median(values)
    diff = m - md
    diff_pct = (diff / md * 100) if md != 0 else 0.0
    if abs(diff_pct) <= 5:
        shape = "simétrica"
        reading = "La media y la mediana son muy parecidas: los valores se reparten de forma equilibrada."
    elif diff > 0:
        shape = "sesgo positivo"
        reading = ("La media supera a la mediana: algunos valores altos elevan el promedio. "
                   "La mediana describe mejor el valor típico.")
    else:
        shape = "sesgo negativo"
        reading = ("La media es menor que la mediana: algunos valores bajos reducen el promedio. "
                   "La mediana describe mejor el valor típico.")
    return {
        "n": len(values),
        "mean": round(m, 4),
        "median": round(md, 4),
        "difference": round(diff, 4),
        "difference_pct": round(diff_pct, 2),
        "shape": shape,
        "reading": reading,
    }


def classify_variable(values: Sequence[float]) -> dict:
    """Clasifica una variable cuantitativa como discreta o continua."""
    data = _clean(values)
    is_discrete = all(float(v).is_integer() for v in data)
    return {
        "type": "cuantitativa discreta" if is_discrete else "cuantitativa continua",
        "scale": "razón",
        "distinct_values": len(set(data)),
        "min": min(data),
        "max": max(data),
    }


def frequency_table(values: Sequence[float], bins: int = 8) -> list[dict]:
    """Tabla de frecuencias: por valor (discreta con pocos valores) o por intervalos."""
    data = _clean(values)
    n = len(data)
    distinct = sorted(set(data))
    if all(float(v).is_integer() for v in data) and len(distinct) <= 12:
        counts = Counter(data)
        return [{"label": str(int(v)), "from": v, "to": v, "count": counts[v],
                 "relative": round(counts[v] / n, 4)} for v in distinct]
    lo, hi = min(data), max(data)
    if isclose(lo, hi):
        return [{"label": f"{lo:g}", "from": lo, "to": hi, "count": n, "relative": 1.0}]
    width = (hi - lo) / bins
    counts = [0] * bins
    for v in data:
        idx = min(int((v - lo) / width), bins - 1)
        counts[idx] += 1
    rows = []
    for i, c in enumerate(counts):
        a, b = lo + i * width, lo + (i + 1) * width
        rows.append({"label": f"{a:.0f}–{b:.0f}", "from": round(a, 2), "to": round(b, 2),
                     "count": c, "relative": round(c / n, 4)})
    return rows


def random_variable_analysis(values: Sequence[float], threshold: float | None = None) -> dict:
    """Variable aleatoria observada: distribución empírica, esperanza, varianza y desviación."""
    data = _clean(values)
    n = len(data)
    mu = mean(data)
    variance = sum((x - mu) ** 2 for x in data) / n
    result = {
        "n": n,
        "classification": classify_variable(data),
        "expected_value": round(mu, 4),
        "variance": round(variance, 4),
        "std_dev": round(sqrt(variance), 4),
        "min": min(data),
        "max": max(data),
        "distribution": frequency_table(data),
    }
    if threshold is not None:
        favorable = sum(1 for x in data if x > threshold)
        result["probability_above"] = {
            "threshold": threshold,
            "favorable": favorable,
            "total": n,
            "probability": round(favorable / n, 4),
        }
    return result


def simple_probability(favorable: int, total: int) -> dict:
    """Probabilidad clásica: casos favorables / casos posibles."""
    if total <= 0:
        raise StatisticsError("El total de casos debe ser mayor que 0.")
    if favorable < 0 or favorable > total:
        raise StatisticsError("Los casos favorables deben estar entre 0 y el total.")
    p = favorable / total
    return {"favorable": favorable, "total": total, "probability": round(p, 6),
            "percentage": round(p * 100, 2), "complement": round(1 - p, 6)}


def _check_prob(name: str, value: float) -> float:
    if value is None or not (0 <= value <= 1):
        raise StatisticsError(f"{name} debe estar entre 0 y 1.")
    return float(value)


def bayes(p_a: float, p_b_given_a: float, p_b_given_not_a: float | None = None,
          p_b: float | None = None) -> dict:
    """Teorema de Bayes: P(A|B) = P(B|A) · P(A) / P(B).

    P(B) puede entregarse directamente o calcularse con probabilidad total:
    P(B) = P(B|A)·P(A) + P(B|¬A)·(1 − P(A)).
    """
    p_a = _check_prob("P(A)", p_a)
    p_b_given_a = _check_prob("P(B|A)", p_b_given_a)
    steps = []
    if p_b is None:
        if p_b_given_not_a is None:
            raise StatisticsError("Indica P(B) o P(B|no A).")
        p_b_given_not_a = _check_prob("P(B|no A)", p_b_given_not_a)
        p_b = p_b_given_a * p_a + p_b_given_not_a * (1 - p_a)
        steps.append(f"P(B) = P(B|A)·P(A) + P(B|¬A)·(1−P(A)) = "
                     f"{p_b_given_a}·{p_a} + {p_b_given_not_a}·{round(1 - p_a, 6)} = {round(p_b, 6)}")
    else:
        p_b = _check_prob("P(B)", p_b)
        steps.append(f"P(B) = {p_b} (dato ingresado)")
    if p_b == 0:
        raise StatisticsError("P(B) es 0: no se puede condicionar sobre un evento imposible.")
    posterior = p_b_given_a * p_a / p_b
    if posterior > 1 + 1e-9:
        raise StatisticsError("Las probabilidades ingresadas son inconsistentes (P(A|B) > 1).")
    posterior = min(posterior, 1.0)
    steps.append(f"P(A|B) = P(B|A)·P(A) / P(B) = {p_b_given_a}·{p_a} / {round(p_b, 6)} = {round(posterior, 6)}")
    return {
        "prior": p_a,
        "likelihood": p_b_given_a,
        "evidence": round(p_b, 6),
        "posterior": round(posterior, 6),
        "posterior_pct": round(posterior * 100, 2),
        "steps": steps,
    }
