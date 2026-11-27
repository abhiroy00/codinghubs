# GenAI Level 1: draft additions for the first 5 articles

**Status: DRAFT. Not published. A trainer should check every addition before it goes live.**

Only the text marked **Added** is new. Everything else is the existing article.

## AI, machine learning and deep learning
Unique teaching words: 375 → 740 (needed: 600)

### Concept
AI is the broad task-oriented field; machine learning fits patterns from data, and deep learning uses multilayer neural networks. Rules, classifiers and generators can coexist inside one product. The correct choice follows the decision and its error costs, not a fashionable model label.

**Added:** Think of the three terms as nested rather than competing. A hand-written eligibility checker is AI-style automation with no learning; a logistic regression trained on past tickets is machine learning without deep layers; a transformer that reads the full message is deep learning. Moving inward usually adds data requirements, compute cost and debugging effort, so each step needs a reason you can measure.

### Practical example
A synthetic support router compares a keyword rule and classifier on ambiguous and misspelled tickets, scoring urgent-ticket recall separately.

**Added:** Suppose the evaluation set holds 200 labelled tickets and 20 of them are urgent. A router that never flags urgency is still 90 percent accurate while missing every urgent case. The keyword rule might catch 12 of the 20 and the classifier 17, but the comparison is only meaningful after counting false alarms too, because each one sends an ordinary ticket into the priority queue. Write down both counts before choosing a winner, then read the tickets each approach got wrong.

### Real-world use
Route a support request with a classifier, enforce access with application permissions and draft the reply with a grounded generator.

**Added:** Log the route, model version and final human correction for each request. Those records show which categories fail most often and give you honest examples for the next evaluation round, while the permission check stays in ordinary application code that you can unit test.

### Interview answers
1. **Can a rules-only router be AI without machine learning?**
   Yes: AI is broader than learned parameter fitting. Identify the intelligent task and explain which behavior is explicitly programmed rather than learned.
   **Added:** A chess program using search and hand-written scoring is a familiar example of this distinction.
2. **Why must training and inference be separated in a ticket classifier?**
   Training fits parameters from examples; inference applies a frozen version to new tickets. Separation enables reproducible tests, versioned rollout and rollback.
   **Added:** It also stops a live system from silently changing behaviour while you are trying to measure it.
3. **When would extra neural-network depth fail to solve routing errors?**
   More capacity cannot repair missing labels, leakage or an unrepresentative evaluation set. Inspect those causes before choosing a deeper model.
   **Added:** A quick test is to read fifty errors and count how many have wrong or ambiguous labels.
4. **How would you compare a keyword router with a neural classifier fairly?**
   Freeze the same unseen labeled examples, compare per-class errors and include latency and maintenance cost. Do not tune on final test labels.
   **Added:** Report the result per category, since one strong class can hide a weak one.
5. **Implement confusion counts for one routing label.**
   Count true positives, false positives and false negatives with an explicit positive label. Validate unequal lengths, empty input and all-positive predictions.
   **Added:** Precision then follows from true and false positives, and recall from true positives and false negatives, with zero denominators handled explicitly.
6. **Where should a predictor and an authorization rule meet?**
   The predictor may suggest a route, while server-side identity and object permissions decide access. Model confidence cannot grant a permission.
   **Added:** Test this by sending a request from a user who lacks access and confirming it is refused even when the predicted route looks correct.
7. **Urgent tickets are missed despite high overall accuracy. What changes?**
   Measure urgent-class recall, precision and error cost. Consider threshold tuning or review queues instead of optimizing only the majority class.
   **Added:** Agree with the team how many extra false alarms are acceptable for each missed urgent ticket you prevent.
8. **Offline routing succeeds but rollout fails. What would you inspect?**
   Compare preprocessing, input distribution, label meaning and model version across environments. Reproduce an actual failing request before retraining.
   **Added:** Check text cleaning first, because a missing lowercase or truncation step can change predictions without any model change.
9. **How would you defend a simple baseline in a technical interview?**
   State constraints and show the controlled comparison. Explain the evidence required to justify complexity rather than treating a larger model as progress.
   **Added:** Add what result would make you replace the baseline, so the decision is falsifiable.
