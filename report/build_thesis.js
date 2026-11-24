const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat, HeadingLevel,
  TableOfContents, PageBreak, Footer, PageNumber, ImageRun, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle,
} = require('docx');

const R = path.join(__dirname, '..', 'results');
const A = JSON.parse(fs.readFileSync(path.join(R, 'analysis.json'), 'utf8'));
const nn = A.agents.neural_network, gr = A.agents.greedy_rule, rd = A.agents.random;
const seeds = {}; ['42','7','123'].forEach(k => { if (A.seeds[k]) seeds[k] = A.seeds[k]; }); const dc = A.death_causes_nn;
const seedMeans = Object.values(seeds).map(s => s.mean);
const seedAvg = (seedMeans.reduce((a, b) => a + b, 0) / seedMeans.length).toFixed(1);

const F = 'Times New Roman';
const body = { size: 24 };               // 12 pt
const LS = 360;                          // 1.5 line spacing

function runs(t, extra = {}) {
  const out = [];
  t.split(/(\*\*[^*]+\*\*|_[^_]+_)/).forEach(s => {
    if (!s) return;
    if (s.startsWith('**')) out.push(new TextRun({ text: s.slice(2, -2), bold: true, ...extra }));
    else if (s.startsWith('_') && s.endsWith('_') && s.length > 2) out.push(new TextRun({ text: s.slice(1, -1), italics: true, ...extra }));
    else out.push(new TextRun({ text: s, ...extra }));
  });
  return out;
}
const P = (t, o = {}) => new Paragraph({ children: runs(t, o.run || {}), alignment: o.align ?? AlignmentType.JUSTIFIED, spacing: { after: o.after ?? 160, line: o.line ?? LS }, indent: o.indent });
const BL = t => new Paragraph({ numbering: { reference: 'b', level: 0 }, children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { after: 80, line: LS } });
let NI = 0; const NEWLIST = () => { NI++; return new Paragraph({ children: [], spacing: { after: 0 } }); };
const NL = t => new Paragraph({ numbering: { reference: 'n', level: 0, instance: NI }, children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { after: 80, line: LS } });
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun(t)] });
const H1nb = t => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const CODE = t => new Paragraph({ children: [new TextRun({ text: t, font: 'Consolas', size: 19 })], spacing: { after: 0, line: 260 }, indent: { left: 400 } });
const blank = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [] }));

function IMG(file, w, h, caption) {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, keepNext: true,
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(R, 'figures', file)), transformation: { width: w, height: h } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 220 }, children: runs(caption, { italics: true, size: 21 }) }),
  ];
}

const border = { style: BorderStyle.SINGLE, size: 4, color: '888888' };
const borders = { top: border, bottom: border, left: border, right: border };
function TABLE(head, rows, widths, caption) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (t, w, hdr) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: hdr ? { fill: 'DCE3EE', type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: runs(String(t), { bold: !!hdr, size: 21 }) })],
  });
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 80 }, keepNext: true, children: runs(caption, { italics: true, size: 21 }) }),
    new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, alignment: AlignmentType.CENTER,
      rows: [new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, widths[i], true)) }),
        ...rows.map(r => new TableRow({ children: r.map((c, i) => cell(c, widths[i], false)) }))] }),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
  ];
}

const TOCROW = (t, p, sub) => new Paragraph({ tabStops: [{ type: 'right', position: 8700, leader: 'dot' }], indent: { left: sub ? 400 : 0 }, spacing: { after: sub ? 60 : 120, line: 300 }, children: [new TextRun({ text: t, bold: !sub }), new TextRun({ text: '\t' + p, bold: !sub })] });
// ---------------- Title page ----------------
const title = [
  ...blank(3),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'Learning to Play Snake with a Feed-Forward Neural Network Trained by a Genetic Algorithm', bold: true, size: 40 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: 'A neuroevolution approach with tests on unseen games and comparison against rule-based and random baselines', italics: true, size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'Krishna Kumar Thummala', bold: true, size: 28 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'MSc Computer Science, University of East London', size: 24 })] }),
  ...blank(4),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'Technical Report', size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'A re-implementation and extension of the topic of my MSc dissertation', size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'November 2026', size: 24 })] }),
  ...blank(3),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Code and data: github.com/kumar623/snake-neural-network', size: 22 })] }),
];

