"""Full analysis used in the report: three agents on the same 100 unseen games,
three independent training runs (seeds 42, 7, 123), and the figures.

Run after train.py (and the extra seed runs) with:  python analysis.py
"""
import json
import os

import matplotlib
matplotlib.use("Agg")
matplotlib.rcParams["svg.fonttype"] = "none"
import matplotlib.pyplot as plt
import numpy as np

from snake.game import SnakeGame, DIRS
from snake.network import FeedForwardNet, load_weights
from evaluate import TEST_SEED, N_GAMES

os.makedirs("results/figures", exist_ok=True)


def play(policy_factory, seed):
    game = SnakeGame(seed=seed)
    policy = policy_factory(game)
    obs = game.observe()
    while game.alive and game.steps < 5000:
        obs = game.step(policy(obs))
    return game.score, game.steps, len(game.body)


def nn_factory(params):
    net = FeedForwardNet(params)
    return lambda game: net.act


def greedy_factory(game):
    def policy(obs):
        hx, hy = game.body[0]
        fx, fy = game.food
        best, bestd = 0, 1e9
        found = False
        for a, turn in enumerate([0, 1, -1]):
            if obs[a]:
                continue
            d = DIRS[(game.direction + turn) % 4]
            dist = abs(hx + d[0] - fx) + abs(hy + d[1] - fy)
            if dist < bestd:
                best, bestd, found = a, dist, True
        return best if found else 0
    return policy


def random_factory(game):
    rng = np.random.default_rng(game.rng.integers(1 << 30))
    return lambda obs: int(rng.integers(3))


def evaluate(factory):
    res = [play(factory, TEST_SEED + i) for i in range(N_GAMES)]
    s = np.array([r[0] for r in res])
    st = np.array([r[1] for r in res])
    return s, st


def stats(s):
    return {"mean": round(float(s.mean()), 1), "sd": round(float(s.std(ddof=1)), 1),
            "median": float(np.median(s)), "min": int(s.min()), "max": int(s.max())}


runs = {"42": "results", "7": "results/seeds/s7", "123": "results/seeds/s123"}
out = {"agents": {}, "seeds": {}}

nn_s, nn_st = evaluate(nn_factory(load_weights()))
gr_s, gr_st = evaluate(greedy_factory)
rd_s, rd_st = evaluate(random_factory)
for name, s, st in [("neural_network", nn_s, nn_st), ("greedy_rule", gr_s, gr_st), ("random", rd_s, rd_st)]:
    out["agents"][name] = {**stats(s), "mean_steps": round(float(st.mean()), 0)}
out["agents"]["nn_beats_greedy_games"] = int((nn_s > gr_s).sum())

# Why games end, for the trained network
causes = {"wall": 0, "own_body": 0, "no_food_limit": 0}
for i in range(N_GAMES):
    g = SnakeGame(seed=TEST_SEED + i)
    net = FeedForwardNet(load_weights())
    obs = g.observe()
    while g.alive and g.steps < 5000:
        a = net.act(obs)
        d = (g.direction + (1 if a == 1 else -1 if a == 2 else 0)) % 4
        hx, hy = g.body[0]
        nx, ny = hx + DIRS[d][0], hy + DIRS[d][1]
        obs = g.step(a)
        if not g.alive:
            if nx < 0 or ny < 0 or nx >= g.w or ny >= g.h:
                causes["wall"] += 1
            elif g.steps_since_food > g.w * g.h:
                causes["no_food_limit"] += 1
            elif g.food is None:
                causes["board_full"] = causes.get("board_full", 0) + 1
            else:
                causes["own_body"] += 1
out["death_causes_nn"] = causes

curves = {}
for seed, path in runs.items():
    w = os.path.join(path, "best_weights.json")
    if not os.path.exists(w):
        continue
    s, _ = evaluate(nn_factory(load_weights(w)))
    out["seeds"][seed] = stats(s)
    curves[seed] = json.load(open(os.path.join(path, "training_history.json")))

json.dump(out, open("results/analysis.json", "w"), indent=2)
print(json.dumps(out, indent=2))

# Figure: score distribution of the three agents
plt.figure(figsize=(7, 4))
plt.boxplot([rd_s, gr_s, nn_s], tick_labels=["Random moves", "Greedy rule", "Neural network"], showmeans=True)
plt.ylabel("Food eaten per game"); plt.title("Scores on 100 unseen test games")
plt.grid(alpha=0.3, axis="y"); plt.tight_layout()
plt.savefig("results/figures/agent_comparison.png", dpi=150); plt.close()

# Figure: learning curves of the three seeds
plt.figure(figsize=(7, 4))
for seed, h in curves.items():
    plt.plot([x["generation"] for x in h], [x["mean_score"] for x in h], label=f"Seed {seed}: population average")
plt.xlabel("Generation"); plt.ylabel("Food eaten per game"); plt.title("Training is repeatable across random seeds")
plt.legend(); plt.grid(alpha=0.3); plt.tight_layout()
plt.savefig("results/figures/seed_curves.png", dpi=150); plt.close()

# Figure: network architecture
fig, ax = plt.subplots(figsize=(7, 4.2)); ax.axis("off")
layers = [11, 16, 3]
names_in = ["Danger straight", "Danger right", "Danger left", "Dir up", "Dir right", "Dir down",
            "Dir left", "Food left", "Food right", "Food up", "Food down"]
names_out = ["Keep going", "Turn right", "Turn left"]
xs = [0.18, 0.5, 0.82]
pos = []
for x, n in zip(xs, layers):
    ys = np.linspace(0.92, 0.08, n)
    pos.append([(x, y) for y in ys])
for a, b in zip(pos[:-1], pos[1:]):
    for p in a:
        for q in b:
            ax.plot([p[0], q[0]], [p[1], q[1]], color="#9aa", lw=0.25, zorder=1)
for k, layer in enumerate(pos):
    for j, (x, y) in enumerate(layer):
        ax.add_patch(plt.Circle((x, y), 0.018, color=["#2b6cb0", "#718096", "#2f855a"][k], zorder=2))
        if k == 0:
            ax.text(x - 0.03, y, names_in[j], ha="right", va="center", fontsize=7)
        if k == 2:
            ax.text(x + 0.03, y, names_out[j], ha="left", va="center", fontsize=8)
ax.text(0.18, 1.0, "Input (11)", ha="center", fontsize=9, weight="bold")
ax.text(0.5, 1.0, "Hidden (16, ReLU)", ha="center", fontsize=9, weight="bold")
ax.text(0.82, 1.0, "Output (3, argmax)", ha="center", fontsize=9, weight="bold")
ax.set_xlim(-0.12, 1.12); ax.set_ylim(0, 1.05)
plt.tight_layout(); plt.savefig("results/figures/architecture.png", dpi=150); plt.close()

# Copy main learning curve into figures
import shutil
shutil.copy("results/learning_curve.png", "results/figures/learning_curve.png")
print("figures saved")