10. **Which artifacts make a routing project discussion credible?**
   Provide split rationale, versioned data, confusion analysis and measured limitations. Describe your real contribution without inventing customer results or scale.
   **Added:** A short table of failed examples with your explanation of each is more convincing than a single headline score.

## Generative versus discriminative models
Unique teaching words: 359 → 728 (needed: 600)

### Concept
A classifier predicts a defined label from features; a generator models and emits data conditioned on context. Token-sequence probability is not a calibrated probability that a real-world claim is true. A product can use both kinds of model without confusing their evaluation contracts.

**Added:** In probability terms, a discriminative model learns how likely a label is given the input, while a generative model learns how data itself is distributed, often conditioned on some context. A language model used for classification is still generating tokens; you are simply reading a label out of its text, which means the output format must be checked rather than assumed.

### Practical example
A synthetic moderation task scores the predicted category separately from the evidence supporting a generated policy explanation.

**Added:** A user posts a message containing another person's phone number. The system may correctly label it as a privacy violation and then justify the label by quoting a clause that the policy does not contain. The category passes while the explanation fails. Keeping two columns in the evaluation sheet, one for the label and one for whether every cited sentence exists in the policy, makes this visible. Without the second column the run would look completely successful even though a reviewer would be misled.

### Real-world use
Classify a policy issue, retrieve an approved clause and draft text; enforce consequential actions through a separately validated workflow.

**Added:** Where the label set is small and labelled data is available, compare a lightweight classifier against the language model for the routing step. Use the generator only for the part that truly needs free text, such as the reply a human reviews before sending.

### Interview answers
1. **How does a label prediction differ from sequence generation?**
   A classifier selects from a defined output set; a generator produces a token sequence. Their contracts require different success criteria.
   **Added:** For example, spam detection returns one of two labels, whereas drafting a reply can produce countless valid sentences.
2. **How is a sentence likelihood computed autoregressively?**
   Multiply each token probability conditioned on its prefix. In practice accumulate log probabilities because direct products underflow on long sequences.
   **Added:** The chain rule gives this factorisation, and the average negative log probability per token is the basis of perplexity.
3. **Why can a correct label have an unreliable explanation?**
   The explanation may contain invented or irrelevant reasoning even when the label matches. Score category correctness and evidence support independently.
   **Added:** Models can produce fluent reasons after the fact, so each cited fact should be checked against its source.
4. **How would you constrain an LLM moderation category?**
   Use an enum schema, reject malformed output and test the category distribution on unseen examples. Keep enforcement permissions outside generated prose.
   **Added:** Count malformed and refused responses as separate outcomes instead of quietly dropping them from the score.
5. **Compute sequence log-likelihood from token probabilities.**
   Validate the probability interval, handle zero as negative infinity and define empty input. Do not silently discard impossible tokens.
   **Added:** Adding logs gives the same ranking as multiplying probabilities, as long as the compared sequences are handled consistently.
6. **Design a classifier-plus-drafter support pipeline.**
   Separate routing, authorized evidence retrieval, drafting and output validation. Preserve model versions and distinguish a proposal from an approved action.
   **Added:** Each stage should be testable on its own, so a bad draft can be traced to retrieval or to generation.
7. **The classifier works but rationales cite nonexistent policies. What ships?**
   Retain only independently validated capabilities if appropriate. Suppress unreliable rationales until evidence checks and grounded evaluation demonstrate acceptable behavior.
   **Added:** Tell reviewers that the explanation is temporarily hidden, so they do not assume that no reason exists.
8. **All long-sequence probability scores become zero. What is wrong?**
   Direct multiplication is likely underflowing. Accumulate logs and justify any length normalization against the intended comparison.
   **Added:** Print the running product for a long input and you can watch it reach zero in floating point.
9. **How would you defend separate label and explanation metrics?**
   Show an example where one output succeeds and the other fails. Explain why averaging unrelated metrics can conceal a critical failure.
   **Added:** A confusion table for labels and a supported-or-unsupported count for rationales are easy for an interviewer to follow.