// ---------------- Front matter ----------------
const front = [
  H1('Note on This Report'),
  P('My MSc dissertation at the University of East London (submitted in 2023) studied a feed-forward neural network that learns to play the game of Snake. The original code from that project was not kept. This report describes a new, clean implementation of the same idea, written in 2026, together with additional experiments that were not part of the original dissertation: evaluation on unseen games, a rule-based baseline, repeated training runs with different random seeds, and an analysis of how games end.'),
  P('All results in this report are produced by the code in the accompanying repository and can be reproduced exactly using the fixed random seeds given in each chapter.'),
  H1nb('Abstract'),
  P(`This report investigates whether a small feed-forward neural network can learn to play the game of Snake without any hand-written game strategy, using a genetic algorithm instead of gradient-based training. The agent observes eleven simple binary features describing immediate danger, its current direction and the relative position of the food. A network with one hidden layer of sixteen ReLU units (243 parameters in total) maps these features to one of three actions. A population of 120 networks is evolved for 150 generations using fitness-based selection, elitism, uniform crossover and Gaussian mutation, with new random games in every generation to discourage memorisation.`),
  P(`On 100 unseen test games on a 12 x 12 board, the best evolved network eats on average **${nn.mean}** pieces of food per game (median ${nn.median}, best ${nn.max}), compared with **${gr.mean}** for a greedy rule-based agent that moves towards the food while avoiding immediate collisions, and **${rd.mean}** for random moves. The network outperforms the greedy agent in ${A.agents.nn_beats_greedy_games} of the 100 test games. Three independent training runs with different random seeds reach mean test scores of ${seedMeans.join(', ')}, showing that the result is repeatable. Analysis of how games end shows that the dominant remaining failure is the snake trapping itself in its own body, which is expected because its inputs only describe the cells directly next to its head. The report concludes with the limitations of the approach and directions for future work, including richer state representations and comparison with deep reinforcement learning.`),
  P('**Keywords:** neuroevolution, genetic algorithm, feed-forward neural network, game-playing agent, Snake, reinforcement learning', { align: AlignmentType.LEFT }),
  H1('Table of Contents'),
  TOCROW('Note on This Report', '2', false),
  TOCROW('Abstract', '2', false),
  TOCROW('1. Introduction', '4', false),
  TOCROW('2. Background and Literature Review', '6', false),
  TOCROW('3. Methodology', '8', false),
  TOCROW('4. Implementation', '11', false),
  TOCROW('5. Experiments and Results', '12', false),
  TOCROW('6. Discussion', '15', false),
  TOCROW('7. Conclusion and Future Work', '16', false),
  TOCROW('References', '17', false),
  TOCROW('Appendix A: Reproducing the Results', '18', false),
];

