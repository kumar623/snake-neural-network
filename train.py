"""Train the feed-forward network to play Snake with a genetic algorithm.

Each generation:
  1. every network in the population plays a few games,
  2. it gets a fitness score (food eaten matters most, surviving a little),
  3. the best networks are kept, and new ones are made by mixing (crossover)
     and slightly changing (mutation) the weights of good parents.

Run:  python train.py --generations 150
"""
import argparse
import json
import time

import numpy as np

from snake.game import SnakeGame
from snake.network import FeedForwardNet, n_params


def play(params, games=3, seed=0, max_steps=2000):
    net = FeedForwardNet(params)
    scores, steps = [], []
    for g in range(games):
        game = SnakeGame(seed=seed + g)
        obs = game.observe()
        while game.alive and game.steps < max_steps:
            obs = game.step(net.act(obs))
        scores.append(game.score)
        steps.append(game.steps)
    return np.mean(scores), np.mean(steps)


def fitness(score, steps):
    # Food is worth far more than survival time, so the snake learns to hunt.
    return score * 100 + min(steps, 300) * 0.1


def evolve(args):
    rng = np.random.default_rng(args.seed)
    size = n_params()
    pop = rng.normal(0, 1, (args.population, size))
    history = []
    best_params, best_fit = None, -1
    start = time.time()

    for gen in range(args.generations):
        # New random games each generation so the agent cannot memorise one board
        results = [play(p, games=args.games, seed=gen * 1000) for p in pop]
        fits = np.array([fitness(s, t) for s, t in results])
        scores = np.array([s for s, _ in results])
        order = np.argsort(fits)[::-1]

        if fits[order[0]] > best_fit:
            best_fit, best_params = fits[order[0]], pop[order[0]].copy()
        history.append({"generation": gen, "best_score": float(scores[order[0]]),
                        "mean_score": float(scores.mean())})
        if gen % 10 == 0 or gen == args.generations - 1:
            print(f"gen {gen:4d}  best food {scores[order[0]]:5.1f}  "
                  f"mean food {scores.mean():5.2f}  ({time.time() - start:.0f}s)")

        # Selection: keep the top networks unchanged (elitism)
        elite = pop[order[:args.elite]]
        parents = pop[order[:args.population // 4]]
        children = []
        while len(children) < args.population - args.elite:
            a, b = parents[rng.integers(len(parents), size=2)]
            mask = rng.random(size) < 0.5            # uniform crossover
            child = np.where(mask, a, b)
            mutate = rng.random(size) < args.mutation_rate
            child = child + mutate * rng.normal(0, args.mutation_scale, size)
            children.append(child)
        pop = np.vstack([elite, np.array(children)])

    with open("results/best_weights.json", "w") as f:
        json.dump([round(float(x), 8) for x in best_params], f)
    with open("results/training_history.json", "w") as f:
        json.dump(history, f, indent=1)
    print("saved results/best_weights.json and results/training_history.json")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--generations", type=int, default=150)
    p.add_argument("--population", type=int, default=120)
    p.add_argument("--elite", type=int, default=10)
    p.add_argument("--games", type=int, default=3)
    p.add_argument("--mutation-rate", type=float, default=0.1)
    p.add_argument("--mutation-scale", type=float, default=0.3)
    p.add_argument("--seed", type=int, default=42)
    evolve(p.parse_args())