10. **How should a classification-versus-generation experiment be presented?**
   Provide a shared input contract and two scorecards. Report the synthetic-data limits instead of asserting production reliability from a demo.
   **Added:** Include a few cases where the two models disagree and explain which one you would trust and why.

## Data splits and leakage
Unique teaching words: 330 → 684 (needed: 600)

### Concept
Leakage lets information unavailable at prediction time influence training or evaluation. Duplicate document revisions, future labels and transformations fitted on all data can produce optimistic results. The evaluation partition must represent the deployment boundary rather than an arbitrary set of rows.

**Added:** The three usual partitions have different jobs. Training data fits parameters, validation data guides choices such as thresholds and settings, and the test set estimates performance once those choices are fixed. Every time a decision is based on the test score, that score becomes a little less honest as an estimate of how the system will behave on new input.

### Practical example
A synthetic handbook dataset groups all revisions of the same document before splitting its question rows.

**Added:** A handbook is published in March and revised in June, with most paragraphs unchanged. If you shuffle individual question rows, a June question can land in the test set while its nearly identical March version sits in training. The model then appears to understand the handbook when it has partly memorised it. Assign a document family ID to both versions and split on that ID, so the whole family moves together. The score may drop, and the lower number is the more useful one.

### Real-world use
Use entity-aware or chronological validation for assistants operating on related support histories or evolving document collections.

**Added:** Store the group ID and timestamp beside every example when you collect it, because reconstructing them later is error-prone. Re-run the overlap check in your test suite so a new data import cannot reintroduce leakage unnoticed.

### Interview answers
1. **Why can a random row split leak a document benchmark?**
   Rows can share paragraphs, document revisions or answer text. Split the underlying document family so copied evidence cannot make evaluation trivial.
   **Added:** The result is a score that measures recall of seen text more than performance on new documents.
2. **When should a chronological split replace shuffling?**
   Use chronology when deployment predicts future cases from past evidence. Verify feature timestamps reflect what existed at the decision boundary.
   **Added:** Forecasting demand is a clear case: next month cannot be allowed to inform a prediction made today.
3. **Can fitting a vocabulary on all data contaminate evaluation?**
   Yes: learned preprocessing can incorporate held-out distribution information. Fit transformations on training data and freeze them before final evaluation.
   **Added:** Scaling values and selecting features follow the same rule as building a vocabulary.
4. **How would you audit benchmark duplicates?**
   Normalize exact copies with documented rules, inspect shared IDs and assess near-duplicate families. Preserve a reproducible mapping of exclusions.
   **Added:** Spot-check a sample of removed and retained pairs by hand to confirm the rule behaves as intended.
5. **Write a document-ID overlap detector across three partitions.**
   Compare sets of meaningful group identifiers and return intersections. Include empty partitions and repeated IDs within a partition.
   **Added:** Run it on user IDs or document family IDs, since unique row numbers would hide the overlap you are looking for.
6. **How would you isolate a final evaluation partition in an experiment service?**
   Version datasets and restrict adaptive tuning against final scores. Record configurations and avoid letting repeated test feedback become training information.
   **Added:** Limit who can read the final labels and keep a record of every time the final score is computed.
7. **A system fails on documents uploaded after the benchmark period. Why?**
   Investigate temporal leakage and domain shift. Compare source versions, labels and preprocessing before dismissing newer examples as invalid.
   **Added:** Slice errors by upload date to see whether performance declines gradually or breaks at a particular change.
8. **A duplicate detector misses whitespace variants. What changes?**
   Add documented normalization and, where appropriate, near-duplicate checks. Avoid destroying distinctions that the actual task needs to retain.
   **Added:** Collapsing repeated spaces and normalising Unicode are common starting points, and each rule should have its own test.
9. **How would you discuss unusually high benchmark scores responsibly?**
   State split units, leakage checks and baseline results first. Treat suspiciously high scores as a reason to investigate shortcuts.
   **Added:** Mention one shortcut you actually looked for and what you found, even if the answer was nothing.
10. **What should accompany a portfolio evaluation dataset?**
   Document provenance, permitted use, grouping rules and contamination risks. Publish only authorized or synthetic examples and a reproducible evaluator.
   **Added:** A reader should be able to rebuild the same partitions from your script and a fixed random seed.

