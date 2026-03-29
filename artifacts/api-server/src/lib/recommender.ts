import type { DatasetProfile } from "./profiler";
import type { BiasIssue } from "./biasDetector";

export interface ProfileRecommendation {
  category: "preprocessing" | "training" | "evaluation";
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  triggeredBy: string;
  column?: string;
  codeSnippet?: string;
}

export function generateProfileRecommendations(
  profile: DatasetProfile,
  biasIssues: BiasIssue[]
): ProfileRecommendation[] {
  const recs: ProfileRecommendation[] = [];

  for (const issue of biasIssues) {
    switch (issue.issueType) {
      case "class_imbalance": {
        const details = issue.details as { dominantValue: string; dominantPercent: number };
        recs.push({
          category: "preprocessing",
          title: `Rebalance "${issue.column}" — ${details.dominantPercent}% dominated by "${details.dominantValue}"`,
          description: `The class distribution in column "${issue.column}" is heavily skewed. Use SMOTE (Synthetic Minority Oversampling) or random undersampling to create a more balanced training set.`,
          priority: issue.severity === "high" ? "critical" : "high",
          triggeredBy: "class_imbalance",
          column: issue.column,
          codeSnippet: `from imblearn.over_sampling import SMOTE\nsmote = SMOTE(random_state=42)\nX_resampled, y_resampled = smote.fit_resample(X, df['${issue.column}'])`,
        });
        recs.push({
          category: "training",
          title: `Apply class weights for "${issue.column}"`,
          description: `When using "${issue.column}" as a target variable, set class_weight='balanced' or compute custom weights inversely proportional to class frequency to prevent the model from ignoring minority classes.`,
          priority: "high",
          triggeredBy: "class_imbalance",
          column: issue.column,
          codeSnippet: `from sklearn.utils.class_weight import compute_class_weight\nweights = compute_class_weight('balanced', classes=np.unique(y), y=y)\nmodel.fit(X, y, class_weight=dict(enumerate(weights)))`,
        });
        break;
      }

      case "skewed_distribution": {
        const details = issue.details as { skewness: number; direction: string };
        recs.push({
          category: "preprocessing",
          title: `Normalize skewed column "${issue.column}" (skewness: ${details.skewness})`,
          description: `Column "${issue.column}" has a ${details.direction}-skewed distribution. Apply log transformation (for right skew) or power transformation to normalize the distribution before training.`,
          priority: issue.severity === "high" ? "high" : "medium",
          triggeredBy: "skewed_distribution",
          column: issue.column,
          codeSnippet: details.direction === "right"
            ? `import numpy as np\ndf['${issue.column}_log'] = np.log1p(df['${issue.column}'])`
            : `from sklearn.preprocessing import PowerTransformer\npt = PowerTransformer(method='yeo-johnson')\ndf['${issue.column}_norm'] = pt.fit_transform(df[['${issue.column}']])`,
        });
        recs.push({
          category: "evaluation",
          title: `Validate predictions across "${issue.column}" distribution`,
          description: `Skewed features can cause models to perform poorly at distribution tails. Evaluate model performance separately for low, mid, and high ranges of "${issue.column}".`,
          priority: "medium",
          triggeredBy: "skewed_distribution",
          column: issue.column,
          codeSnippet: `bins = pd.qcut(df['${issue.column}'], q=3, labels=['low', 'mid', 'high'])\nfor group in ['low', 'mid', 'high']:\n    subset = test_df[bins == group]\n    print(f"{group}: {metric(subset)}")`,
        });
        break;
      }

      case "proxy_bias": {
        const details = issue.details as { category: string };
        recs.push({
          category: "preprocessing",
          title: `Review sensitive feature "${issue.column}" (${details.category})`,
          description: `Column "${issue.column}" appears to contain ${details.category} data. Consider removing it from training features or applying fairness-aware preprocessing. If it must be used, apply adversarial debiasing.`,
          priority: "critical",
          triggeredBy: "proxy_bias",
          column: issue.column,
          codeSnippet: `# Option 1: Drop the sensitive feature\ndf_train = df.drop(columns=['${issue.column}'])\n\n# Option 2: Use it only for post-hoc fairness auditing\nsensitive_attr = df['${issue.column}']\ndf_train = df.drop(columns=['${issue.column}'])`,
        });
        recs.push({
          category: "training",
          title: `Apply fairness constraints for "${issue.column}"`,
          description: `If "${issue.column}" or correlated features are used in training, apply equalized odds or demographic parity constraints to ensure the model doesn't discriminate based on ${details.category}.`,
          priority: "high",
          triggeredBy: "proxy_bias",
          column: issue.column,
          codeSnippet: `from fairlearn.reductions import ExponentiatedGradient, DemographicParity\nconstraint = DemographicParity()\nmitigator = ExponentiatedGradient(estimator, constraint)\nmitigator.fit(X, y, sensitive_features=df['${issue.column}'])`,
        });
        recs.push({
          category: "evaluation",
          title: `Run fairness audit across "${issue.column}" groups`,
          description: `After training, measure disparate impact ratio (target ≥ 0.8) and equalized odds difference (target ≤ 0.1) across ${details.category} groups in "${issue.column}".`,
          priority: "high",
          triggeredBy: "proxy_bias",
          column: issue.column,
          codeSnippet: `from fairlearn.metrics import MetricFrame, selection_rate\nmetric_frame = MetricFrame(\n    metrics=selection_rate,\n    y_true=y_test, y_pred=y_pred,\n    sensitive_features=test_df['${issue.column}']\n)\nprint(metric_frame.by_group)`,
        });
        break;
      }

      case "underrepresented_group": {
        const details = issue.details as { value: string; percent: number };
        recs.push({
          category: "preprocessing",
          title: `Oversample underrepresented "${details.value}" in "${issue.column}" (${details.percent}%)`,
          description: `The value "${details.value}" in column "${issue.column}" represents only ${details.percent}% of the data. The model may underperform for this group. Use targeted oversampling or synthetic data generation.`,
          priority: "medium",
          triggeredBy: "underrepresented_group",
          column: issue.column,
          codeSnippet: `minority_mask = df['${issue.column}'] == '${details.value}'\nminority_samples = df[minority_mask]\noversampled = minority_samples.sample(n=target_count, replace=True, random_state=42)\ndf_balanced = pd.concat([df, oversampled])`,
        });
        break;
      }
    }
  }

  for (const col of profile.columns) {
    if (col.missingPercent > 30) {
      recs.push({
        category: "preprocessing",
        title: `Handle high missing rate in "${col.name}" (${col.missingPercent}%)`,
        description: `Column "${col.name}" has ${col.missingPercent}% missing values. Consider dropping the column if >50% missing, or imputing with ${col.dataType === "numeric" ? "median/KNN" : "mode/most-frequent"} strategy.`,
        priority: col.missingPercent > 50 ? "high" : "medium",
        triggeredBy: "missing_values",
        column: col.name,
        codeSnippet: col.dataType === "numeric"
          ? `from sklearn.impute import KNNImputer\nimputer = KNNImputer(n_neighbors=5)\ndf['${col.name}'] = imputer.fit_transform(df[['${col.name}']])`
          : `df['${col.name}'].fillna(df['${col.name}'].mode()[0], inplace=True)`,
      });
    }
  }

  const highCardCols = profile.columns.filter(c => c.dataType === "categorical" && c.cardinality > 20);
  for (const col of highCardCols) {
    recs.push({
      category: "preprocessing",
      title: `Reduce cardinality of "${col.name}" (${col.cardinality} unique values)`,
      description: `Column "${col.name}" has ${col.cardinality} unique categorical values. High cardinality can cause overfitting with one-hot encoding. Use target encoding, frequency encoding, or group rare categories.`,
      priority: "medium",
      triggeredBy: "high_cardinality",
      column: col.name,
      codeSnippet: `from category_encoders import TargetEncoder\nencoder = TargetEncoder(cols=['${col.name}'])\ndf['${col.name}_encoded'] = encoder.fit_transform(df['${col.name}'], y)`,
    });
  }

  recs.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });

  return recs;
}