// ---------------- Chapters ----------------
const ch1 = [
  H1('1. Introduction'),
  H2('1.1 Background and motivation'),
  P('Games have long been used as test beds for artificial intelligence because they offer clear rules, a measurable score and a controlled environment in which ideas can be tested quickly (Yannakakis and Togelius, 2018). Snake is a particularly useful example. The rules are simple: a snake moves around a grid, grows longer each time it eats a piece of food, and dies if it hits a wall or its own body. Yet playing well requires the agent to balance two competing goals: moving towards the food, and avoiding positions that lead to an unavoidable collision later.'),
  P('A common way to build a game-playing agent is to write rules by hand. This works for simple behaviour, but hand-written rules are brittle and need a human expert to anticipate every situation. Machine learning offers an alternative: the agent learns its behaviour from experience. Deep reinforcement learning has achieved impressive results in games (Mnih et al., 2015), but it is complex to implement and sensitive to its many settings. Neuroevolution, which uses an evolutionary algorithm to search directly for good network weights, is a simpler alternative that has been shown to be competitive on reinforcement learning tasks (Such et al., 2017; Salimans et al., 2017).'),
  P('This project asks whether a very small neural network, trained only by a genetic algorithm and given only a handful of simple inputs, can learn a strong Snake strategy on its own, and how that strategy compares with a sensible hand-written rule.'),
  H2('1.2 Aim and objectives'),
  P('**Aim:** to design, implement and evaluate a feed-forward neural network agent that learns to play Snake through neuroevolution.'),
  P('**Objectives:**', { after: 60 }), NEWLIST(),
  NL('Implement a headless Snake environment and a compact state representation suitable for a small network.'),
  NL('Implement a feed-forward neural network and a genetic algorithm to train it, without using any machine learning library.'),
  NL('Evaluate the trained agent fairly on games it has never seen during training.'),
  NL('Compare the agent with a random baseline and a rule-based greedy baseline.'),
  NL('Check that the results are repeatable across independent training runs, and analyse the agent\'s remaining failure modes.'),
  H2('1.3 Research questions'),
  BL('**RQ1.** Can a feed-forward network with 243 parameters, trained only by a genetic algorithm, learn to play Snake well?'),
  BL('**RQ2.** Does the learned strategy outperform a hand-written greedy strategy that uses the same information?'),
  BL('**RQ3.** How consistent is training across different random seeds?'),
  BL('**RQ4.** What limits the performance of the agent?'),
  H2('1.4 Structure of the report'),
  P('Chapter 2 reviews the background on neural networks, genetic algorithms and neuroevolution for games. Chapter 3 describes the methodology: the environment, the state representation, the network and the training algorithm. Chapter 4 covers the implementation. Chapter 5 presents the experiments and results. Chapter 6 discusses the findings and limitations, and Chapter 7 concludes with future work.'),
];

const ch2 = [
  H1('2. Background and Literature Review'),
  H2('2.1 Feed-forward neural networks'),
  P('A feed-forward neural network passes its input through a sequence of layers. Each layer computes a weighted sum of its inputs, adds a bias and applies a non-linear activation function. With at least one hidden layer and a suitable activation, such networks can approximate a very wide class of functions (Hornik, Stinchcombe and White, 1989). The rectified linear unit (ReLU), f(x) = max(0, x), is now the most widely used hidden activation because it is cheap to compute and avoids some of the training problems of older sigmoid units (Nair and Hinton, 2010; Goodfellow, Bengio and Courville, 2016).'),
  P('Networks are usually trained by backpropagation, which needs a differentiable loss and labelled examples or a reward signal that can be turned into gradients. In a game such as Snake there is no correct label for each move, only a final score, which makes direct supervised training difficult.'),
  H2('2.2 Genetic algorithms'),
  P('Genetic algorithms, introduced by Holland (1975) and popularised by Goldberg (1989), are search methods inspired by natural selection. A population of candidate solutions is evaluated with a fitness function. Better candidates are more likely to be selected as parents. New candidates are produced by crossover, which combines parts of two parents, and mutation, which makes small random changes. Over many generations the population tends to move towards better solutions. Uniform crossover, in which each gene is taken from either parent with equal probability, was studied by Syswerda (1989) and works well when, as here, there is no natural ordering of the genes. Elitism, which copies the best individuals unchanged into the next generation, prevents the best solution found so far from being lost.'),
  H2('2.3 Neuroevolution'),
  P('Neuroevolution applies evolutionary algorithms to neural networks. Early work by Montana and Davis (1989) showed that genetic algorithms could train the weights of feed-forward networks, and Yao (1999) reviewed a wide range of methods that evolve weights, architectures or learning rules. NEAT (Stanley and Miikkulainen, 2002) evolves both the weights and the structure of a network. More recently, Such et al. (2017) showed that a simple genetic algorithm can train deep networks with millions of parameters to play Atari games at a level competitive with gradient-based reinforcement learning, and Salimans et al. (2017) showed that evolution strategies scale well across many processors.'),
  P('Neuroevolution has three practical advantages for this project. It needs only a final score, not a gradient. It is simple to implement. And because each network is evaluated independently, it parallelises easily.'),
  H2('2.4 Reinforcement learning for games'),
  P('Reinforcement learning treats a game as a sequence of states, actions and rewards, and learns a policy that maximises long-term reward (Sutton and Barto, 2018). The Deep Q-Network (DQN) of Mnih et al. (2015) learned to play many Atari games from raw pixels. Reinforcement learning is the most common modern approach to Snake agents, but it requires careful tuning of learning rates, replay buffers and exploration schedules. Neuroevolution offers a simpler baseline and a useful point of comparison.'),
  H2('2.5 Summary'),
  P('The literature shows that genetic algorithms can train neural networks for control tasks, and that simple evolutionary methods can be competitive with more complex reinforcement learning. This project applies a simple, transparent neuroevolution method to Snake. It focuses on fair evaluation: unseen test games, meaningful baselines and repeated runs.'),
];

