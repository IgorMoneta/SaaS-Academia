import unittest
from datetime import date

from services.progression import detect_stalls
from services.workout_generator import generate_workout_plan


class WorkoutGeneratorTests(unittest.TestCase):
    def test_split_respeita_dias_semana(self):
        for dias in (2, 3, 4, 5, 6):
            plan = generate_workout_plan(dias_semana=dias, objetivo="hipertrofia")
            self.assertEqual(len(plan["treinos"]), dias)

    def test_cada_treino_tem_exercicios(self):
        plan = generate_workout_plan(dias_semana=3, objetivo="hipertrofia")
        for treino in plan["treinos"]:
            self.assertGreaterEqual(len(treino["exercicios"]), 5)

    def test_objetivos_alteram_repeticoes_e_series(self):
        hip = generate_workout_plan(dias_semana=3, objetivo="hipertrofia")
        forc = generate_workout_plan(dias_semana=3, objetivo="forca")
        self.assertEqual(hip["treinos"][0]["exercicios"][0]["reps"], "8-12")
        self.assertEqual(forc["treinos"][0]["exercicios"][0]["reps"], "4-6")
        self.assertEqual(forc["treinos"][0]["exercicios"][0]["series"], 4)

    def test_objetivo_desconhecido_vira_hipertrofia(self):
        plan = generate_workout_plan(dias_semana=3, objetivo="sei la")
        self.assertEqual(plan["objetivo"], "hipertrofia")

    def test_dias_fora_do_limite_sao_limitados(self):
        self.assertEqual(generate_workout_plan(dias_semana=9)["dias_semana"], 6)
        self.assertEqual(generate_workout_plan(dias_semana=1)["dias_semana"], 2)

    def test_imc_calculado(self):
        plan = generate_workout_plan(dias_semana=3, peso=70, altura=175)
        self.assertAlmostEqual(plan["imc"]["valor"], 22.9, places=1)


class ProgressionTests(unittest.TestCase):
    def test_detecta_estagnacao(self):
        load_logs = [
            {"exercise_id": "e1", "peso_kg": 50, "reps": 10, "data": "2026-06-20"},
            {"exercise_id": "e1", "peso_kg": 50, "reps": 10, "data": "2026-07-25"},
        ]
        alertas = detect_stalls(
            load_logs,
            [{"id": "e1", "nome": "Supino"}],
            today=date(2026, 8, 1),
            janela_semanas=3,
        )
        self.assertEqual(len(alertas), 1)
        self.assertIn("Supino", alertas[0]["alerta"])

    def test_nao_alerta_com_progressao(self):
        load_logs = [
            {"exercise_id": "e1", "peso_kg": 50, "reps": 10, "data": "2026-06-20"},
            {"exercise_id": "e1", "peso_kg": 60, "reps": 10, "data": "2026-07-25"},
        ]
        alertas = detect_stalls(
            load_logs,
            [{"id": "e1", "nome": "Supino"}],
            today=date(2026, 8, 1),
            janela_semanas=3,
        )
        self.assertEqual(len(alertas), 0)

    def test_sem_historico_nao_alerta(self):
        alertas = detect_stalls([], [], today=date(2026, 8, 1))
        self.assertEqual(len(alertas), 0)


if __name__ == "__main__":
    unittest.main()
