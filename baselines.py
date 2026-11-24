"""Rule-based baseline: move towards the food, avoiding immediate danger."""
import json, numpy as np
from snake.game import SnakeGame, DIRS
from evaluate import run, TEST_SEED, N_GAMES

def greedy(game):
    def policy(obs):
        danger = obs[:3]
        hx, hy = game.body[0]; fx, fy = game.food
        best, bestd = None, 1e9
        for a, turn in enumerate([0, 1, -1]):
            if danger[a]: continue
            d = DIRS[(game.direction + turn) % 4]
            dist = abs(hx + d[0] - fx) + abs(hy + d[1] - fy)
            if dist < bestd: best, bestd = a, dist
        return 0 if best is None else best
    return policy

scores=[]
for i in range(N_GAMES):
    g = SnakeGame(seed=TEST_SEED+i); p = greedy(g); obs=g.observe()
    while g.alive and g.steps < 5000: obs = g.step(p(obs))
    scores.append(g.score)
r={"mean":round(float(np.mean(scores)),1),"median":float(np.median(scores)),"best":int(max(scores)),"worst":int(min(scores))}
print(r); json.dump(r,open('results/greedy_baseline.json','w'),indent=2)