const ch3 = [
  H1('3. Methodology'),
  H2('3.1 The Snake environment'),
  P('The game is played on a 12 x 12 grid. The snake starts in the centre, three cells long, moving to the right. At each step the agent chooses one of three relative actions: keep going, turn right or turn left. Relative actions are used instead of absolute directions (up, down, left, right) because they make it impossible to reverse into the snake\'s own body and reduce the number of outputs the network must learn.'),
  P('The snake grows by one cell each time it eats food, and a new piece of food appears in a random free cell. A game ends when the snake hits a wall or its own body. To prevent a poor agent from circling forever, a game also ends if the snake makes more than 144 moves (the number of cells on the board) without eating. Each game is created from a random seed, so any game can be replayed exactly.'),
  H2('3.2 State representation'),
  P('The agent does not see the whole board. Instead it receives eleven binary features, chosen to contain the information needed for good short-term decisions while keeping the network very small:'),
  BL('**Danger (3 features):** whether moving straight, turning right or turning left would cause an immediate collision with a wall or the body.'),
  BL('**Direction (4 features):** a one-hot encoding of the current direction of movement.'),
  BL('**Food location (4 features):** whether the food is to the left of, right of, above or below the head.'),
  P('This compact representation is a deliberate design choice. It makes learning fast, but it also limits what the agent can know: it cannot see parts of its body that are more than one cell away. Section 6.3 returns to this limitation.'),
  H2('3.3 Network architecture'),
  P('The policy is a fully connected feed-forward network with 11 inputs, one hidden layer of 16 ReLU units and 3 linear outputs, one per action. The action with the largest output is chosen (argmax), so the policy is deterministic. The network has 11 x 16 + 16 = 192 parameters in the first layer and 16 x 3 + 3 = 51 in the second, giving **243 parameters** in total. Figure 3.1 shows the architecture.'),
  ...IMG('architecture.png', 560, 336, 'Figure 3.1: Network architecture: 11 binary inputs, 16 hidden ReLU units and 3 action outputs.'),
  H2('3.4 Training with a genetic algorithm'),
  P('Each individual in the population is a vector of 243 real numbers, the network\'s weights and biases. Training proceeds as follows:'), NEWLIST(),
  NL('**Initialisation.** 120 individuals are created with weights drawn from a standard normal distribution.'),
  NL('**Evaluation.** Each individual plays 3 games, capped at 2,000 steps each, and its average food eaten (S) and average steps survived (T) are recorded.'),
  NL('**Fitness.** Fitness = 100 x S + 0.1 x min(T, 300). Food dominates the score, while the small survival term separates individuals that eat nothing in the early generations. Capping survival at 300 steps stops a snake from scoring well simply by avoiding death without eating.'),
  NL('**Elitism.** The 10 fittest individuals are copied unchanged into the next generation.'),
  NL('**Selection and crossover.** The remaining 110 children are created from parents chosen at random from the top 25% of the population (30 individuals). Each gene is copied from one of two parents with probability 0.5 (uniform crossover).'),
  NL('**Mutation.** Each gene of a child is mutated with probability 0.1 by adding Gaussian noise with standard deviation 0.3.'),
  P('A new set of games is generated in every generation. This is important: if the same games were used throughout, networks could be rewarded for memorising particular food positions rather than learning a general strategy. The best individual seen across all generations is saved as the final agent.'),
  ...TABLE(['Setting', 'Value'], [
    ['Population size', '120'], ['Generations', '150'], ['Games per evaluation', '3'],
    ['Elite individuals', '10'], ['Parent pool', 'Top 25% (30)'], ['Crossover', 'Uniform, p = 0.5'],
    ['Mutation rate / scale', '0.1 / 0.3 (Gaussian)'], ['Board size', '12 x 12'], ['Main random seed', '42'],
  ], [4200, 3600], 'Table 3.1: Training settings.'),
  H2('3.5 Evaluation method'),
  P('The trained agent is evaluated on **100 test games** created from random seeds starting at 10,000,000, far away from every seed used in training, so the test games are guaranteed to be new. Each test game is capped at 5,000 steps. The same 100 games are used for every agent, so differences in score come from the agents and not from luck in food placement.'),
  P('Two baselines are used:'),
  BL('**Random moves:** chooses one of the three actions uniformly at random. This shows how the game behaves without any skill.'),
  BL('**Greedy rule:** uses exactly the same eleven features as the network. Among the actions that do not cause an immediate collision, it picks the one that brings the head closest to the food (Manhattan distance). This is a strong, sensible hand-written strategy, and the main point of comparison.'),
  P('To test repeatability, the full training process is repeated with two additional random seeds (7 and 123), and each resulting agent is evaluated on the same 100 test games.'),
];

