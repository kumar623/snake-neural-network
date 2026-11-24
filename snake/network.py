"""A feed-forward neural network written with NumPy only.

Layers: 11 inputs -> 16 hidden (ReLU) -> 3 outputs (one per action).
The action with the highest output is chosen. There is no backpropagation:
the weights are found by the genetic algorithm in train.py.
"""
import json

import numpy as np

LAYERS = (11, 16, 3)


def n_params(layers=LAYERS):
    return sum(a * b + b for a, b in zip(layers[:-1], layers[1:]))


class FeedForwardNet:
    def __init__(self, params, layers=LAYERS):
        assert len(params) == n_params(layers)
        self.layers = layers
        self.weights, self.biases = [], []
        i = 0
        for a, b in zip(layers[:-1], layers[1:]):
            self.weights.append(params[i:i + a * b].reshape(a, b)); i += a * b
            self.biases.append(params[i:i + b]); i += b

    def forward(self, x):
        for k, (W, b) in enumerate(zip(self.weights, self.biases)):
            x = x @ W + b
            if k < len(self.weights) - 1:
                x = np.maximum(x, 0)  # ReLU on hidden layers
        return x

    def act(self, observation):
        return int(np.argmax(self.forward(observation)))


def load_weights(path="results/best_weights.json"):
    """Load trained weights saved by train.py (plain JSON list of numbers)."""
    with open(path) as f:
        return np.array(json.load(f), dtype=np.float64)
