import pandas as pd
import joblib
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import accuracy_score, classification_report
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
import xgboost as xgb
import numpy as np
import os

# Path to your cleaned dataset
DATA_PATH = r"D:\Programming\Python\ufc\ml-webapp\ml_service\data\cleaned_dataset.csv"

# Load dataset
print("Loading dataset...")
df = pd.read_csv(DATA_PATH)
print("Dataset loaded, shape:", df.shape)

# Define target (0 = Fighter 2 wins, 1 = Fighter 1 wins)
target = "winner"

# Base features
features = [
    "f1_sig_strike_per", "f1_sig_strike_total",
    "f2_sig_strike_per", "f2_sig_strike_total",
    "f1_td_attempt", "f1_td_succeed",
    "f2_td_attempt", "f2_td_succeed",
    "tdAvg_f1", "tdDef_f1",
    "tdAvg_f2", "tdDef_f2",
    "weight_f1", "weight_f2",
    "f1_age_when_fight", "f2_age_when_fight",
    "win_f1", "lose_f1", "draw_f1", "nc_f1",
    "win_f2", "lose_f2", "draw_f2", "nc_f2"
]

# Build model dataframe and add simplified engineered matchup features
df_model = df.dropna(subset=features + [target]).copy()
df_model["sig_strike_per_diff"] = df_model["f1_sig_strike_per"] - df_model["f2_sig_strike_per"]
df_model["td_success_rate_f1"] = df_model["f1_td_succeed"] / (df_model["f1_td_attempt"] + 1)
df_model["td_success_rate_f2"] = df_model["f2_td_succeed"] / (df_model["f2_td_attempt"] + 1)
df_model["td_success_rate_diff"] = df_model["td_success_rate_f1"] - df_model["td_success_rate_f2"]
df_model["age_diff"] = df_model["f1_age_when_fight"] - df_model["f2_age_when_fight"]
df_model["weight_diff"] = df_model["weight_f1"] - df_model["weight_f2"]

# Additional engineered features (conditionally, if source columns exist)
engineered = [
    "sig_strike_per_diff",
    "td_success_rate_f1", "td_success_rate_f2", "td_success_rate_diff",
    "age_diff", "weight_diff",
]

# reach_diff
if "reach_f1" in df_model.columns and "reach_f2" in df_model.columns:
    df_model["reach_diff"] = df_model["reach_f1"] - df_model["reach_f2"]
    df_model["reach_diff"] = df_model["reach_diff"].fillna(0)
    engineered.append("reach_diff")

# stance_matchup (flag only when both known)
if "stance_f1" in df_model.columns and "stance_f2" in df_model.columns:
    df_model["stance_matchup"] = 0
    mask = df_model["stance_f1"].notna() & df_model["stance_f2"].notna()
    df_model.loc[mask, "stance_matchup"] = (df_model.loc[mask, "stance_f1"] != df_model.loc[mask, "stance_f2"]).astype(int)
    engineered.append("stance_matchup")

# recent win rates last 3
if "wins_last3_f1" in df_model.columns and "wins_last3_f2" in df_model.columns:
    df_model["recent_win_rate_f1"] = (df_model["wins_last3_f1"] / 3.0).fillna(0)
    df_model["recent_win_rate_f2"] = (df_model["wins_last3_f2"] / 3.0).fillna(0)
    df_model["recent_win_rate_diff"] = df_model["recent_win_rate_f1"] - df_model["recent_win_rate_f2"]
    engineered.extend(["recent_win_rate_f1", "recent_win_rate_f2", "recent_win_rate_diff"])

# strike defense diff
if "strikeDef_f1" in df_model.columns and "strikeDef_f2" in df_model.columns:
    df_model["strike_def_diff"] = (df_model["strikeDef_f1"] - df_model["strikeDef_f2"]).fillna(0)
    engineered.append("strike_def_diff")

# takedown defense diff (tdDef already in base)
if "tdDef_f1" in df_model.columns and "tdDef_f2" in df_model.columns:
    df_model["td_def_diff"] = (df_model["tdDef_f1"] - df_model["tdDef_f2"]).fillna(0)
    engineered.append("td_def_diff")

# significant strike absorb diff
if "sigStrikeAbsorb_f1" in df_model.columns and "sigStrikeAbsorb_f2" in df_model.columns:
    df_model["sig_strike_absorb_diff"] = (df_model["sigStrikeAbsorb_f1"] - df_model["sigStrikeAbsorb_f2"]).fillna(0)
    engineered.append("sig_strike_absorb_diff")

# Assemble feature matrix including engineered features that exist
X = df_model[features + engineered]
y = df_model[target].astype(int)

print("Class distribution:")
print(y.value_counts(normalize=True))

positive_total = int((y == 1).sum())
negative_total = int((y == 0).sum())
scale_pos_weight = float(negative_total) / float(positive_total) if positive_total > 0 else 1.0

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

def cv_accuracy(model_ctor):
    scores = []
    for train_idx, val_idx in cv.split(X, y):
        X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]
        model = model_ctor()
        model.fit(X_tr, y_tr)
        preds = model.predict(X_val)
        scores.append(accuracy_score(y_val, preds))
    return float(np.mean(scores)), float(np.std(scores))

# Define model constructors
def make_lr():
    return LogisticRegression(max_iter=1000, class_weight="balanced", n_jobs=-1, solver="lbfgs")

def make_rf():
    return RandomForestClassifier(n_estimators=500, max_depth=None, random_state=42, n_jobs=-1, class_weight=None)

def make_xgb():
    return xgb.XGBClassifier(
        n_estimators=1000,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_lambda=1,
        reg_alpha=0,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
        scale_pos_weight=scale_pos_weight,
    )

models = {
    "LogisticRegression": make_lr,
    "RandomForest": make_rf,
    "XGBoost": make_xgb,
}

cv_results = {}
print("\nCross-validation (5-fold) results:")
for name, ctor in models.items():
    mean_acc, std_acc = cv_accuracy(ctor)
    cv_results[name] = {"cv_mean": mean_acc, "cv_std": std_acc}
    print(f"- {name}: mean={mean_acc:.4f}, std={std_acc:.4f}")

# Final train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

test_results = {}
fitted_models = {}
print("\nTest set evaluation:")
for name, ctor in models.items():
    model = ctor()
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    test_results[name] = acc
    fitted_models[name] = model
    print(f"\n{name} test accuracy: {acc:.4f}")
    print(classification_report(y_test, preds))

# Summary table
print("\nSummary (CV mean ± std | Test acc):")
for name in models.keys():
    print(f"- {name}: {cv_results[name]['cv_mean']:.4f} ± {cv_results[name]['cv_std']:.4f} | {test_results[name]:.4f}")

# Save best by CV mean
best_name = max(cv_results.keys(), key=lambda k: cv_results[k]["cv_mean"])
best_model = fitted_models[best_name]
BEST_PATH = os.path.join(r"D:\Programming\Python\ufc\ml-webapp\ml_service\models", "best_fight_model.pkl")
joblib.dump(best_model, BEST_PATH)
print(f"\nSaved best model ({best_name}) to {BEST_PATH}")

# Save trained model to same project dir
if hasattr(fitted_models.get("XGBoost"), "feature_importances_"):
    importances = fitted_models["XGBoost"].feature_importances_
    feat_names = X.columns.tolist()
    sorted_pairs = sorted(zip(feat_names, importances), key=lambda t: t[1], reverse=True)
    print("\nTop 20 XGBoost feature importances (desc):")
    for name, imp in sorted_pairs[:20]:
        print(f"{name}: {imp:.6f}")
