"""Fast geometry contract checks without requiring a Blender installation."""
import ast
from pathlib import Path
import unittest

source = ast.parse(Path(__file__).with_name("build_arena.py").read_text())
functions = [node for node in source.body if isinstance(node, ast.FunctionDef)
             and node.name in {"roof_profile", "roof_mesh", "curved_tile_rib"}]
namespace = {"mesh_object": lambda name, vertices, faces, *args: (vertices, faces)}
exec(compile(ast.Module(body=functions, type_ignores=[]), "roof_geometry", "exec"), namespace)


class RoofTests(unittest.TestCase):
    def test_profile_has_raised_eave_and_continuous_ridge(self):
        profile = namespace["roof_profile"]
        self.assertAlmostEqual(profile(0), 0.14)
        self.assertAlmostEqual(profile(1), 1)
        self.assertLess(profile(0.125), profile(0))
        self.assertTrue(all(0 <= profile(i / 100) <= 1 for i in range(101)))

    def test_closed_roof_has_no_degenerate_faces(self):
        vertices, faces = namespace["roof_mesh"]("test", (0, 0, 0), (2, 1), 0.5, None, None)
        edges = {}
        for face in faces:
            self.assertEqual(len(face), len(set(face)))
            for a, b in zip(face, face[1:] + face[:1]):
                edge = tuple(sorted((a, b)))
                edges[edge] = edges.get(edge, 0) + 1
                self.assertNotEqual(vertices[a], vertices[b])
        self.assertTrue(all(count == 2 for count in edges.values()))
        self.assertEqual(max(v[2] for v in vertices), 0.5)

    def test_ribs_follow_surface_on_both_sides(self):
        for side in (-1, 1):
            vertices, faces = namespace["curved_tile_rib"](
                "rib", (0, 0, 0), (2, 1), 0.5, 0.5, side, None, None)
            self.assertEqual(len(faces), 16)
            for row in range(9):
                v = vertices[row * 3 + 1]
                self.assertAlmostEqual(v[2], namespace["roof_profile"](row / 8) * 0.5 + 0.014)


if __name__ == "__main__":
    unittest.main()