const ch4 = [
  H1('4. Implementation'),
  P('The system is written in Python using NumPy (Harris et al., 2020) for numerical work, Matplotlib for charts and Pillow for the gameplay animation. No machine learning library is used: the network and the genetic algorithm are implemented directly, which keeps every step transparent. The code is organised as follows:'),
  ...TABLE(['File', 'Purpose'], [
    ['snake/game.py', 'Snake environment and the 11 input features'],
    ['snake/network.py', 'Feed-forward network (NumPy)'],
    ['train.py', 'Genetic-algorithm training'],
    ['evaluate.py', 'Unseen-game test, learning curve and GIF'],
    ['baselines.py, analysis.py', 'Baselines, seed comparison, failure analysis and figures'],
  ], [3400, 5600], 'Table 4.1: Structure of the code.'),
  P('The forward pass of the network is shown below. Hidden layers use ReLU, and the output layer is linear:'),
  CODE('def forward(self, x):'),
  CODE('    for k, (W, b) in enumerate(zip(self.weights, self.biases)):'),
  CODE('        x = x @ W + b'),
  CODE('        if k < len(self.weights) - 1:'),
  CODE('            x = np.maximum(x, 0)   # ReLU'),
  CODE('    return x'),
  P('', { after: 60 }),
  P('Crossover and mutation are applied gene by gene using vectorised NumPy operations:'),
  CODE('mask  = rng.random(size) < 0.5                 # uniform crossover'),
  CODE('child = np.where(mask, parent_a, parent_b)'),
  CODE('mutate = rng.random(size) < mutation_rate'),
  CODE('child = child + mutate * rng.normal(0, mutation_scale, size)'),
  P('', { after: 60 }),
  P('A full training run of 150 generations takes about five minutes on a single laptop CPU core. All random number generators are seeded, so every result in Chapter 5 can be reproduced exactly with the commands given in the repository README.'),
];

