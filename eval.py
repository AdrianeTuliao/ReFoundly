import pandas as pd
from main import get_smart_response
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def run_lite_evaluation():
    print("🚀 Starting ReFoundly Semantic Evaluation...")

    # FIX: These MUST be indented to stay inside the function
    test_queries = [
        {
            "q": "What is ReFoundly?", 
            "gt": "ReFoundly is a decentralized web-based platform designed for educational institutions to track and recover lost or found items using blockchain technology."
        },
        {
            "q": "How do I report a found item?", 
            "gt": "To report an item, use the \"Report Lost/Found\" feature to upload a photo, select a category, and provide a detailed description and location."
        },
        {
            "q": "What metadata should I include?", 
            "gt": "Users should include metadata such as item type, color, brand, unique identifiers (like stickers), and the specific time and location it was found."
        },
        {
            "q": "Why do I need to upload an image?", 
            "gt": "Images are required to provide visual verification for the owner and to assist the system's matching algorithm in identifying items quickly."
        },
        {
            "q": "How do I prove I own a lost item?", 
            "gt": "Owners must prove ownership by answering security questions set by the finder or providing private details like serial numbers that are not publicly visible."
        },
        {
            "q": "What if someone else tries to claim my item?", 
            "gt": "Unauthorized claims are mitigated by blockchain logging; administrators can review immutable records and private chat logs to resolve disputes."
        },
        {
            "q": "How does this website work?", 
            "gt": "The platform acts as a digital bulletin board where finders post items and losers search for them using keywords, categories, and matching algorithms."
        },
        {
            "q": "Is there a fee to use ReFoundly?", 
            "gt": "ReFoundly is a free service provided to all members of the educational institution."
        },
        {
            "q": "I lost an item, what do I do first?", 
            "gt": "First, use the search bar to check for your item; if missing, use \"Report Lost\" to alert the community and track your recovery."
        },
        {
            "q": "What if I can't find my item on the list?", 
            "gt": "If your item isn't listed, create a \"Lost\" report so the system can monitor new posts and notify you of a potential match."
        },
        {
            "q": "Should I post a picture of found cash?", 
            "gt": "Do not post photos of found cash. Report the find with the location, and require the owner to specify the exact amount to verify ownership."
        }
    ]

    results = []
    for item in test_queries:
        bot_answer = get_smart_response(item['q'])
        
        # Safety check: Ensure bot_answer is a string and not empty
        if not isinstance(bot_answer, str):
            bot_answer = str(bot_answer)
        
        # Calculate mathematical similarity (Simplified Relevancy)
        # 
        vec = TfidfVectorizer().fit_transform([bot_answer, item['gt']])
        score = cosine_similarity(vec[0:1], vec[1:2])[0][0]
        
        results.append({
            "Question": item['q'],
            "Accuracy_Score": round(score, 4)
        })

    df_results = pd.DataFrame(results)
    print("\n--- REFOUNDLY PERFORMANCE REPORT ---")
    print(df_results)
    print(f"\n✅ Overall System Trust Score: {round(df_results['Accuracy_Score'].mean() * 100, 2)}%")

if __name__ == "__main__":
    run_lite_evaluation()