## Neurons, perceptrons and MLPs
Unique teaching words: 357 → 714 (needed: 600)

### Concept
A neuron combines a weighted sum, a bias and usually an activation. A perceptron expresses a linear boundary; an MLP composes layers to learn intermediate representations. These numerical functions do not imply human-like understanding or explainability by themselves.

**Added:** For one neuron, the computation is the dot product of inputs and weights, plus a bias, passed through an activation. Training adjusts the weights and bias to reduce a loss. Stacking layers lets later units combine the outputs of earlier ones, which is how a network can represent patterns such as exclusive OR that no single straight boundary separates.

### Practical example
A toy two-feature network computes a dense layer and clips negative pre-activations with ReLU.

**Added:** Take inputs 2 and -1. The first unit has weights 1 and 1 with bias 0, so its pre-activation is 1 and ReLU keeps it as 1. The second has weights -2 and 1 with bias 1, giving -4 - 1 + 1 = -4, which ReLU clips to 0. The output is therefore [1, 0], matching the code. Changing only the second bias to 6 would make that unit output 1, showing how a bias moves the point at which a unit becomes active.

### Real-world use
Benchmark a small MLP on structured numerical features before introducing a transformer into an unrelated prediction task.

**Added:** Compare the MLP with a linear model and a tree-based baseline on the same split. Tabular problems are often solved well by simpler methods, so report training time and held-out error for each before deciding which one to keep.

### Interview answers
1. **What do weights and bias contribute to a neuron?**
   Weights scale input contributions while the bias shifts the threshold. Demonstrate with explicit numbers instead of comparing the unit to a human brain.
   **Added:** With weight 3, input 2 and bias -5, the pre-activation is 1, and you can verify it by hand.
2. **Why do stacked linear layers remain linear or affine?**
   Composition preserves the affine function class. A nonlinear activation between layers changes what relationships the network can represent.
   **Added:** Algebraically, two affine layers combine into a single weight matrix and a single bias vector.
3. **How would you diagnose low training error and high validation error?**
   Inspect split quality, capacity and regularization before interpreting learned features. Compare a simpler baseline under the same preprocessing.
   **Added:** Learning curves for both sets help show whether more data or stronger regularisation is the more promising next step.
4. **How should a batched dense layer validate shapes?**
   Require consistent feature widths and matching output rows and biases. Reject incompatible dimensions instead of silently truncating with zip.
   **Added:** For a batch, also confirm that every row has the same width before any multiplication happens.
5. **Implement a dense layer followed by ReLU using lists.**
   Check dimensions, compute each weighted sum and bias, then zero negative results. Include mismatched inputs and a negative pre-activation case.
   **Added:** Hand-calculate one unit first so that the assertion has an expected value you understand.
6. **Where could an MLP sit inside an LLM product?**
   It may rank structured candidates or score numeric features. Keep its contract, evaluation and version independent from the generation component.
   **Added:** Treat its score as one signal and log it separately so that regressions can be traced to the right component.
7. **Raw currencies and small normalized frequencies enter the same layer. What matters?**
   Inspect feature scales and training-fitted normalization. Poor conditioning can dominate optimization before architectural capacity becomes the limiting factor.
   **Added:** Standardise using the training mean and standard deviation, then apply those same values to validation and live inputs.
8. **A dense layer silently ignores one feature. Which implementation pattern is suspicious?**
   Unchecked zip stops at the shorter sequence. Validate shapes and add an explicit mismatch regression case at the boundary.
   **Added:** In recent Python versions, zip with strict=True raises an error on unequal lengths and is a useful extra guard.
9. **How would you justify an MLP baseline to a research interviewer?**
   Connect the hypothesis class and nonlinearities to the task. Use measured errors to justify complexity rather than assuming hidden units imply understanding.
   **Added:** Exclusive OR is a compact example that shows what the hidden layer adds over a single linear unit.
10. **What must a neural-network demo show beyond a forward pass?**
   Include shape checks, reproducible splits, optimization settings and held-out results. State the failure cases and what evidence would justify another architecture.
   **Added:** Fix the random seed and record the library versions so another person can repeat your run.

