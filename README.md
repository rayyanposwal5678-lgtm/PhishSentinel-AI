# 🛡️ PhishGuard AI — Phishing Email Detector

An AI-powered phishing email detection system built with Python, Flask, and Machine Learning.

## 🚀 Features
- 5 ML Models (Logistic Regression, Random Forest, Naive Bayes, Linear SVM, Gradient Boosting)
- Real-time email scanning
- NLP text preprocessing
- Beautiful dark-themed UI
- 100% accuracy on test dataset

## 📦 Installation
```bash
pip install -r requirements.txt
```

## ▶️ Run
```bash
python train_model.py
python app.py
```

Open: http://localhost:5000

## 🛠️ Tech Stack
- Python, Flask, Scikit-learn, NLTK
- HTML, CSS, JavaScript

## ☁️ Vercel Deployment
This repository is prepared for deployment on Vercel using the Python serverless runtime.

Steps:
1. Make sure `models/` contains the trained `.pkl` files and `training_results.json`.
2. Push your repository to GitHub.
3. Connect the repo to Vercel.
4. Vercel will use `vercel.json` and `api/index.py` to serve the Flask app.

If you want to run locally first:
```bash
python train_model.py
python app.py
```