const ch5 = [
  H1('5. Experiments and Results'),
  H2('5.1 Learning progress'),
  P(`Figure 5.1 shows the food eaten by the best network and the population average in each generation of the main run (seed 42). For the first 30 generations almost no network eats more than a few pieces of food: the population is still random. Between generations 30 and 45 the best networks discover how to steer reliably towards the food, and the best score rises sharply. After that, both the best score and the population average keep improving steadily, and by generation 150 the population average is above 30 food per game.`),
  ...IMG('learning_curve.png', 560, 320, 'Figure 5.1: Training progress for seed 42 (food eaten per game, best network and population average).'),
  H2('5.2 Performance on unseen games'),
  P(`Table 5.1 and Figure 5.2 compare the three agents on the same 100 unseen test games.`),
  ...TABLE(['Agent', 'Mean', 'Std. dev.', 'Median', 'Min', 'Max', 'Mean steps'], [
    ['Neural network (seed 42)', nn.mean, nn.sd, nn.median, nn.min, nn.max, nn.mean_steps],
    ['Greedy rule', gr.mean, gr.sd, gr.median, gr.min, gr.max, gr.mean_steps],
    ['Random moves', rd.mean, rd.sd, rd.median, rd.min, rd.max, rd.mean_steps],
  ], [2600, 1000, 1100, 1000, 800, 800, 1300], 'Table 5.1: Food eaten per game on 100 unseen test games (12 x 12 board).'),
  ...IMG('agent_comparison.png', 560, 320, 'Figure 5.2: Distribution of scores for the three agents on the same 100 test games.'),
  P(`The neural network eats on average **${nn.mean}** pieces of food per game, almost three times the greedy rule (${gr.mean}) and far above random play (${rd.mean}). It beats the greedy agent in **${A.agents.nn_beats_greedy_games} out of 100** games. This answers RQ1 and RQ2: a 243-parameter network trained only by a genetic algorithm learns a strong strategy, and that strategy is clearly better than a sensible hand-written rule that uses the same information.`),
  P('The gap between the network and the greedy rule is interesting, because both agents see exactly the same eleven features. The greedy rule always takes the shortest path to the food, which often leads the snake into positions where it is surrounded by its own body. The evolved network has no explicit notion of distance, but selection over many games rewards behaviour that keeps the snake alive long enough to keep eating. The result is a policy that is less greedy in the short term and more successful in the long term.'),
  H2('5.3 Repeatability across random seeds'),
  ...TABLE(['Training seed', 'Mean', 'Std. dev.', 'Median', 'Min', 'Max'],
    Object.entries(seeds).map(([k, s]) => [k, s.mean, s.sd, s.median, s.min, s.max]),
    [1800, 1200, 1200, 1200, 1000, 1000], 'Table 5.2: Test performance of agents trained with three different random seeds (same 100 test games).'),
  ...IMG('seed_curves.png', 560, 320, 'Figure 5.3: Population average during training for the three seeds.'),
  P(`All three independent runs learn successful strategies, with mean test scores of ${seedMeans.join(', ')} (average ${seedAvg}). Every run clearly outperforms the greedy baseline (${gr.mean}). The timing of the jump in performance differs between seeds, which is typical of evolutionary search: the moment at which a population discovers a key behaviour depends on chance. The final level of performance, however, is consistent. This answers RQ3.`),
  H2('5.4 How games end'),
  ...TABLE(['Cause of game ending', 'Number of test games'], [
    ['Hit own body', dc.own_body], ['Hit a wall', dc.wall], ['No food for 144 moves', dc.no_food_limit],
    ...(dc.board_full ? [['Board full (won)', dc.board_full]] : []),
  ], [5000, 3000], 'Table 5.3: How the 100 test games ended for the main neural network agent.'),
  P(`For the trained network, the large majority of games end because the snake runs into its own body. Wall collisions are ${dc.wall === 0 ? 'absent' : 'rare'}, which shows that the agent has learned to use the danger inputs reliably. Self-collisions happen mostly when the snake is long and enters an area enclosed by its own body. Because the agent only senses the cells immediately next to its head, it cannot see that a region is closed until it is too late. This answers RQ4: the main limit on performance is the state representation, not the learning algorithm.`),
];

