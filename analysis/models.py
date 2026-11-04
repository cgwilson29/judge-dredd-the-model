"""The five models, built exactly to the fixed spec in AGENT_BRIEF.md.

Each function returns a fresh, unfitted model. analysis/evaluate.py fits it on the training rows
only and scores the training and test rows; this module never trains or scores anything itself.
Every preprocessing step (encoding, imputation, scaling) sits inside the model's Pipeline, so it
learns from the training rows only.
"""

from __future__ import annotations

from lightgbm import LGBMClassifier
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from analysis.data import encode


def baseline():
    """Prevalence baseline: gives every patient the training rows' share of positives."""
    return make_pipeline(DummyClassifier(strategy="prior"))


def logreg():
    return make_pipeline(encode(), SimpleImputer(strategy="median"), StandardScaler(),
                         LogisticRegression(max_iter=5000))


def knn():
    return make_pipeline(encode(), SimpleImputer(strategy="median"), StandardScaler(),
                         KNeighborsClassifier(n_neighbors=25))


def rf():
    return make_pipeline(encode(), SimpleImputer(strategy="median"),
                         RandomForestClassifier(n_estimators=300, min_samples_leaf=3, random_state=0, n_jobs=-1))


def lgbm():
    # LightGBM handles missing values itself, so there is no imputer.
    return make_pipeline(encode(), LGBMClassifier(random_state=0, verbose=-1, n_jobs=8))


MODELS = {"baseline": baseline, "logreg": logreg, "knn": knn, "rf": rf, "lgbm": lgbm}
