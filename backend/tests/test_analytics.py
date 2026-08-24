import unittest
from datetime import date

from services.fitness_analytics import build_fitness_summary


class FitnessAnalyticsTests(unittest.TestCase):
    def test_progression_by_exercise(self):
        result = build_fitness_summary(
            measurements=[],
            exercises=[{"id": "e1", "nome": "Supino"}],
            load_logs=[
                {
                    "exercise_id": "e1",
                    "peso_kg": 50,
                    "reps": 10,
                    "data": "2026-07-01",
                },
                {
                    "exercise_id": "e1",
                    "peso_kg": 55,
                    "reps": 10,
                    "data": "2026-07-20",
                },
            ],
            today=date(2026, 7, 20),
        )

        row = result["treino"]["exercicios"][0]
        self.assertEqual(row["variacao_carga_kg"], 5.0)
        self.assertGreater(row["variacao_e1rm_pct"], 0)

    def test_frequency_coverage(self):
        result = build_fitness_summary(
            measurements=[
                {
                    "data": "2026-07-01",
                    "frequencia": 4,
                }
            ],
            exercises=[],
            load_logs=[
                {"data": "2026-07-01"},
                {"data": "2026-07-03"},
                {"data": "2026-07-08"},
                {"data": "2026-07-10"},
                {"data": "2026-07-15"},
                {"data": "2026-07-17"},
                {"data": "2026-07-22"},
                {"data": "2026-07-24"},
            ],
            today=date(2026, 7, 28),
        )

        self.assertEqual(
            result["treino"]["media_dias_semana_28d"],
            2.0,
        )
        self.assertEqual(
            result["treino"]["cobertura_meta_pct"],
            50,
        )

    def test_measurement_delta(self):
        result = build_fitness_summary(
            measurements=[
                {"data": "2026-01-01", "peso": 60},
                {"data": "2026-02-01", "peso": 62.5},
            ],
            exercises=[],
            load_logs=[],
            today=date(2026, 2, 1),
        )

        self.assertEqual(
            result["medidas"]["variacao"]["peso"],
            2.5,
        )

    def test_weekly_goal_can_come_from_profile(self):
        result = build_fitness_summary(
            measurements=[],
            exercises=[],
            load_logs=[
                {"data": "2026-07-01"},
                {"data": "2026-07-08"},
            ],
            meta_semanal=4,
            today=date(2026, 7, 28),
        )

        self.assertEqual(result["treino"]["meta_dias_semana"], 4)
        self.assertEqual(result["treino"]["cobertura_meta_pct"], 12)


if __name__ == "__main__":
    unittest.main()