const ch6 = [
  H1('6. Discussion'),
  H2('6.1 Main findings'),
  P(`The experiments show that a very small feed-forward network can learn to play Snake well without any hand-written strategy and without gradient-based training. With only 243 parameters and eleven binary inputs, the evolved agent eats on average ${nn.mean} pieces of food per game on unseen boards and consistently outperforms a greedy agent that has access to the same information. The result is repeatable across random seeds.`),
  H2('6.2 Why the network beats the greedy rule'),
  P('The greedy rule optimises a short-term goal: get closer to the food now. The genetic algorithm optimises the long-term outcome of whole games. Even with the same inputs, this difference in what is being optimised leads to different behaviour. This is a small but clear example of a general point in game AI: an agent trained on the final outcome can discover strategies that a designer, thinking one move ahead, would not write down.'),
  H2('6.3 Limitations'),
  BL('**Limited view.** The agent only senses danger one cell away. It cannot plan around enclosed areas, which causes most of its remaining failures (Section 5.4).'),
  BL('**Small board.** All experiments use a 12 x 12 board. Performance on larger boards, or transfer between board sizes, was not tested.'),
  BL('**Fixed design choices.** The network size, fitness function and genetic algorithm settings were chosen by reasoning and were not systematically tuned. A broader study of these settings would strengthen the conclusions.'),
  BL('**No comparison with reinforcement learning.** The project compares against random and rule-based agents but not against a trained reinforcement learning agent such as DQN.'),
  BL('**Three seeds.** Three independent runs show repeatability, but more runs would allow stronger statistical statements.'),
  H2('6.4 Reflection'),
  P('Two lessons stand out. First, the design of the inputs mattered more than the size of the network: well-chosen features allowed a tiny network to perform well and to train in minutes on a laptop. Second, fair evaluation required deliberate effort. Using new games in every generation, a separate set of test seeds, a meaningful baseline and repeated runs made it possible to say with confidence that the agent learned a general skill rather than memorising particular games.'),
];

const ch7 = [
  H1('7. Conclusion and Future Work'),
  H2('7.1 Conclusion'),
  P(`This project designed, implemented and evaluated a feed-forward neural network agent for Snake trained with a genetic algorithm. All objectives were met. The agent learned without any hand-written strategy. On 100 unseen games it scored ${nn.mean} on average, against ${gr.mean} for a greedy rule and ${rd.mean} for random play. Training was repeatable across three random seeds, and failure analysis identified the limited state representation as the main remaining weakness.`),
  H2('7.2 Future work'),
  BL('**Richer inputs:** add the distance to danger in each direction, or a small local view of the board, so the agent can see enclosed areas.'),
  BL('**Reinforcement learning comparison:** train a DQN (Mnih et al., 2015) with the same inputs and compare learning speed and final performance.'),
  BL('**Structure search:** use NEAT (Stanley and Miikkulainen, 2002) to evolve the network structure as well as the weights.'),
  BL('**Hyperparameter study:** measure the effect of population size, mutation settings and fitness design over many seeds.'),
  BL('**Generalisation:** test agents trained on one board size on other board sizes.'),
];

