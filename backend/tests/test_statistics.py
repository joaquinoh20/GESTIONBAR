import pytest

from app.statistics import engine


def test_mean_basic():
    assert engine.mean([2, 4, 6, 8]) == 5
    assert engine.mean([10]) == 10


def test_median_odd_even_and_unsorted():
    assert engine.median([7, 1, 3]) == 3
    assert engine.median([4, 1, 3, 2]) == 2.5
    assert engine.median([5]) == 5


def test_empty_and_invalid_values():
    with pytest.raises(engine.StatisticsError):
        engine.mean([])
    with pytest.raises(engine.StatisticsError):
        engine.median([])
    with pytest.raises(engine.StatisticsError):
        engine.mean([1, "a"])
    with pytest.raises(engine.StatisticsError):
        engine.mean([True, 2])


def test_compare_detects_positive_skew():
    result = engine.compare_mean_median([10, 11, 12, 13, 500])
    assert result["shape"] == "sesgo positivo"
    assert result["mean"] > result["median"]
    assert result["median"] == 12


def test_compare_symmetric():
    assert engine.compare_mean_median([1, 2, 3, 4, 5])["shape"] == "simétrica"


def test_compare_zero_median_does_not_crash():
    assert engine.compare_mean_median([0, 0, 0])["difference_pct"] == 0.0


def test_classify_variable():
    assert engine.classify_variable([1, 2, 3])["type"] == "cuantitativa discreta"
    assert engine.classify_variable([1.5, 2, 3])["type"] == "cuantitativa continua"


def test_frequency_table_discrete_and_continuous():
    discrete = engine.frequency_table([1, 1, 2, 3, 3, 3])
    assert [r["count"] for r in discrete] == [2, 1, 3]
    assert abs(sum(r["relative"] for r in discrete) - 1) < 1e-3
    continuous = engine.frequency_table([float(x) + 0.5 for x in range(100)], bins=5)
    assert sum(r["count"] for r in continuous) == 100


def test_random_variable_analysis():
    r = engine.random_variable_analysis([1, 2, 3, 4, 5], threshold=3)
    assert r["expected_value"] == 3
    assert r["variance"] == 2
    assert r["probability_above"]["favorable"] == 2
    assert r["probability_above"]["probability"] == 0.4


def test_simple_probability():
    r = engine.simple_probability(1, 4)
    assert r["probability"] == 0.25 and r["percentage"] == 25.0
    with pytest.raises(engine.StatisticsError):
        engine.simple_probability(5, 4)
    with pytest.raises(engine.StatisticsError):
        engine.simple_probability(0, 0)


def test_bayes_classic_medical_example():
    r = engine.bayes(p_a=0.01, p_b_given_a=0.9, p_b_given_not_a=0.05)
    assert r["posterior"] == pytest.approx(0.153846, abs=1e-5)
    assert len(r["steps"]) == 2


def test_bayes_with_direct_evidence():
    r = engine.bayes(p_a=0.3, p_b_given_a=0.8, p_b=0.4)
    assert r["posterior"] == pytest.approx(0.6)


def test_bayes_validation():
    with pytest.raises(engine.StatisticsError):
        engine.bayes(1.2, 0.5, 0.5)
    with pytest.raises(engine.StatisticsError):
        engine.bayes(0.5, 0.5)  # falta P(B) o P(B|no A)
    with pytest.raises(engine.StatisticsError):
        engine.bayes(0.5, 0.5, p_b=0)
    with pytest.raises(engine.StatisticsError):
        engine.bayes(0.9, 0.9, p_b=0.1)  # posterior > 1: datos inconsistentes
