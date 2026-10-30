import { FeatureEncoder } from './features.js';
import { LogisticRegression } from './logisticRegression.js';

const monthOf = (value) => String(value).slice(0, 7);
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function rocAuc(labels, probabilities) {
  const positives = labels.filter((value) => value === 1).length;
  const negatives = labels.length - positives;
  if (!positives || !negatives) return null;
  const sorted = probabilities.map((probability, index) => ({ probability, label: labels[index] }))
    .sort((a, b) => a.probability - b.probability);
  let rankSum = 0;
  let index = 0;
  while (index < sorted.length) {
    let end = index + 1;
    while (end < sorted.length && sorted[end].probability === sorted[index].probability) end += 1;
    const averageRank = ((index + 1) + end) / 2;
    for (let j = index; j < end; j += 1) if (sorted[j].label === 1) rankSum += averageRank;
    index = end;
  }
  return (rankSum - (positives * (positives + 1)) / 2) / (positives * negatives);
}

export function averagePrecision(labels, probabilities) {
  const positives = labels.filter((value) => value === 1).length;
  if (!positives) return null;
  const sorted = probabilities.map((probability, index) => ({ probability, label: labels[index] }))
    .sort((a, b) => b.probability - a.probability);
  let hit = 0;
  let sumPrecision = 0;
  sorted.forEach((item, index) => {
    if (item.label === 1) { hit += 1; sumPrecision += hit / (index + 1); }
  });
  return sumPrecision / positives;
}

function trainPair(trainRows) {
  const encoder = new FeatureEncoder().fit(trainRows);
  const x = encoder.transformMany(trainRows);
  const y = trainRows.map((row) => row.target_rto);
  const model = new LogisticRegression().fit(x, y);
  return { encoder, model };
}

export function trainModels(orders) {
  if (orders.length < 100) throw new Error('At least 100 labelled CSV orders are needed to train a useful demonstration model.');
  const latestMonth = orders.reduce((latest, row) => monthOf(row.order_datetime) > latest ? monthOf(row.order_datetime) : latest, '');
  let trainRows = orders.filter((row) => monthOf(row.order_datetime) < latestMonth);
  let validationRows = orders.filter((row) => monthOf(row.order_datetime) === latestMonth);
  let validationNote = `Chronological holdout: the model sees only months before ${latestMonth}.`;
  if (trainRows.length < 250 || validationRows.length < 50) {
    const split = Math.floor(orders.length * 0.8);
    trainRows = orders.slice(0, split);
    validationRows = orders.slice(split);
    validationNote = 'Fallback chronological 80/20 split because latest-month holdout was too small.';
  }
  const validationBundle = trainPair(trainRows);
  const validationProbabilities = validationBundle.model.predictProbabilities(validationBundle.encoder.transformMany(validationRows));
  const labels = validationRows.map((row) => row.target_rto);
  const brier = mean(validationProbabilities.map((probability, index) => (probability - labels[index]) ** 2));
  const metrics = {
    validation_rto_rate: mean(labels),
    brier_score: brier,
    mean_predicted_risk: mean(validationProbabilities),
    roc_auc: rocAuc(labels, validationProbabilities),
    average_precision: averagePrecision(labels, validationProbabilities)
  };
  const validationScored = validationRows.map((row, index) => ({ ...row, predicted_rto_risk: validationProbabilities[index] }));
  const liveBundle = trainPair(orders);
  return {
    liveEncoder: liveBundle.encoder,
    liveModel: liveBundle.model,
    validationRows: validationScored,
    metrics,
    trainCount: trainRows.length,
    validationCount: validationRows.length,
    validationPeriod: latestMonth,
    validationNote
  };
}

export function predictRisk(bundle, row) {
  return bundle.liveModel.predictProbability(bundle.liveEncoder.transform(row));
}
