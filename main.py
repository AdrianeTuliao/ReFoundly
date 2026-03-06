import os
import re
import random
import datetime
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv 
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# --- 0. CONFIGURATION ---
load_dotenv()
DEBUG_SETTING = os.getenv("FLASK_DEBUG", "False") == "True"
SERVER_PORT = int(os.getenv("PORT", 5000))

app = Flask(__name__)
CORS(app)

# --- 1. SMART PRE-PROCESSOR ---
def smart_clean(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s]', '', text)
    noise = {'the', 'a', 'an', 'is', 'are', 'to', 'for', 'of', 'in', 'at'}
    words = text.split()
    return " ".join([w for w in words if w not in noise])

def sanitize_input(user_input):
    url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
    if re.search(url_pattern, user_input) or "www." in user_input.lower():
        return "LINK_BLOCKED"
    blocked = ["<script>", "javascript:", "eval(", "union select"]
    for word in blocked:
        if word in user_input.lower(): return None 
    return re.sub(r'<.*?>', '', user_input).strip()

# --- 2. KNOWLEDGE BASE ---
try:
    # Ensure columns match your Excel structure
    df = pd.read_excel("knowledge_base.xlsx")
    df.columns = ['Question', 'Answer', 'Ground_Truth'] + list(df.columns[3:])
except Exception as e:
    print(f"⚠️ Knowledge Base Error: {e}")

# --- 3. THE INTELLIGENCE ENGINE ---
def get_smart_response(user_input):
    clean_input = sanitize_input(user_input)
    if not clean_input: return "Security block: Malicious content detected."
    if clean_input == "LINK_BLOCKED": return "For safety, external links are blocked."

    raw_lower = clean_input.lower().strip()
    
    # --- LAYER A: AI VECTOR SEARCH (PRIORITY) ---
    # We check the Knowledge Base first so that questions aren't mistaken for greetings
    try:
        processed_input = smart_clean(clean_input)
        processed_questions = [smart_clean(str(q)) for q in df['Question']]
        all_text = processed_questions + [processed_input]

        vectorizer = TfidfVectorizer(ngram_range=(1, 2)).fit_transform(all_text)
        vectors = vectorizer.toarray()
        
        similarities = cosine_similarity([vectors[-1]], vectors[:-1])
        best_index = similarities.argmax()
        confidence = similarities[0][best_index]

        # If a high-confidence match is found, return the Ground Truth
        if confidence > 0.40: 
            return str(df.iloc[best_index]['Ground_Truth'])
            
    except Exception as e:
        print(f"Search Error: {e}")
        confidence = 0

    # --- LAYER B: INTERACTIVE RESPONSES (GREETINGS & POLITENESS) ---
    
    # 1. Time-based Greetings 
    # Logic: Only trigger if the input is short (likely a greeting) and contains keywords
    if len(raw_lower.split()) < 4 and any(word in raw_lower for word in ["morning", "afternoon", "evening", "hello", "hi", "hey"]):
        hour = datetime.datetime.now().hour
        if "morning" in raw_lower or (5 <= hour < 12):
            greet = "Good morning!"
        elif "afternoon" in raw_lower or (12 <= hour < 18):
            greet = "Good afternoon!"
        else:
            greet = "Good evening!"
        return f"{greet} Welcome to ReFoundly. How can I assist you with your lost or found items today?"

    # 2. Politeness & Acknowledgments
    if any(word in raw_lower for word in ["thanks", "thank you", "thx", "appreciate", "okay", "ok", "k"]):
        return random.choice([
            "You're very welcome! Happy to help.",
            "No problem at all! Let me know if you need anything else.",
            "Glad I could assist! Good luck with your items."
        ])

    # 3. Farewells
    if any(word in raw_lower for word in ["bye", "goodbye", "see ya"]):
        return "Goodbye! Hope you find what you're looking for. Have a great day!"

    # --- LAYER C: SEMI-MATCH OR FALLBACK ---
    if confidence > 0.15: 
        # Suggest the closest match if confidence is medium
        return f"I think you're asking about: {df.iloc[best_index]['Question']}\n\n{df.iloc[best_index]['Ground_Truth']}"
    else:
        return "I'm not quite sure. Could you try using keywords like 'ID card', 'report', or 'blockchain'?"

# --- 4. FLASK API ROUTES ---
@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_msg = data.get("message", "")
    response = get_smart_response(user_msg)
    return jsonify({"response": response})

if __name__ == '__main__':
    print(f"🚀 ReFoundly Interactive Backend active on port {SERVER_PORT}!")
    app.run(port=SERVER_PORT, debug=DEBUG_SETTING)