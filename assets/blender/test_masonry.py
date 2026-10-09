"""Geometry layout checks independent of Blender."""
import ast
from pathlib import Path
import unittest

source = ast.parse(Path(__file__).with_name('build_arena.py').read_text())
namespace = {}
exec(compile(ast.Module(body=[n for n in source.body if isinstance(n, ast.FunctionDef)
    and n.name == 'masonry_courses'], type_ignores=[]), 'masonry', 'exec'), namespace)

class MasonryTests(unittest.TestCase):
    def test_blocks_stay_inside_wall_and_clear_gate(self):
        for gap in (0, .48):
            blocks = namespace['masonry_courses'](3, .6, gap)
            self.assertGreater(len(blocks), 20)
            for x, z, width, height in blocks:
                self.assertGreater(width, 0)
                self.assertGreater(height, 0)
                self.assertGreaterEqual(x - width / 2, -1.5)
                self.assertLessEqual(x + width / 2, 1.5)
                self.assertGreaterEqual(z - height / 2, 0)
                self.assertLessEqual(z + height / 2, .6)
                if gap:
                    self.assertTrue(x + width / 2 <= -gap / 2 or x - width / 2 >= gap / 2)

    def test_rows_have_staggered_joints(self):
        blocks = namespace['masonry_courses'](3, .6, 0)
        rows = sorted(set(z for _, z, _, _ in blocks))
        self.assertGreaterEqual(len(rows), 3)
        self.assertNotEqual([round(x, 4) for x, z, _, _ in blocks if z == rows[0]],
                            [round(x, 4) for x, z, _, _ in blocks if z == rows[1]])

if __name__ == '__main__':
    unittest.main()
