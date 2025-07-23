# BrainCheck
BrainCheck is a web app that detects mental fatigue by analyzing your typing patterns. It uses a machine learning model trained on real keystroke data—no LLMs, no black-box APIs, just real ML and transparency.


## Features
- **Personalized Baseline:** Set your own "alert" typing baseline for more accurate, user-centric fatigue detection.
- **Live, Real-Time Feedback:** See fatigue predictions and visual cues as you type.
- **Session History & Visualizations:** Track your past results and view trends with interactive charts.
- **Explainability:** See which features (dwell, flight, errors, etc.) contributed most to your fatigue score.
- **Opt-in Research Mode:** Donate anonymized typing data to help improve fatigue detection science.
- **Mobile-friendly & Accessible:** Responsive design and accessible UI.

## Demo
![Demo Screenshot](demo.png)

## How It Works
- **Dwell Time:** How long you hold each key
- **Flight Time:** Delay between key presses
- **Error Rate:** Number of backspaces/corrections
- **Typing Speed:** Overall duration

The model predicts if you are "alert" or "fatigued" based on these features.

## Project Structure
```
ml project/
├── backend/
│   ├── app.py           # FastAPI backend (serves model, explainability, research mode)
│   ├── model.pkl        # Trained ML model (RandomForest, etc.)
│   └── research_data.jsonl # (Optional) Collected research data
├── frontend/
│   ├── app/
│   │   ├── page.jsx     # Main React/Next.js app
│   │   └── layout.js
│   ├── index.css
│   ├── package.json
│   └── ...
├── train_model.ipynb    # Model training notebook
├── dataset.csv          # Keystroke dataset
└── README.md            # This file
```

## Setup & Usage
### 1. Train the Model
- Edit and run `train_model.ipynb` to train your own model on `dataset.csv`.
- Save the model as `backend/model.pkl`.

### 2. Start the Backend
```sh
cd backend
uvicorn app:app --reload
```
- FastAPI will run at http://localhost:8000

### 3. Start the Frontend
```sh
cd frontend
npm install
npm run dev
```
- App will run at http://localhost:3000

### 4. Use the App
- Type in the box, set your baseline, and see your fatigue score live!
- Toggle research mode to help science (optional).

## Model Details
- **Algorithm:** RandomForestClassifier (scikit-learn)
- **Features:** Dwell time, flight time, backspace count, total time
- **Explainability:** Feature importances shown in UI

## Contributing
Pull requests welcome! Please open an issue first to discuss major changes.

## License
MIT

## Acknowledgements
- CMU Keystroke Dynamics Dataset
- scikit-learn, FastAPI, React, Recharts