const refs = [
  'Goldberg, D. E. (1989) _Genetic Algorithms in Search, Optimization and Machine Learning_. Reading, MA: Addison-Wesley.',
  'Goodfellow, I., Bengio, Y. and Courville, A. (2016) _Deep Learning_. Cambridge, MA: MIT Press.',
  'Harris, C. R. et al. (2020) \'Array programming with NumPy\', _Nature_, 585, pp. 357–362.',
  'Holland, J. H. (1975) _Adaptation in Natural and Artificial Systems_. Ann Arbor: University of Michigan Press.',
  'Hornik, K., Stinchcombe, M. and White, H. (1989) \'Multilayer feedforward networks are universal approximators\', _Neural Networks_, 2(5), pp. 359–366.',
  'Mnih, V. et al. (2015) \'Human-level control through deep reinforcement learning\', _Nature_, 518, pp. 529–533.',
  'Montana, D. J. and Davis, L. (1989) \'Training feedforward neural networks using genetic algorithms\', in _Proceedings of the 11th International Joint Conference on Artificial Intelligence (IJCAI)_, pp. 762–767.',
  'Nair, V. and Hinton, G. E. (2010) \'Rectified linear units improve restricted Boltzmann machines\', in _Proceedings of the 27th International Conference on Machine Learning (ICML)_, pp. 807–814.',
  'Salimans, T., Ho, J., Chen, X., Sidor, S. and Sutskever, I. (2017) \'Evolution strategies as a scalable alternative to reinforcement learning\', _arXiv preprint_ arXiv:1703.03864.',
  'Stanley, K. O. and Miikkulainen, R. (2002) \'Evolving neural networks through augmenting topologies\', _Evolutionary Computation_, 10(2), pp. 99–127.',
  'Such, F. P. et al. (2017) \'Deep neuroevolution: genetic algorithms are a competitive alternative for training deep neural networks for reinforcement learning\', _arXiv preprint_ arXiv:1712.06567.',
  'Sutton, R. S. and Barto, A. G. (2018) _Reinforcement Learning: An Introduction_. 2nd edn. Cambridge, MA: MIT Press.',
  'Syswerda, G. (1989) \'Uniform crossover in genetic algorithms\', in _Proceedings of the 3rd International Conference on Genetic Algorithms_, pp. 2–9.',
  'Yannakakis, G. N. and Togelius, J. (2018) _Artificial Intelligence and Games_. Cham: Springer.',
  'Yao, X. (1999) \'Evolving artificial neural networks\', _Proceedings of the IEEE_, 87(9), pp. 1423–1447.',
];
const refSec = [H1('References'), ...refs.map(r => new Paragraph({ children: runs(r), alignment: AlignmentType.LEFT, spacing: { after: 140, line: 300 }, indent: { left: 500, hanging: 500 } }))];

const appx = [
  H1('Appendix A: Reproducing the Results'),
  P('The code is available at github.com/kumar623/snake-neural-network. To reproduce every result in this report:'),
  CODE('pip install -r requirements.txt'),
  CODE('python train.py --generations 150        # main run, seed 42'),
  CODE('python evaluate.py                       # test, learning curve, GIF'),
  CODE('python baselines.py                      # greedy baseline'),
  CODE('python analysis.py                       # tables and figures'),
  P('', { after: 60 }),
  P('The extra seed runs use the same training script with the seed set to 7 and 123. All raw results are stored as JSON files in the results folder.'),
  H2('A.1 Input features'),
  ...TABLE(['Index', 'Feature', 'Meaning'], [
    ['0', 'Danger straight', 'Moving forward would hit a wall or the body'],
    ['1', 'Danger right', 'Turning right would hit a wall or the body'],
    ['2', 'Danger left', 'Turning left would hit a wall or the body'],
    ['3–6', 'Direction', 'One-hot: up, right, down, left'],
    ['7–10', 'Food', 'Food is left of, right of, above, below the head'],
  ], [1200, 2600, 5200], 'Table A.1: The eleven input features.'),
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: F, ...body } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: F, size: 32, bold: true, color: '1F3864' }, paragraph: { spacing: { before: 240, after: 240 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: F, size: 27, bold: true, color: '1F3864' }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] },
    { reference: 'n', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 360 } } } }] },
  ] },
  features: { updateFields: true },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1700, right: 1440 } } },
      children: title },
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1700, right: 1440 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 20 })] })] }) },
      children: [...front, ...ch1, ...ch2, ...ch3, ...ch4, ...ch5, ...ch6, ...ch7, ...refSec, ...appx] },
  ],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(path.join(__dirname, 'Snake_Neural_Network_Thesis_Krishna_Kumar_Thummala.docx'), b); console.log('ok'); });
