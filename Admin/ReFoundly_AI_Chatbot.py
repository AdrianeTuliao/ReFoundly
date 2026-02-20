import pandas as pd

try:
    df = pd.read_excel('ReFoundly_CHATBOT.xlsx')
    df.columns = ['Question', 'Answer'] 
    df['Question'] = df['Question'].astype(str).str.lower().str.strip()
except Exception as e:
    print(f"System Error: {e}")

def sanitize_input(user_input):
    blocked = ["<script>", "</script>", "DROP", "SELECT", "DELETE"]
    for b in blocked:
        user_input = user_input.replace(b, "")
    return user_input.strip().lower()

def refoundly_bot():
    print("--- ReFoundly Chatbot: Community Assistant ---")
    
    while True:
        raw_query = input("\nYou: ")
        if raw_query.lower() in ['exit', 'quit', 'bye']:
            break
            
        query = sanitize_input(raw_query)
        
        if not query:
            continue
        
        match = df[df['Question'] == query]
        
        if not match.empty:
            print(f"ReFoundly AI: {match['Answer'].values[0]}")
        else:
            print("ReFoundly AI: I'm sorry, I don't have info on that. Please ask something else.")

if __name__ == "__main__":
    refoundly_bot()