"""A small, headless Snake game.

The board is a grid. The snake moves one cell per step. Eating food makes it
one cell longer. Hitting a wall or its own body ends the game. The game also
ends if the snake wanders too long without eating (so a bad agent cannot loop
forever).
"""
import numpy as np

# Directions in clockwise order: up, right, down, left
DIRS = [(0, -1), (1, 0), (0, 1), (-1, 0)]


class SnakeGame:
    def __init__(self, width=12, height=12, seed=None):
        self.w, self.h = width, height
        self.rng = np.random.default_rng(seed)
        self.reset()

    def reset(self):
        cx, cy = self.w // 2, self.h // 2
        self.direction = 1  # start moving right
        self.body = [(cx, cy), (cx - 1, cy), (cx - 2, cy)]  # head first
        self.score = 0
        self.steps = 0
        self.steps_since_food = 0
        self.alive = True
        self._place_food()
        return self.observe()

    def _place_food(self):
        free = [(x, y) for x in range(self.w) for y in range(self.h)
                if (x, y) not in self.body]
        self.food = free[self.rng.integers(len(free))] if free else None

    def _hits(self, cell):
        x, y = cell
        if x < 0 or y < 0 or x >= self.w or y >= self.h:
            return True
        return cell in self.body[:-1]  # the tail moves away this step

    def observe(self):
        """11 simple features the network sees.

        3 x danger (straight, right turn, left turn)
        4 x current direction (one-hot)
        4 x food position relative to head (left, right, up, down)
        """
        hx, hy = self.body[0]
        straight = DIRS[self.direction]
        right = DIRS[(self.direction + 1) % 4]
        left = DIRS[(self.direction - 1) % 4]
        danger = [self._hits((hx + d[0], hy + d[1])) for d in (straight, right, left)]
        direction = [self.direction == i for i in range(4)]
        fx, fy = self.food if self.food else (hx, hy)
        food = [fx < hx, fx > hx, fy < hy, fy > hy]
        return np.array(danger + direction + food, dtype=np.float32)

    def step(self, action):
        """action: 0 = keep going, 1 = turn right, 2 = turn left."""
        if action == 1:
            self.direction = (self.direction + 1) % 4
        elif action == 2:
            self.direction = (self.direction - 1) % 4
        dx, dy = DIRS[self.direction]
        hx, hy = self.body[0]
        new_head = (hx + dx, hy + dy)
        self.steps += 1
        self.steps_since_food += 1

        if self._hits(new_head):
            self.alive = False
            return self.observe()

        self.body.insert(0, new_head)
        if new_head == self.food:
            self.score += 1
            self.steps_since_food = 0
            self._place_food()
            if self.food is None:  # board full: the snake has won
                self.alive = False
        else:
            self.body.pop()

        # Stop agents that circle forever without eating
        if self.steps_since_food > self.w * self.h:
            self.alive = False
        return self.observe()
