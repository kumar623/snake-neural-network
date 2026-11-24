"""Test the trained network on games it has never seen, compare it with a
random-move baseline, and save a learning-curve chart and a gameplay GIF.

Run:  python evaluate.py
"""
import json

import matplotlib
matplotlib.use("Agg")
matplotlib.rcParams["svg.fonttype"] = "none"
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image, ImageDraw

from snake.game import SnakeGame
from snake.network import FeedForwardNet, load_weights

TEST_SEED = 10_000_000  # far away from every seed used in training
N_GAMES = 100


def run(policy, seed, max_steps=5000, frames=None):
    game = SnakeGame(seed=seed)
    obs = game.observe()
    while game.alive and game.steps < max_steps:
        if frames is not None:
            frames.append((list(game.body), game.food, game.score))
        obs = game.step(policy(obs))
    return game.score


def draw(body, food, score, cell=24, w=12, h=12):
    img = Image.new("RGB", (w * cell, h * cell + 28), (24, 28, 36))
    d = ImageDraw.Draw(img)
    if food:
        fx, fy = food
        d.ellipse([fx * cell + 4, fy * cell + 4, fx * cell + cell - 4, fy * cell + cell - 4], fill=(230, 80, 80))
    for i, (x, y) in enumerate(body):
        color = (120, 220, 120) if i == 0 else (60, 170, 90)
        d.rectangle([x * cell + 1, y * cell + 1, x * cell + cell - 2, y * cell + cell - 2], fill=color)
    d.text((8, h * cell + 7), f"Food eaten: {score}", fill=(230, 230, 230))
    return img


def main():
    net = FeedForwardNet(load_weights())
    rng = np.random.default_rng(0)
    random_policy = lambda obs: int(rng.integers(3))

    nn_scores = [run(net.act, TEST_SEED + i) for i in range(N_GAMES)]
    rnd_scores = [run(random_policy, TEST_SEED + i) for i in range(N_GAMES)]

    summary = {
        "test_games": N_GAMES,
        "board": "12 x 12",
        "neural_network": {"mean": round(float(np.mean(nn_scores)), 1),
                           "median": float(np.median(nn_scores)),
                           "best": int(np.max(nn_scores)),
                           "worst": int(np.min(nn_scores))},
        "random_moves": {"mean": round(float(np.mean(rnd_scores)), 2),
                         "best": int(np.max(rnd_scores))},
    }
    with open("results/test_results.json", "w") as f:
        json.dump(summary, f, indent=2)
    print(json.dumps(summary, indent=2))

    # Learning curve
    hist = json.load(open("results/training_history.json"))
    g = [h["generation"] for h in hist]
    plt.figure(figsize=(7, 4))
    plt.plot(g, [h["best_score"] for h in hist], label="Best network")
    plt.plot(g, [h["mean_score"] for h in hist], label="Population average")
    plt.xlabel("Generation"); plt.ylabel("Food eaten per game")
    plt.title("Feed-forward network learning Snake (genetic algorithm)")
    plt.legend(); plt.grid(alpha=0.3); plt.tight_layout()
    plt.savefig("results/learning_curve.png", dpi=120)

    # Gameplay GIF of one test game (keep every 2nd frame to stay small)
    frames = []
    run(net.act, TEST_SEED, frames=frames)
    imgs = [draw(*f) for f in frames[::2]]
    imgs[0].save("results/gameplay.gif", save_all=True, append_images=imgs[1:],
                 duration=60, loop=0)
    print("saved results/learning_curve.png and results/gameplay.gif")


if __name__ == "__main__":
    main()
