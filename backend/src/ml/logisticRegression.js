const sigmoid = (z) => {
  if (z >= 0) { const e = Math.exp(-Math.min(z, 35)); return 1 / (1 + e); }
  const e = Math.exp(Math.max(z, -35)); return e / (1 + e);
};

export class LogisticRegression {
  constructor({ learningRate = 0.08, iterations = 1800, l2 = 0.035 } = {}) {
    this.learningRate = learningRate;
    this.iterations = iterations;
    this.l2 = l2;
  }

  fit(x, y) {
    if (!x.length || x.length !== y.length) throw new Error('Training matrix and labels must be non-empty and aligned.');
    const columns = x[0].length;
    this.weights = new Array(columns).fill(0);
    const positiveRate = y.reduce((sum, value) => sum + value, 0) / y.length;
    this.bias = Math.log(Math.max(0.001, positiveRate) / Math.max(0.001, 1 - positiveRate));
    for (let iteration = 0; iteration < this.iterations; iteration += 1) {
      const gradient = new Array(columns).fill(0);
      let biasGradient = 0;
      for (let i = 0; i < x.length; i += 1) {
        let z = this.bias;
        for (let j = 0; j < columns; j += 1) z += this.weights[j] * x[i][j];
        const error = sigmoid(z) - y[i];
        biasGradient += error;
        for (let j = 0; j < columns; j += 1) gradient[j] += error * x[i][j];
      }
      const rate = this.learningRate / Math.sqrt(1 + iteration / 250);
      this.bias -= rate * (biasGradient / x.length);
      for (let j = 0; j < columns; j += 1) {
        const derivative = (gradient[j] / x.length) + (this.l2 * this.weights[j]);
        this.weights[j] -= rate * derivative;
      }
    }
    return this;
  }

  predictProbability(vector) {
    let z = this.bias;
    for (let j = 0; j < vector.length; j += 1) z += this.weights[j] * vector[j];
    return sigmoid(z);
  }

  predictProbabilities(matrix) { return matrix.map((row) => this.predictProbability(row)); }
}
