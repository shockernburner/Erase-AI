import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import plan_model as pm  # noqa: E402

FX = 1.30


class TestModel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inp = pm.read_inputs(pm.WORKBOOK)

    def test_replica_matches_workbook(self):
        # With the workbook's own (shifted) references, the replica reproduces the saved results.
        months = pm.replicate(self.inp, fixed=False)
        self.assertAlmostEqual(months[59]["arr"], 9_473_123, delta=9_473_123 * 0.001)
        low = min(m["cash"] for m in months)
        self.assertAlmostEqual(low, 278_328, delta=278_328 * 0.005)

    def test_fixed_references(self):
        f = pm.cost_terms(self.inp, fixed=True)
        self.assertEqual(f["contingency"], 0.08)
        self.assertEqual(f["legal_per_month"], 2500)
        self.assertAlmostEqual(f["pentest_per_month"], 20000 / 12)

    def test_plan_engines(self):
        plan = pm.plan_case(self.inp, pm.PLAN)
        y5 = plan["years"][5]["arr_by_line_usd"]
        seats = plan["years"][5]["seats"]
        self.assertAlmostEqual(y5["sector"], seats * 0.35 * 3 * 12, delta=seats * 0.35 * 3 * 12 * 0.01)
        self.assertAlmostEqual(y5["rom"], 8_000_000 * 0.60)
        self.assertAlmostEqual(y5["gateway"], 6 * 500_000)
        self.assertAlmostEqual(y5["api"], 400 * 19 * 12)

    def test_rounds_keep_cash_positive(self):
        plan = pm.plan_case(self.inp, pm.PLAN)
        months = plan["months"]
        self.assertGreaterEqual(min(m["cash"] for m in months), 0)
        for r in plan["rounds"]:
            if r.get("modelled"):
                m = months[r["month"] - 1]
                self.assertGreaterEqual(m["cash"], 9 * m["opex"] * 0.999, r["name"])

    def test_base_and_plan_like_for_like(self):
        base = pm.base_case(self.inp)
        fixed = pm.replicate(self.inp, fixed=True)
        arr5 = fixed[59]["arr"] / FX
        self.assertAlmostEqual(base["years"][5]["arr_usd"], arr5, delta=1)
        plan = pm.plan_case(self.inp, pm.PLAN)
        lines = plan["years"][5]["arr_by_line_usd"]
        self.assertAlmostEqual(sum(lines.values()), plan["years"][5]["arr_usd"], delta=1)
        self.assertIn("personal", lines)


if __name__ == "__main__":
    unittest.main()
