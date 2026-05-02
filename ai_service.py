import sys
import json
import logging
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import numpy as np

# Configure logging
logging.basicConfig(filename='ai_service.log', level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

# --- 1. Training Data (Mini-Dataset) ---
# Format: (Text, Category, Priority)
training_data = [
    # Roads & Traffic
    ("huge pothole in road causing traffic", "Roads & Traffic", "High"),
    ("open manhole dangerous for kids", "Roads & Traffic", "High"),
    ("traffic signal broken accident prone", "Roads & Traffic", "High"),
    ("illegal parking blocking gate", "Roads & Traffic", "Medium"),
    ("road broken uneven surface", "Roads & Traffic", "Medium"),
    ("potholes on main road", "Roads & Traffic", "High"),
    ("street signal not working", "Roads & Traffic", "Medium"),
    ("footpath broken", "Roads & Traffic", "Low"),
    ("speed breaker needed near school", "Roads & Traffic", "Medium"),
    ("road construction delay", "Roads & Traffic", "Low"),

    # Electricity
    ("street light not working dark street", "Electricity", "Medium"),
    ("electric wire sparking fire danger", "Electricity", "High"),
    ("transformer blast fire", "Electricity", "High"),
    ("low voltage problem appliances damaging", "Electricity", "Medium"),
    ("bijli nahi aa rahi", "Electricity", "High"),
    ("power cut for 5 hours", "Electricity", "High"),
    ("open electric box on pole", "Electricity", "High"),
    ("sparking in meter", "Electricity", "High"),
    ("street light always on during day", "Electricity", "Low"),
    ("current in pole during rain", "Electricity", "High"),

    # Garbage & Sanitation
    ("garbage not collected for weeks smell", "Garbage & Sanitation", "High"),
    ("dead animal on road bad smell", "Garbage & Sanitation", "High"),
    ("drain blocked overflowing sewage", "Garbage & Sanitation", "High"),
    ("dustbins overflowing on road", "Garbage & Sanitation", "Medium"),
    ("sweeping not done in colony", "Garbage & Sanitation", "Low"),
    ("kachra wala nahi aaya", "Garbage & Sanitation", "Medium"),
    ("clogged sewer line", "Garbage & Sanitation", "High"),
    ("public toilet very dirty", "Garbage & Sanitation", "Medium"),
    ("unauthorized dumping of waste", "Garbage & Sanitation", "Medium"),
    ("mosquito breeding in stagnant water", "Garbage & Sanitation", "High"),

    # Water Supply
    ("water pipe leaking wasting water", "Water Supply", "Medium"),
    ("no water supply in area", "Water Supply", "High"),
    ("dirty water from tap sickness", "Water Supply", "High"),
    ("low water pressure", "Water Supply", "Low"),
    ("pani ki pipeline leak hai", "Water Supply", "Medium"),
    ("tanker needed for water", "Water Supply", "Medium"),
    ("muddy water coming in supply", "Water Supply", "High"),
    ("water meter broken", "Water Supply", "Low"),
    ("illegal water connection", "Water Supply", "Medium")
]

texts, categories, priorities = zip(*training_data)

# --- 2. Train Models ---
# Category Model
model_category = Pipeline([
    ('vect', CountVectorizer()),
    ('clf', MultinomialNB()),
])
model_category.fit(texts, categories)

# Priority Model (Heuristic + ML Hybrid)
# We'll use keyword heuristics for priority as it's safer for MVP
HIGH_PRIORITY_KEYWORDS = ["danger", "accident", "fire", "spark", "blood", "injury", "death", "kill", "explode", "blast", "emergency", "blocked", "sewage", "virus"]

def predict_priority(text):
    text_lower = text.lower()
    for kw in HIGH_PRIORITY_KEYWORDS:
        if kw in text_lower:
            return "High"
    return "Medium" # Default

# --- 3. Prediction Function ---
def predict(text):
    try:
        category = model_category.predict([text])[0]
        # Confidence score (max probability)
        proba = np.max(model_category.predict_proba([text]))
        
        priority = predict_priority(text)
        
        # Override Priority model if ML works better later, currently using robust Keywords
        
        return {
            "category": category,
            "priority": priority,
            "confidence": round(float(proba), 2),
            "sentiment": "Negative" if priority == "High" else "Neutral" # Simple shim
        }
    except Exception as e:
        logging.error(f"Prediction Error: {e}")
        return {"category": "Other", "priority": "Low", "error": str(e)}

# --- 4. Main Execution ---
if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_text = sys.argv[1]
        result = predict(input_text)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No input text provided"}))