## Activation functions and saturation
Unique teaching words: 339 → 695 (needed: 600)

### Concept
Activations introduce nonlinearity into a neural network. Sigmoid, tanh, ReLU and GELU differ in range and gradient behavior. Their effects depend on the architecture, objective and input distribution; naming an activation does not establish a universal accuracy or performance advantage.

**Added:** Sigmoid maps any number into the interval from 0 to 1 and tanh into -1 to 1. ReLU returns zero for negative inputs and the input itself otherwise. GELU is a smooth function that weights each input by the standard normal cumulative probability of that value. Output layers and hidden layers often need different choices, because they serve different purposes.

### Practical example
A stable sigmoid uses different equivalent expressions on positive and negative inputs, avoiding exp overflow.

**Added:** The derivative of sigmoid equals its value times one minus its value. At zero this is 0.25, the largest it can be. At an input of 10 the value is very close to 1, so the derivative falls to roughly 0.000045. A gradient passing through that unit is multiplied by this tiny number. The code also shows a second issue: computing the exponential of a large positive number overflows, so each branch keeps the exponent at zero or below.

### Real-world use
Inspect activation and gradient distributions when training stalls before changing the network width or learning objective.

**Added:** Record the share of zero outputs and the gradient norm for each layer during a short training run. Compare those numbers before and after one controlled change, such as a lower learning rate or different initialisation, so the effect can be attributed.

### Interview answers
1. **Why do hidden layers need nonlinear activations?**
   Without nonlinearity, repeated affine maps collapse into one. Activations expand the function class rather than merely rescaling an output.
   **Added:** A network with no activation between its layers can fit a line or plane but not a curved boundary.
2. **How does sigmoid saturation affect backpropagation?**
   Its derivative becomes small at extreme pre-activations, weakening gradient flow through that path. Assess the full graph instead of blaming a single layer.
   **Added:** Repeated multiplication by small derivatives across layers is one route to vanishing gradients.
3. **Can ReLU everywhere guarantee healthy gradients?**
   No: persistently negative pre-activations can have zero gradient. Initialization, input scales and other graph operations still affect optimization.
   **Added:** Variants such as Leaky ReLU keep a small negative slope, which can help, but still needs testing on your task.
4. **How would you compare two activations experimentally?**
   Control data splits, optimizer and parameter budget. Record convergence and activation distributions alongside held-out quality and hardware measurements.
   **Added:** Repeat each run with several seeds, because a single run can make random variation look like a real difference.
5. **Implement sigmoid without overflow for large negative input.**
   Use an equivalent negative-input branch whose exponential argument is nonpositive. Test zero and extreme values rather than only small inputs.
   **Added:** Comparing against the mathematical limits of 0 and 1 gives clear assertions for the extreme cases.
6. **How should a service version the interpretation of output activations?**
   Keep logit, probability and threshold conventions with the model. Consumers must not apply sigmoid twice or interpret hidden activations as calibrated risk.
   **Added:** Name the output field clearly in the response so that a caller cannot mistake a logit for a probability.
7. **A hidden layer is almost always zero. What evidence is useful?**
   Inspect signs, feature scaling, initialization and gradient norms across batches. Distinguish temporary sparse activations from permanently inactive units.
   **Added:** A unit that is zero for every example in many batches deserves closer attention than one that is zero for only some.
8. **Sigmoid crashes at minus one thousand. What is wrong?**
   The direct expression exponentiates a huge positive value. Use a stable formula and preserve extreme-value tests instead of clipping outputs after failure.
   **Added:** Python raises OverflowError here, which is easy to reproduce in a one-line test.
9. **How would you compare GELU and ReLU in an interview?**
   Explain their behavior and propose a task-specific controlled benchmark. Avoid a universal quality or latency claim unsupported by measurements.
   **Added:** Say which hardware you would measure on, since the relative cost of the two functions depends on the implementation.
10. **How should activation diagnostics appear in a project review?**
   Show distributions, gradient summaries and a controlled intervention. Separate supported root causes from plausible but untested explanations.
   **Added:** Keep the plots and the exact configuration together so a reviewer can check your conclusion.

